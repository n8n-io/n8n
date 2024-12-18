import * as Comlink from 'comlink';
import type { LanguageServiceWorker, LanguageServiceWorkerInit } from '../types';
import { indexedDbCache } from './cache';
import { fnPrefix, wrapInFunction } from './utils';

import type { CodeExecutionMode } from 'n8n-workflow';

import { pascalCase } from 'change-case';
import { computed, reactive, ref, watch } from 'vue';
import { getCompletionsAtPos } from './completions';
import { TYPESCRIPT_FILES } from './constants';
import {
	getDynamicInputNodeTypes,
	getDynamicNodeTypes,
	schemaToTypescriptTypes,
} from './dynamicTypes';
import { setupTypescriptEnv } from './env';
import { getHoverTooltip } from './hoverTooltip';
import { getDiagnostics } from './linter';
import { getUsedNodeNames } from './typescriptAst';

import runOnceForAllItemsTypes from './type-declarations/n8n-once-for-all-items.d.ts?raw';
import runOnceForEachItemTypes from './type-declarations/n8n-once-for-each-item.d.ts?raw';

self.process = { env: {} } as NodeJS.Process;

const worker: LanguageServiceWorkerInit = {
	async init(options, nodeDataFetcher) {
		const loadedNodeTypesMap: Map<string, { type: string; typeName: string }> = reactive(new Map());

		const inputNodeNames = options.inputNodeNames;
		const allNodeNames = options.allNodeNames;
		const codeFileName = `${options.id}.js`;
		const mode = ref<CodeExecutionMode>(options.mode);

		const cache = await indexedDbCache('typescript-cache', 'fs-map');
		const env = await setupTypescriptEnv({
			cache,
			mode: mode.value,
			code: { content: options.content, fileName: codeFileName },
		});

		const prefix = computed(() => fnPrefix(mode.value));

		function editorPositionToTypescript(pos: number) {
			return pos + prefix.value.length;
		}

		function typescriptPositionToEditor(pos: number) {
			return pos - prefix.value.length;
		}

		async function loadNodeTypes(nodeName: string) {
			const data = await nodeDataFetcher(nodeName);

			if (data?.json) {
				const schema = data.json;
				const typeName = pascalCase(nodeName);
				const type = schemaToTypescriptTypes(schema, typeName);
				loadedNodeTypesMap.set(nodeName, { type, typeName });
			}
		}

		async function loadTypesIfNeeded() {
			const file = env.getSourceFile(codeFileName);

			if (!file) return;

			const nodeNames = await getUsedNodeNames(file);

			for (const nodeName of nodeNames) {
				if (!loadedNodeTypesMap.has(nodeName)) {
					await loadNodeTypes(nodeName);
				}
			}
		}

		await loadTypesIfNeeded();
		await Promise.all(
			options.inputNodeNames.map(async (nodeName) => await loadNodeTypes(nodeName)),
		);

		function updateFile(fileName: string, content: string) {
			const exists = env.getSourceFile(fileName);
			if (exists) {
				env.updateFile(fileName, content);
			} else {
				env.createFile(fileName, content);
			}
		}

		watch(
			loadedNodeTypesMap,
			async (loadedNodes) => {
				updateFile(
					TYPESCRIPT_FILES.DYNAMIC_INPUT_TYPES,
					await getDynamicInputNodeTypes(inputNodeNames),
				);
				updateFile(
					TYPESCRIPT_FILES.DYNAMIC_TYPES,
					await getDynamicNodeTypes({ nodeNames: allNodeNames, loadedNodes }),
				);
			},
			{ immediate: true },
		);

		watch(
			mode,
			(newMode) => {
				updateFile(
					TYPESCRIPT_FILES.MODE_TYPES,
					newMode === 'runOnceForAllItems' ? runOnceForAllItemsTypes : runOnceForEachItemTypes,
				);
			},
			{ immediate: true },
		);

		return Comlink.proxy<LanguageServiceWorker>({
			updateFile: async (content) => {
				updateFile(codeFileName, wrapInFunction(content, mode.value));
				await loadTypesIfNeeded();
			},
			async getCompletionsAtPos(pos) {
				return await getCompletionsAtPos({
					pos: editorPositionToTypescript(pos),
					fileName: codeFileName,
					env,
				});
			},
			getDiagnostics() {
				return getDiagnostics({ env, fileName: codeFileName }).map((diagnostic) => ({
					...diagnostic,
					from: typescriptPositionToEditor(diagnostic.from),
					to: typescriptPositionToEditor(diagnostic.to),
				}));
			},
			getHoverTooltip(pos) {
				const tooltip = getHoverTooltip({
					pos: editorPositionToTypescript(pos),
					fileName: codeFileName,
					env,
				});

				if (!tooltip) return null;

				tooltip.start = typescriptPositionToEditor(tooltip.start);
				tooltip.end = typescriptPositionToEditor(tooltip.end);

				return tooltip;
			},
			async updateMode(newMode) {
				mode.value = newMode;
			},
			async updateNodeTypes() {
				const loadedNodeNames = Array.from(loadedNodeTypesMap.keys());
				await Promise.all(loadedNodeNames.map(async (nodeName) => await loadNodeTypes(nodeName)));
			},
		});
	},
};

Comlink.expose(worker);
