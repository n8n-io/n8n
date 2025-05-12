import * as tsvfs from '@typescript/vfs';
import { COMPILER_OPTIONS, TYPESCRIPT_FILES } from './constants';
import ts from 'typescript';
import type { IndexedDbCache } from './cache';

import globalTypes from './type-declarations/globals.d.ts?raw';
import n8nTypes from './type-declarations/n8n.d.ts?raw';

import type { CodeExecutionMode } from 'n8n-workflow';
import { wrapInFunction } from './utils';

type EnvOptions = {
	code: {
		content: string;
		fileName: string;
	};
	mode: CodeExecutionMode;
	cache: IndexedDbCache;
};

export function removeUnusedLibs(fsMap: Map<string, string>) {
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
}

export async function setupTypescriptEnv({ cache, code, mode }: EnvOptions) {
	const fsMap = await tsvfs.createDefaultMapFromCDN(
		COMPILER_OPTIONS,
		ts.version,
		true,
		ts,
		undefined,
		undefined,
		cache,
	);

	removeUnusedLibs(fsMap);

	fsMap.set(TYPESCRIPT_FILES.N8N_TYPES, n8nTypes);
	fsMap.set(TYPESCRIPT_FILES.GLOBAL_TYPES, globalTypes);

	fsMap.set(code.fileName, wrapInFunction(code.content, mode));

	const system = tsvfs.createSystem(fsMap);
	return tsvfs.createVirtualTypeScriptEnvironment(
		system,
		Array.from(fsMap.keys()),
		ts,
		COMPILER_OPTIONS,
	);
}
