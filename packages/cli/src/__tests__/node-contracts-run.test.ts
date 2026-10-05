import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { nodeGroupsForRun, prepareNodeContractsRun } from '@/node-contracts-run';
import { NodeContractsSync } from '@/node-contracts-sync';

describe('nodeGroupsForRun', () => {
	const draftGroups = [{ id: 'g-draft', name: 'Draft', nodeIds: ['a'] }];
	const versionGroups = [{ id: 'g-version', name: 'Version', nodeIds: ['b'] }];
	const { instanceAi } = Container.get(GlobalConfig);

	afterEach(() => {
		instanceAi.nodeContractsEnabled = true;
	});

	it('returns the groups of the version with node contracts enabled', () => {
		instanceAi.nodeContractsEnabled = true;

		expect(nodeGroupsForRun(draftGroups, versionGroups)).toBe(versionGroups);
	});

	it('returns the groups of the draft with node contracts disabled', () => {
		instanceAi.nodeContractsEnabled = false;

		expect(nodeGroupsForRun(draftGroups, versionGroups)).toBe(draftGroups);
	});
});

describe('prepareNodeContractsRun', () => {
	const { instanceAi } = Container.get(GlobalConfig);
	const workflowOf = (type: string) => ({ id: 'w', nodes: [mock<INode>({ type })] });

	afterEach(() => {
		instanceAi.nodeContractsEnabled = true;
	});

	it('prepares a run with a contract node of any first-party package, only with node contracts on', async () => {
		const sync = mockInstance(NodeContractsSync);
		instanceAi.nodeContractsEnabled = true;
		await prepareNodeContractsRun(workflowOf('@n8n/nodes-core.noOpPass'));
		await prepareNodeContractsRun(workflowOf('@n8n/nodes-base-next.httpRequestGet'));
		await prepareNodeContractsRun(workflowOf('n8n-nodes-base.noOp'));
		instanceAi.nodeContractsEnabled = false;
		await prepareNodeContractsRun(workflowOf('@n8n/nodes-core.noOpPass'));

		expect(sync.prepareRun.mock.calls.map(([{ nodes }]) => nodes[0]?.type)).toEqual([
			'@n8n/nodes-core.noOpPass',
			'@n8n/nodes-base-next.httpRequestGet',
		]);
	});
});
