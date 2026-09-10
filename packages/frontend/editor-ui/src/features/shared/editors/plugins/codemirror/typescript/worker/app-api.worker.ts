import * as Comlink from 'comlink';
import * as tsvfs from '@typescript/vfs';
import ts from 'typescript';
import { ChangeSet, Text } from '@codemirror/state';
import { until } from '@vueuse/core';
import { ref } from 'vue';
import { appPageApiTypes, APP_PAGE_API_FILE_NAME } from '@n8n/api-types';

import { indexedDbCache } from '@/app/plugins/cache';
import type { LanguageServiceWorker } from '../types';
import { APP_COMPILER_OPTIONS } from './constants';
import { removeUnusedLibs } from './env';
import { bufferChangeSets } from './utils';
import { getCompletionsAtPos } from './completions';
import { getDiagnostics } from './linter';
import { getHoverTooltip } from './hoverTooltip';

self.process = { env: {} } as NodeJS.Process;

export interface AppWorkerInitOptions {
	id: string;
	content: string[];
}

export interface AppLanguageServiceWorkerInit {
	init(options: AppWorkerInitOptions): Promise<LanguageServiceWorker>;
}

/**
 * Type-checking worker for an App page's `code` block. A sibling of
 * `typescript.worker.ts`: same virtual file system approach, but the source
 * is a plain ES module (no function-wrapping prefix) checked against
 * `appPageApiTypes` instead of the Code node's node/mode-specific types.
 */
export const appApiWorker: AppLanguageServiceWorkerInit = {
	async init(options) {
		const fileName = `${options.id}.tsx`;
		const busyApplyingChangesToCode = ref(false);

		const cache = await indexedDbCache('typescript-cache', 'fs-map');
		const fsMap = await tsvfs.createDefaultMapFromCDN(
			APP_COMPILER_OPTIONS,
			ts.version,
			true,
			ts,
			undefined,
			undefined,
			cache,
		);
		removeUnusedLibs(fsMap);
		fsMap.set(APP_PAGE_API_FILE_NAME, appPageApiTypes);
		fsMap.set(fileName, Text.of(options.content).toString());

		const system = tsvfs.createSystem(fsMap);
		const env = tsvfs.createVirtualTypeScriptEnvironment(
			system,
			Array.from(fsMap.keys()),
			ts,
			APP_COMPILER_OPTIONS,
		);

		const applyChangesToCode = bufferChangeSets((bufferedChanges) => {
			bufferedChanges.iterChanges((fromA, toA, fromB, _toB, text) => {
				env.updateFile(fileName, text.toString(), { start: fromB, length: toA - fromA });
			});
		});

		const waitForChangesAppliedToCode = async () => {
			await until(busyApplyingChangesToCode).toBe(false, { timeout: 500 });
		};

		return Comlink.proxy<LanguageServiceWorker>({
			updateFile: async (changes) => {
				busyApplyingChangesToCode.value = true;
				void applyChangesToCode(ChangeSet.fromJSON(changes)).then(() => {
					busyApplyingChangesToCode.value = false;
				});
			},
			async getCompletionsAtPos(pos) {
				await waitForChangesAppliedToCode();
				return await getCompletionsAtPos({ pos, fileName, env });
			},
			getDiagnostics() {
				return getDiagnostics({ env, fileName });
			},
			getHoverTooltip(pos) {
				return getHoverTooltip({ pos, fileName, env });
			},
			// The App code worker has no node types or execution mode to refresh.
			async updateMode() {},
			async updateNodeTypes() {},
		});
	},
};

Comlink.expose(appApiWorker);
