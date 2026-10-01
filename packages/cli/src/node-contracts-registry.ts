import { OutboundHttp } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { readFile } from 'fs/promises';
import { COMPOSED_NODES, NODE_PACKAGE, withComposedVersions } from '@n8n/nodes-base-next';
import { InstanceSettings } from 'n8n-core';
import {
	deepCopy,
	type INodeTypeDescription,
	type IVersionedNodeType,
	type LoadedClass,
	type NodeLoader,
} from 'n8n-workflow';
import path from 'path';

// Recent executions only; a contract node reads the meta of its own execution.
const MAX_CACHED_EXECUTIONS = 100;

/**
 * Lets each contract node run the version that the lock in `meta.nodeContracts` resolves to.
 * Known limit: the lock comes from the saved workflow. An execution of an unsaved change or
 * of a published history version uses the meta of the current saved workflow.
 */
export async function useNodeContractsRegistry() {
	const { instanceAi } = Container.get(GlobalConfig);
	const { useContractRegistry } = await import('@n8n/nodes-base-next');
	const publicKeyFile = instanceAi.nodeContractsPublicKeyFile;
	const metaByExecution = new Map<string, Promise<unknown>>();

	const metaOf = async (workflowId: string | undefined) => {
		if (!workflowId) return undefined;
		const [workflow] = await Container.get(WorkflowRepository).findByIds([workflowId], {
			fields: ['meta'],
		});
		return workflow?.meta;
	};

	useContractRegistry({
		policy: instanceAi.nodeContractsUpdatePolicy,
		registryUrl: instanceAi.nodeContractsRegistryUrl,
		apiRange: instanceAi.nodeContractsApiRange,
		publicKey: publicKeyFile ? await readFile(publicKeyFile, 'utf8') : undefined,
		cacheDir: path.join(Container.get(InstanceSettings).n8nFolder, 'node-contracts'),
		// The registry URL is operator config, not user input, so the SSRF policy does not apply.
		fetch: Container.get(OutboundHttp)
			.transport({ useDefaultSsrfPolicy: 'unsafe' })
			.asCustomFetch(),
		metaOf: async (context) => {
			const { id } = context.getWorkflow();
			const key = `${context.getExecutionId()}/${id ?? ''}`;
			const known = metaByExecution.get(key);
			if (known) return await known;
			const oldest = metaByExecution.keys().next();
			if (metaByExecution.size >= MAX_CACHED_EXECUTIONS && !oldest.done) {
				metaByExecution.delete(oldest.value);
			}
			const meta = metaOf(id);
			metaByExecution.set(key, meta);
			return await meta.catch((error: unknown) => {
				metaByExecution.delete(key);
				throw error;
			});
		},
	});
}

/** The legacy node of a full node type, when its loader has it and it has versions. */
function versionedNodeOf(loaders: Readonly<Record<string, NodeLoader>>, nodeType: string) {
	const separator = nodeType.lastIndexOf('.');
	const loader = loaders[nodeType.slice(0, separator)];
	const name = nodeType.slice(separator + 1);
	if (!loader || !(name in loader.known.nodes)) return undefined;
	const loaded = loader.getNode(name);
	return 'nodeVersions' in loaded.type ? { ...loaded, type: loaded.type } : undefined;
}

/**
 * Adds the composed versions of legacy nodes, for example Notion v4, to the node classes and
 * to the types that the editor reads. The node type of each single action stays for the AI
 * builder and saved workflows, but the nodes panel no longer lists it.
 */
export function composeContractNodes(
	loaders: Readonly<Record<string, NodeLoader>>,
	types: readonly INodeTypeDescription[],
) {
	const nodes = new Map(
		Object.keys(COMPOSED_NODES).flatMap((nodeType) => {
			const legacy = versionedNodeOf(loaders, nodeType);
			if (!legacy) return [];
			const composed: LoadedClass<IVersionedNodeType> = {
				...legacy,
				type: withComposedVersions(nodeType, legacy.type),
			};
			return [[nodeType, composed] as const];
		}),
	);
	// A copy, because later steps add options to the properties of the newest version.
	const added = [...nodes].flatMap(([name, { type }]) =>
		Object.keys(COMPOSED_NODES[name] ?? {}).map(
			(version): INodeTypeDescription => ({
				...deepCopy(type.getNodeType(Number(version)).description),
				name,
			}),
		),
	);
	const patched = types.map((description): INodeTypeDescription => {
		const defaultVersion = nodes.get(description.name)?.type.description.defaultVersion;
		if (defaultVersion !== undefined) return { ...description, defaultVersion };
		return description.name.startsWith(`${NODE_PACKAGE}.`)
			? { ...description, hidden: true }
			: description;
	});
	return { nodes, types: [...patched, ...added] };
}
