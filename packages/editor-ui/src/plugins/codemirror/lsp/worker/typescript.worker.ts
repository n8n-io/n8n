import type { Completion } from '@codemirror/autocomplete';
import * as tsvfs from '@typescript/vfs';
import * as Comlink from 'comlink';
import ts, { type DiagnosticWithLocation } from 'typescript';
import type { LanguageServiceWorker, NodeDataFetcher } from '../types';
import { indexedDbCache } from './cache';
import {
	cmPosToTs,
	convertTSDiagnosticToCM,
	fnPrefix,
	isDiagnosticWithLocation,
	returnTypeForMode,
	schemaToTypescriptTypes,
	tsPosToCm,
	wrapInFunction,
} from './utils';

import { pascalCase } from 'change-case';
import type { CodeExecutionMode } from 'n8n-workflow';
import luxonTypes from './type-declarations/luxon.d.ts?raw';
import runOnceForAllItemsTypes from './type-declarations/n8n-once-for-all-items.d.ts?raw';
import runOnceForEachItemTypes from './type-declarations/n8n-once-for-each-item.d.ts?raw';
import n8nTypes from './type-declarations/n8n.d.ts?raw';
import { loadTypes } from './typesLoader';

self.process = { env: {} } as NodeJS.Process;

const TS_COMPLETE_BLOCKLIST: ts.ScriptElementKind[] = [ts.ScriptElementKind.warning];

const worker = (): LanguageServiceWorker => {
	let env: tsvfs.VirtualTypeScriptEnvironment;
	let nodeDataFetcher: NodeDataFetcher = async () => undefined;
	const loadedNodeTypesMap: Record<string, { type: string; typeName: string }> = {};
	let inputNodeNames: string[];
	let allNodeNames: string[];
	let mode: CodeExecutionMode;
	let fileName: string;

	function updateFile(fileName: string, content: string) {
		const exists = env.getSourceFile(fileName);
		if (exists) {
			env.updateFile(fileName, content);
		} else {
			env.createFile(fileName, content);
		}
	}

	async function loadNodeTypes(nodeName: string) {
		const data = await nodeDataFetcher(nodeName);

		if (data?.json) {
			const schema = data.json;
			const typeName = pascalCase(nodeName);
			const type = schemaToTypescriptTypes(schema, typeName);
			loadedNodeTypesMap[nodeName] = { type, typeName };
			updateFile(
				'n8n-dynamic.d.ts',
				`export {};

declare global {
	type NodeName = ${allNodeNames.map((name) => `'${name}'`).join(' | ')};

    ${Object.values(loadedNodeTypesMap)
			.map(({ type }) => type)
			.join(';\n')}

	interface NodeDataMap {
	  ${Object.entries(loadedNodeTypesMap)
			.map(([nodeName, { typeName }]) => `'${nodeName}': NodeData<{}, ${typeName}, {}, {}>`)
			.join(';\n')}
	}
}`,
			);
		}
	}

	async function setInputNodeTypes(nodeName: string, mode: CodeExecutionMode) {
		const typeName = pascalCase(nodeName);
		updateFile(
			'n8n-dynamic-input.d.ts',
			`export {};

declare global {
    type N8nInputItem = N8nItem<${typeName}, {}>;

	interface N8nInput {
	${
		mode === 'runOnceForAllItems'
			? `all(branchIndex?: number, runIndex?: number): Array<N8nInputItem>;
first(branchIndex?: number, runIndex?: number): N8nInputItem;
last(branchIndex?: number, runIndex?: number): N8nInputItem;
itemMatching(itemIndex: number): N8nInputItem;`
			: 'item: N8nInputItem;'
	}
	}
}`,
		);
	}

	async function loadTypesIfNeeded() {
		function findNodes(node: ts.Node, check: (node: ts.Node) => boolean): ts.Node[] {
			const result: ts.Node[] = [];

			// If the current node matches the condition, add it to the result
			if (check(node)) {
				result.push(node);
			}

			// Recursively check all child nodes
			node.forEachChild((child) => {
				result.push(...findNodes(child, check));
			});

			return result;
		}

		const file = env.getSourceFile(fileName);
		// If we are completing a N8nJson type -> fetch types first
		// $('Node A').item.json.
		if (file) {
			const callExpressions = findNodes(
				file,
				(n) =>
					n.kind === ts.SyntaxKind.CallExpression &&
					(n as ts.CallExpression).expression.getText() === '$',
			);

			if (callExpressions.length === 0) return;

			const nodeNames = (callExpressions as ts.CallExpression[]).map(
				(e) => (e.arguments.at(0) as ts.StringLiteral)?.text,
			);

			if (nodeNames.length === 0) return;

			for (const nodeName of nodeNames) {
				if (!loadedNodeTypesMap[nodeName]) {
					await loadNodeTypes(nodeName);
				}
			}
		}
	}

	return {
		async init(options, nodeDataFetcherArg) {
			nodeDataFetcher = nodeDataFetcherArg;
			inputNodeNames = options.inputNodeNames;
			allNodeNames = options.allNodeNames;
			mode = options.mode;
			fileName = `${options.id}.js`;

			const compilerOptions: ts.CompilerOptions = {
				allowJs: true,
				checkJs: true,
				target: ts.ScriptTarget.ESNext,
				lib: ['es2023'],
				module: ts.ModuleKind.ESNext,
				strict: true,
				noUnusedLocals: true,
				noUnusedParameters: true,
				importHelpers: false,
				skipDefaultLibCheck: true,
				noEmit: true,
			};

			const cache = await indexedDbCache('typescript-cache', 'fs-map');
			const fsMap = await tsvfs.createDefaultMapFromCDN(
				compilerOptions,
				ts.version,
				true,
				ts,
				undefined,
				undefined,
				cache,
			);

			for (const [name] of fsMap.entries()) {
				if (
					name === 'lib.d.ts' ||
					name.startsWith('/lib.dom') ||
					name.startsWith('/lib.webworker') ||
					name.startsWith('/lib.scripthost') ||
					name.endsWith('.full.d.ts')
				) {
					fsMap.delete(name);
				}
			}

			fsMap.set('n8n.d.ts', n8nTypes);
			fsMap.set('luxon.d.ts', luxonTypes);
			fsMap.set('n8n-dynamic.d.ts', 'export {}');
			fsMap.set(
				'n8n-dynamic-input.d.ts',
				`export {};
declare global {
  interface N8nInput {
	${
		mode === 'runOnceForAllItems'
			? `all(branchIndex?: number, runIndex?: number): Array<N8nItem>;
	first(branchIndex?: number, runIndex?: number): N8nItem;
	last(branchIndex?: number, runIndex?: number): N8nItem;
	itemMatching(itemIndex: number): N8nItem;`
			: 'item: N8nItem;'
	}
  }
}`,
			);
			fsMap.set(fileName, wrapInFunction(options.content, mode));

			fsMap.set(
				'n8n-mode-specific.d.ts',
				mode === 'runOnceForAllItems' ? runOnceForAllItemsTypes : runOnceForEachItemTypes,
			);

			const system = tsvfs.createSystem(fsMap);
			env = tsvfs.createVirtualTypeScriptEnvironment(
				system,
				Array.from(fsMap.keys()),
				ts,
				compilerOptions,
			);

			if (options.variables) {
				env.createFile(
					'n8n-variables.d.ts',
					`export {}
declare global {
  interface N8nVars {
    ${options.variables.map((key) => `${key}: string;`).join('\n')}
  }
}`,
				);
			}

			if (cache.getItem('/node_modules/@types/luxon/package.json')) {
				const fileMap = await cache.getAllWithPrefix('/node_modules/@types/luxon');

				for (const [path, content] of Object.entries(fileMap)) {
					env.createFile(path, content);
				}
			} else {
				await loadTypes('luxon', '3.2.0', (path, types) => {
					cache.setItem(path, types);
					env.createFile(path, types);
				});
			}

			await loadTypesIfNeeded();
			await Promise.all(
				options.inputNodeNames.map(async (nodeName) => await loadNodeTypes(nodeName)),
			);
			await Promise.all(
				inputNodeNames.map(async (nodeName) => await setInputNodeTypes(nodeName, mode)),
			);
		},
		updateFile: async (content) => {
			updateFile(fileName, wrapInFunction(content, mode));
			await loadTypesIfNeeded();
		},
		async getCompletionsAtPos(pos, word) {
			const tsPos = cmPosToTs(pos, fnPrefix(returnTypeForMode(mode)));

			const completionInfo = env.languageService.getCompletionsAtPosition(fileName, tsPos, {}, {});

			console.log(completionInfo);
			if (!completionInfo) return null;

			const options = completionInfo.entries
				.filter(
					(entry) =>
						!TS_COMPLETE_BLOCKLIST.includes(entry.kind) &&
						(entry.sortText < '15' || completionInfo.optionalReplacementSpan?.length),
				)
				.map((entry): Completion => {
					const boost = -Number(entry.sortText) || 0;
					return {
						label: entry.name,
						boost,
					};
				});

			return {
				from: pos,
				options,
			};
		},
		getDiagnostics() {
			const exists = env.getSourceFile(fileName);
			if (!exists) return [];

			const tsDiagnostics = [
				...env.languageService.getSemanticDiagnostics(fileName),
				...env.languageService.getSyntacticDiagnostics(fileName),
			];

			const diagnostics = tsDiagnostics.filter((diagnostic): diagnostic is DiagnosticWithLocation =>
				isDiagnosticWithLocation(diagnostic),
			);

			return diagnostics.map((d) => convertTSDiagnosticToCM(d, fnPrefix(returnTypeForMode(mode))));
		},
		getHoverTooltip(pos) {
			const tsPos = cmPosToTs(pos, fnPrefix(returnTypeForMode(mode)));
			const quickInfo = env.languageService.getQuickInfoAtPosition(fileName, tsPos);

			if (!quickInfo) return null;

			const start = tsPosToCm(quickInfo.textSpan.start, fnPrefix(returnTypeForMode(mode)));

			const typeDef =
				env.languageService.getTypeDefinitionAtPosition(fileName, tsPos) ??
				env.languageService.getDefinitionAtPosition(fileName, tsPos);

			console.log(quickInfo, typeDef);

			return {
				start,
				end: start + quickInfo.textSpan.length,
				typeDef,
				quickInfo,
			};
		},
		async updateMode(newMode) {
			mode = newMode;
			updateFile(
				'n8n-mode-specific.d.ts',
				mode === 'runOnceForAllItems' ? runOnceForAllItemsTypes : runOnceForEachItemTypes,
			);
			await Promise.all(
				inputNodeNames.map(async (nodeName) => await setInputNodeTypes(nodeName, mode)),
			);
		},
		async updateNodeTypes() {
			const nodeNames = Object.keys(loadedNodeTypesMap);

			await Promise.all(nodeNames.map(async (nodeName) => await loadNodeTypes(nodeName)));
			await Promise.all(
				inputNodeNames.map(async (nodeName) => await setInputNodeTypes(nodeName, mode)),
			);
		},
	};
};

Comlink.expose(worker());
