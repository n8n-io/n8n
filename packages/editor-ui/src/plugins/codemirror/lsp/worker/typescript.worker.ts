import type { Completion } from '@codemirror/autocomplete';
import * as tsvfs from '@typescript/vfs';
import * as Comlink from 'comlink';
import ts, { type DiagnosticWithLocation } from 'typescript';
import type { LanguageServiceWorker } from '../types';
import { indexedDbCache } from './cache';
import {
	FILE_NAME,
	cmPosToTs,
	convertTSDiagnosticToCM,
	generateExtensionTypes,
	isDiagnosticWithLocation,
	schemaToTypescriptTypes,
	wrapInFunction,
} from './utils';

// eslint-disable-next-line import/extensions
import globalTypes from './type-declarations/globals.d.ts?raw';
// eslint-disable-next-line import/extensions
import { pascalCase } from 'change-case';
import type { Schema } from '../../../../Interface';
import luxonTypes from './type-declarations/luxon.d.ts?raw';
import n8nTypes from './type-declarations/n8n.d.ts?raw';

self.process = { env: {} } as NodeJS.Process;

const TS_COMPLETE_BLOCKLIST: ts.ScriptElementKind[] = [ts.ScriptElementKind.warning];

const worker = (): LanguageServiceWorker => {
	let env: tsvfs.VirtualTypeScriptEnvironment;
	let nodeJsonFetcher: (nodeName: string) => Promise<Schema | undefined> = async () => undefined;

	function updateFile(fileName: string, content: string) {
		const exists = env.getSourceFile(fileName);
		if (exists) {
			env.updateFile(fileName, wrapInFunction(content));
		} else {
			env.createFile(fileName, wrapInFunction(content));
		}
	}

	async function loadTypesIfNeeded(pos: number) {
		function findNode(node: ts.Node, check: (node: ts.Node) => boolean): ts.Node | undefined {
			if (check(node)) {
				return node;
			}

			return ts.forEachChild(node, (n) => findNode(n, check));
		}

		const file = env.getSourceFile(FILE_NAME);
		// If we are completing a N8nJson type -> fetch types first
		// $('Node A').item.json.
		if (file) {
			const node = findNode(
				file,
				(n) =>
					n.getStart() <= pos - 1 && n.getEnd() >= pos - 1 && n.kind === ts.SyntaxKind.Identifier,
			);

			if (!node) return;

			const callExpression = findNode(
				node.parent,
				(n) =>
					n.kind === ts.SyntaxKind.CallExpression &&
					(n as ts.CallExpression).expression.getText() === '$',
			);

			if (!callExpression) return;

			const nodeName = ((callExpression as ts.CallExpression).arguments.at(0) as ts.StringLiteral)
				.text;

			const schema = await nodeJsonFetcher(nodeName);

			if (schema) {
				const typeName = pascalCase(nodeName);
				console.log(schema);
				const type = schemaToTypescriptTypes(schema, typeName);
				updateFile(
					'n8n-dynamic.d.ts',
					`export {}
	declare global {
	${type}
	const myVar: ${typeName};
	}`,
				);
				console.log(`export {}
	declare global {
	${type}
	const myVar: ${typeName};
	}`);
			}
		}
	}

	return {
		async init(
			content: string,
			nodeJsonFetcherArg: (nodeName: string) => Promise<Schema | undefined>,
		) {
			nodeJsonFetcher = nodeJsonFetcherArg;

			const compilerOptions: ts.CompilerOptions = {
				allowJs: true,
				checkJs: true,
				target: ts.ScriptTarget.ESNext,
				noLib: true,
				module: ts.ModuleKind.ESNext,
				strict: true,
				importHelpers: false,
				skipDefaultLibCheck: true,
				noEmit: true,
			};

			const fsMap = await tsvfs.createDefaultMapFromCDN(
				compilerOptions,
				ts.version,
				true,
				ts,
				undefined,
				undefined,
				await indexedDbCache('typescript-cache', 'fs-map'),
			);

			fsMap.set('globals.d.ts', globalTypes);
			fsMap.set('n8n.d.ts', n8nTypes);
			fsMap.set('luxon.d.ts', luxonTypes);
			fsMap.set('n8n-extensions.d.ts', await generateExtensionTypes());
			fsMap.set(FILE_NAME, wrapInFunction(content));

			const system = tsvfs.createSystem(fsMap);
			env = tsvfs.createVirtualTypeScriptEnvironment(
				system,
				Array.from(fsMap.keys()),
				ts,
				compilerOptions,
			);
		},
		updateFile: (content) => updateFile(FILE_NAME, content),
		async getCompletionsAtPos(pos) {
			const tsPos = cmPosToTs(pos);

			await loadTypesIfNeeded(tsPos);

			const completionInfo = env.languageService.getCompletionsAtPosition(FILE_NAME, tsPos, {}, {});

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
			const exists = env.getSourceFile(FILE_NAME);
			if (!exists) return [];

			const tsDiagnostics = [
				...env.languageService.getSemanticDiagnostics(FILE_NAME),
				...env.languageService.getSyntacticDiagnostics(FILE_NAME),
			];

			const diagnostics = tsDiagnostics.filter((diagnostic): diagnostic is DiagnosticWithLocation =>
				isDiagnosticWithLocation(diagnostic),
			);

			return diagnostics.map((d) => convertTSDiagnosticToCM(d));
		},
		getHoverTooltip(pos) {
			const quickInfo = env.languageService.getQuickInfoAtPosition(FILE_NAME, cmPosToTs(pos));
			if (!quickInfo) return null;

			const start = quickInfo.textSpan.start;

			const typeDef =
				env.languageService.getTypeDefinitionAtPosition(FILE_NAME, cmPosToTs(pos)) ??
				env.languageService.getDefinitionAtPosition(FILE_NAME, cmPosToTs(pos));

			return {
				start,
				end: start + quickInfo.textSpan.length,
				typeDef,
				quickInfo,
			};
		},
	};
};

Comlink.expose(worker());
