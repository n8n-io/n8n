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

/** A module of the require cache: only these members are read. */
interface LoadedModule {
	exports: unknown;
	filename: string;
}

/**
 * The file of the loaded module that exports `nodeClass`. Only data properties are read:
 * a getter of an unrelated module can throw or have a side effect.
 */
export function findExportingFile(
	modules: Iterable<LoadedModule | undefined>,
	nodeClass: unknown,
): string | undefined {
	for (const loaded of modules) {
		const exported = loaded?.exports;
		if (typeof exported !== 'object' || exported === null) continue;
		for (const property of Object.values(Object.getOwnPropertyDescriptors(exported))) {
			if ('value' in property && property.value === nodeClass) return loaded?.filename;
		}
	}
	return undefined;
}

function fileOf(nodeClass: unknown): string | undefined {
	if (fileOfClass.has(nodeClass)) return fileOfClass.get(nodeClass);
	const found = findExportingFile(Object.values(require.cache), nodeClass);
	fileOfClass.set(nodeClass, found);
	return found;
}

export function nodeSourcesOf(
	lang: WorkflowLang,
	nodeTypes: NodeTypes,
	credentials: Map<string, PublicCredential>,
	credentialTypes: CredentialTypes,
	storesResponses: boolean,
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
		// `wfrt` stores the body of a response as binary data only in n8n's file system store
		// (`responseBinary`). In other modes a node that asks for response bytes stays in the host.
		...(storesResponses ? { storesResponses: true } : {}),
	};
}

/**
 * The sources when n8n does not compile nodes from their code: no node has a file, and the
 * nodes of `hostNodes` run in the fallback host.
 */
export function hostOnlySources(hostNodes: ReadonlySet<string>): NodeSources {
	return {
		entry: () => undefined,
		readFile: () => undefined,
		description: () => undefined,
		runsInHost: (nodeName) => hostNodes.has(nodeName),
	};
}
