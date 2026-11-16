import { existsSync, readFileSync, statSync } from 'node:fs';

import type { CredentialTypes } from '@/credential-types';
import type { NodeTypes } from '@/node-types';

import type { WorkflowLang } from './workflow-lang';

export type NodeSources = NonNullable<
	NonNullable<Parameters<WorkflowLang['convertWorkflow']>[1]>['nodeSources']
>;
export type PublicCredential = ReturnType<WorkflowLang['publicCredential']>;

const MAX_FILE_BYTES = 4 * 1024 * 1024;

const fileOfClass = new Map<unknown, string | undefined>();

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

export function nodeSourcesOf(
	lang: WorkflowLang,
	nodeTypes: NodeTypes,
	credentials: Map<string, PublicCredential>,
	credentialTypes: CredentialTypes,
	hostNodes: ReadonlySet<string> = new Set(),
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
		evaluate: lang.evaluateInSandbox,
		// A node whose credential gives its conditions values that are not checked against v1.
		runsInHost: (nodeName) => hostNodes.has(nodeName),
		credentialEntry: (type) =>
			credentialTypes.recognizes(type)
				? fileOf(credentialTypes.getByName(type).constructor)
				: undefined,
	};
}
