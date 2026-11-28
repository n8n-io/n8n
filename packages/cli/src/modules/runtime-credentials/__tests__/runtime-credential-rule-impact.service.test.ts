import type { WorkflowRepository } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { RuntimeCredentialRuleImpactService } from '../runtime-credential-rule-impact.service';

const WEBHOOK = 'n8n-nodes-base.webhook';
const nodes: INode[] = [
	{
		id: '1',
		name: 'Webhook',
		type: WEBHOOK,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	},
	{
		id: '2',
		name: 'Set',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: { value: "={{ $('Webhook').item.json.headers['x-token'] }}" },
	},
];

const row = (index: number) => ({
	id: String(index).padStart(6, '0'),
	name: `Workflow ${index}`,
	projectId: 'p1',
	projectName: 'Project',
	nodes,
	connections: {},
});

describe('RuntimeCredentialRuleImpactService', () => {
	const repository = mock<WorkflowRepository>();
	const service = new RuntimeCredentialRuleImpactService(repository);

	beforeEach(() => vi.resetAllMocks());

	it('returns the workflow with project and node names', async () => {
		repository.findNodesPageForImpactScan.mockResolvedValue([row(1)]);

		await expect(service.findAffectedWorkflows(WEBHOOK, 'headers.x-token')).resolves.toEqual({
			workflows: [
				{
					id: '000001',
					name: 'Workflow 1',
					projectId: 'p1',
					projectName: 'Project',
					nodeNames: ['Set'],
				},
			],
			truncated: false,
		});
		expect(repository.findNodesPageForImpactScan).toHaveBeenCalledWith(
			expect.objectContaining({ nodesContain: 'headers', triggerNodeTypes: [WEBHOOK] }),
		);
	});

	it('does not filter by trigger type for *', async () => {
		repository.findNodesPageForImpactScan.mockResolvedValue([]);

		await service.findAffectedWorkflows('*', 'headers.x-token');

		expect(repository.findNodesPageForImpactScan).toHaveBeenCalledWith(
			expect.objectContaining({ triggerNodeTypes: undefined }),
		);
	});

	it('stops at 100 workflows and sets truncated', async () => {
		repository.findNodesPageForImpactScan.mockImplementation(async ({ afterId }) => {
			const start = afterId ? Number(afterId) + 1 : 1;
			return Array.from({ length: 100 }, (_, i) => row(start + i));
		});

		const impact = await service.findAffectedWorkflows(WEBHOOK, 'headers.x-token');

		expect(impact.workflows).toHaveLength(100);
		expect(impact.truncated).toBe(true);
	});

	it('does not set truncated for exactly 100 matches', async () => {
		repository.findNodesPageForImpactScan
			.mockResolvedValueOnce(Array.from({ length: 100 }, (_, i) => row(i + 1)))
			.mockResolvedValueOnce([]);

		const impact = await service.findAffectedWorkflows(WEBHOOK, 'headers.x-token');

		expect(impact.workflows).toHaveLength(100);
		expect(impact.truncated).toBe(false);
	});

	it('sets truncated when the scan limit is reached without 100 matches', async () => {
		repository.findNodesPageForImpactScan.mockImplementation(async ({ afterId }) => {
			const start = afterId ? Number(afterId) + 1 : 1;
			return Array.from({ length: 100 }, (_, i) => ({
				...row(start + i),
				nodes: [nodes[0]],
			}));
		});

		const impact = await service.findAffectedWorkflows(WEBHOOK, 'headers.x-token');

		expect(impact).toEqual({ workflows: [], truncated: true });
		expect(repository.findNodesPageForImpactScan).toHaveBeenCalledTimes(50);
	});
});
