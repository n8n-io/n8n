import { OutboundHttp } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { readFile } from 'fs/promises';
import { InstanceSettings } from 'n8n-core';
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
