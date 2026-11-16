import { existsSync, readFileSync, statSync } from 'node:fs';

import type { NodeTypes } from '@/node-types';

import type { WorkflowLang } from './workflow-lang';

export type NodeSources = NonNullable<
	NonNullable<Parameters<WorkflowLang['convertWorkflow']>[1]>['nodeSources']
>;
export type PublicCredential = ReturnType<WorkflowLang['publicCredential']>;

/** The largest node file that the node compiler reads. */
const MAX_FILE_BYTES = 4 * 1024 * 1024;

/** The file of each node class that was looked up, so that the module cache is searched once. */
const fileOfClass = new Map<unknown, string | undefined>();

/**
 * The JavaScript file that defines a node class. n8n loads node packages
 * with `require`, so the module cache holds the file of each loaded class,
 * also of a class of a community or custom node package.
 */
function fileOf(nodeClass: unknown): string | undefined {
	if (fileOfClass.has(nodeClass)) return fileOfClass.get(nodeClass);
	let found: string | undefined;
	for (const loaded of Object.values(require.cache)) {
		const exported: unknown = loaded?.exports;
		if (typeof exported !== 'object' || exported === null) continue;
		if (Object.values(exported).includes(nodeClass)) {
			found = loaded?.filename;
			break;
		}
	}
	fileOfClass.set(nodeClass, found);
	return found;
}

/**
 * Where the node compiler finds the code and the description of a node type,
 * and the public part of a credential (`ConvertOptions.nodeSources`).
 */
export function nodeSourcesOf(
	lang: WorkflowLang,
	nodeTypes: NodeTypes,
	credentials: Map<string, PublicCredential>,
): NodeSources {
	const nodeOf = (type: string, version: number) => {
		try {
			return nodeTypes.getByNameAndVersion(type, version);
		} catch {
			return undefined;
		}
	};
	return {
		entry: (type, version) => {
			const node = nodeOf(type, version);
			return node ? fileOf(node.constructor) : undefined;
		},
		readFile: (path) => {
			if (!existsSync(path)) return undefined;
			const stat = statSync(path);
			if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return undefined;
			return readFileSync(path, 'utf8');
		},
		description: (type, version) => lang.nodeDescriptionOf(nodeOf(type, version)?.description),
		publicCredential: (type, id) => credentials.get(`${type}:${id ?? ''}`),
	};
}
