import { OutboundHttp } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig, NodesConfig } from '@n8n/config';
import { WorkflowRepository, type WorkflowEntity } from '@n8n/db';
import type { ContractRegistryOptions, ContractStoreOptions } from '@n8n/nodes-base-next';
import { mock } from 'vitest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import type { IExecuteFunctions } from 'n8n-workflow';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CredentialTypes } from '@/credential-types';

import { useNodeContractsRegistry } from '../node-contracts-registry';

const registered: ContractRegistryOptions[] = [];
const languages: string[][] = [];
vi.mock('@n8n/nodes-base-next', () => ({
	sandboxCredentialTypeOf: (known: (name: string) => boolean) => (name: string) =>
		known(name) ? { name } : undefined,
	useContractRegistry: (options: ContractRegistryOptions) => registered.push(options),
	setCodeLanguages: (allowed: string[]) => languages.push(allowed),
	contractStore: (options: ContractStoreOptions) => options,
}));

describe('useNodeContractsRegistry', () => {
	const globalConfig = mockInstance(GlobalConfig, {
		instanceAi: {
			nodeContractsUpdatePolicy: 'strict',
			nodeContractsRegistryUrl: 'http://registry.test',
			nodeContractsPublicKeyFile: '',
			nodeContractRange: '>=2.0.0 <3.0.0',
			nodeContractSandbox: 'off',
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
		expect(options?.sandbox).toBeUndefined();
	});

	it('passes the sandbox files, a cache dir in the n8n folder, and the n8n credential names', async () => {
		const dir = await mkdtemp(path.join(tmpdir(), 'node-contracts-sandbox-'));
		const files = ['n8n-sandbox', 'action.wasm', 'provider.wasm'].map((name) =>
			path.join(dir, name),
		);
		await Promise.all(files.map(async (file) => await writeFile(file, '')));
		mockInstance(CredentialTypes).recognizes.mockImplementation((name) => name === 'slackApi');
		Object.assign(globalConfig.instanceAi, {
			nodeContractSandbox: 'stored',
			nodeContractSandboxSidecar: files[0],
			nodeContractSandboxGuests: dir,
			nodeContractSandboxCacheDir: '',
		});
		try {
			registered.length = 0;
			await useNodeContractsRegistry();
			const [options] = registered;
			expect(options?.sandbox).toMatchObject({
				scope: 'stored',
				options: { sidecar: files[0], guests: dir, cacheDir: '/n8n/node-contracts/sandbox' },
			});
			expect(options?.sandbox?.options.credentialType('slackApi')).toEqual({ name: 'slackApi' });
			expect(options?.sandbox?.options.credentialType('evilApi')).toBeUndefined();

			globalConfig.instanceAi.nodeContractSandboxGuests = path.join(dir, 'missing');
			await expect(useNodeContractsRegistry()).rejects.toThrow(
				'N8N_NODE_CONTRACT_SANDBOX is stored, and the sandbox files are missing',
			);
		} finally {
			globalConfig.instanceAi.nodeContractSandbox = 'off';
			await rm(dir, { recursive: true, force: true });
		}
	});
});
