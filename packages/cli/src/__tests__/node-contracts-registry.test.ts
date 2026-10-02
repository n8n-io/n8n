import { OutboundHttp } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig, NodesConfig } from '@n8n/config';
import { WorkflowRepository, type WorkflowEntity } from '@n8n/db';
import type { ContractRegistryOptions, ContractStoreOptions } from '@n8n/nodes-base-next';
import { mock } from 'vitest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import type { IExecuteFunctions } from 'n8n-workflow';

import { useNodeContractsRegistry } from '../node-contracts-registry';

const registered: ContractRegistryOptions[] = [];
const languages: string[][] = [];
vi.mock('@n8n/nodes-base-next', () => ({
	useContractRegistry: (options: ContractRegistryOptions) => registered.push(options),
	setCodeLanguages: (allowed: string[]) => languages.push(allowed),
	contractStore: (options: ContractStoreOptions) => options,
}));

describe('useNodeContractsRegistry', () => {
	mockInstance(GlobalConfig, {
		instanceAi: {
			nodeContractsUpdatePolicy: 'strict',
			nodeContractsRegistryUrl: 'http://registry.test',
			nodeContractsPublicKeyFile: '',
			nodeContractRange: '>=2.0.0 <3.0.0',
		},
	} as unknown as GlobalConfig);
	mockInstance(InstanceSettings, { n8nFolder: '/n8n' });
	mockInstance(NodesConfig, { pythonEnabled: false });
	mockInstance(OutboundHttp).transport.mockReturnValue(
		mock<ReturnType<OutboundHttp['transport']>>(),
	);
	const workflowRepository = mockInstance(WorkflowRepository);
	const meta = { nodeContracts: {} };
	workflowRepository.findByIds.mockResolvedValue([{ id: 'wf', meta } as unknown as WorkflowEntity]);

	const contextOf = (executionId: string) =>
		mock<IExecuteFunctions>({
			getExecutionId: () => executionId,
			getWorkflow: () => ({ id: 'wf', active: false }),
		});

	it('passes the config and reads the workflow meta once per execution', async () => {
		await useNodeContractsRegistry();
		const [options] = registered;

		expect(options).toMatchObject({
			policy: 'strict',
			nodeContractRange: '>=2.0.0 <3.0.0',
			store: {
				registryUrl: 'http://registry.test',
				publicKey: undefined,
				storeDir: '/n8n/node-contracts',
			},
		});
		expect(await options?.metaOf(contextOf('1'))).toBe(meta);
		expect(await options?.metaOf(contextOf('1'))).toBe(meta);
		expect(await options?.metaOf(contextOf('2'))).toBe(meta);
		expect(workflowRepository.findByIds).toHaveBeenCalledTimes(2);
		expect(workflowRepository.findByIds).toHaveBeenCalledWith(['wf'], { fields: ['meta'] });
		// N8N_PYTHON_ENABLED=false turns Python off for the Code contracts too.
		expect(languages).toEqual([['javascript']]);
	});
});
