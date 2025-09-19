import * as Comlink from 'comlink';
import type { LanguageServiceWorker, LanguageServiceWorkerInit } from '../types';
import { indexedDbCache } from '../../../cache';
import { bufferChangeSets, fnPrefix } from './utils';

import type { CodeExecutionMode } from 'n8n-workflow';

import { pascalCase } from 'change-case';
import { computed, reactive, ref, watch } from 'vue';
import { getCompletionsAtPos } from './completions';
import { LUXON_VERSION, TYPESCRIPT_FILES } from './constants';
import {
	getDynamicInputNodeTypes,
	getDynamicNodeTypes,
	getDynamicVariableTypes,
	schemaToTypescriptTypes,
} from './dynamicTypes';
import { setupTypescriptEnv } from './env';
import { getHoverTooltip } from './hoverTooltip';
import { getDiagnostics } from './linter';
import { getUsedNodeNames } from './typescriptAst';

import runOnceForAllItemsTypes from './type-declarations/n8n-once-for-all-items.d.ts?raw';
import runOnceForEachItemTypes from './type-declarations/n8n-once-for-each-item.d.ts?raw';
import { loadTypes } from './npmTypesLoader';
import { ChangeSet, Text } from '@codemirror/state';
import { until } from '@vueuse/core';

self.process = { env: {} } as NodeJS.Process;

export const worker: LanguageServiceWorkerInit = {
	async init(options, nodeDataFetcher) {
		const loadedNodeTypesMap: Map<string, { type: string; typeName: string }> = reactive(new Map());

		const inputNodeNames = options.inputNodeNames;
		const allNodeNames = options.allNodeNames;
		const codeFileName = `${options.id}.js`;
		const mode = ref<CodeExecutionMode>(options.mode);
		const busyApplyingChangesToCode = ref(false);

		const cache = await indexedDbCache('typescript-cache', 'fs-map');
		const env = await setupTypescriptEnv({
			cache,
			mode: mode.value,
			code: { content: Text.of(options.content).toString(), fileName: codeFileName },
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

			const typeName = pascalCase(nodeName);
			const jsonType = data?.json
				? schemaToTypescriptTypes(data.json, `${typeName}Json`)
				: `type ${typeName}Json = N8nJson`;
			const paramsType = data?.params
				? schemaToTypescriptTypes(data.params, `${typeName}Params`)
				: `type ${typeName}Params = {}`;

			// Using || on purpose to handle empty string
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			const binaryType = `type ${typeName}BinaryKeys = ${data?.binary.map((key) => `'${key}'`).join(' | ') || 'string'}`;
			const contextType = `type ${typeName}Context = {}`;
			const type = [jsonType, binaryType, paramsType, contextType].join('\n');
			loadedNodeTypesMap.set(nodeName, { type, typeName });
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

		async function loadLuxonTypes() {
			if (cache.getItem('/node_modules/@types/luxon/package.json')) {
				const fileMap = await cache.getAllWithPrefix('/node_modules/@types/luxon');

				for (const [path, content] of Object.entries(fileMap)) {
					updateFile(path, content);
				}
			} else {
				await loadTypes('luxon', LUXON_VERSION, (path, types) => {
					cache.setItem(path, types);
					updateFile(path, types);
				});
			}
		}

		async function setVariableTypes() {
			updateFile(
				TYPESCRIPT_FILES.DYNAMIC_VARIABLES_TYPES,
				await getDynamicVariableTypes(options.variables),
			);
		}

		function updateFile(fileName: string, content: string) {
			const exists = env.getSourceFile(fileName);
			if (exists) {
				env.updateFile(fileName, content);
			} else {
				env.createFile(fileName, content);
			}
		}

		const loadInputNodes = options.inputNodeNames.map(
			async (nodeName) => await loadNodeTypes(nodeName),
		);
		await Promise.all(
			loadInputNodes.concat(loadTypesIfNeeded(), loadLuxonTypes(), setVariableTypes()),
		);

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

		watch(prefix, (newPrefix, oldPrefix) => {
			env.updateFile(codeFileName, newPrefix, { start: 0, length: oldPrefix.length });
		});

		const applyChangesToCode = bufferChangeSets((bufferedChanges) => {
			bufferedChanges.iterChanges((start, end, fromNew, _toNew, text) => {
				const length = end - start;

				env.updateFile(codeFileName, text.toString(), {
					start: editorPositionToTypescript(fromNew),
					length,
				});
			});

			void loadTypesIfNeeded();
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
