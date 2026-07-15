import type { Mock } from 'vitest';
import { vi } from 'vitest';

import { dataTableConfig } from './fixtures';
import type {
	DataTableColumnsResponse,
	DataTableRowsResponse,
	N8nClient,
} from '../clients/n8n-client';
import { resolveArtifactContext } from '../harness/artifacts/artifact-context';
import type { EvalLogger } from '../harness/logger';
import type { ArtifactRef } from '../types';

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: vi.fn(),
	error: () => {},
	isVerbose: false,
};

describe('resolveArtifactContext', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders "(no … produced)" fallbacks for both types when no refs were captured', async () => {
		const client = {
			getPersonalProjectId: vi.fn(),
			getAgentConfig: vi.fn(),
			getAgentSkills: vi.fn(),
			getWorkflowEvaluationConfigs: vi.fn(),
		} as unknown as N8nClient;

		const context = await resolveArtifactContext({
			artifactRefs: [],
			client,
			logger: silentLogger,
		});

		expect(context).toBe(
			'## Agent\n\n(no agent produced)\n\n## Config-eval\n\n(no config-eval produced)',
		);
		expect(client.getPersonalProjectId).not.toHaveBeenCalled();
	});

	it('fetches and renders a discovered agent ref into the Agent section', async () => {
		const artifactRefs: ArtifactRef[] = [{ type: 'agent', id: 'agent-x' }];
		const getPersonalProjectId: Mock = vi.fn().mockResolvedValue('project-1');
		const getAgentConfig: Mock = vi.fn().mockResolvedValue({ name: 'My Agent' });
		const getAgentSkills: Mock = vi.fn().mockResolvedValue({});
		const client = {
			getPersonalProjectId,
			getAgentConfig,
			getAgentSkills,
			getWorkflowEvaluationConfigs: vi.fn().mockResolvedValue([]),
		} as unknown as N8nClient;

		const context = await resolveArtifactContext({ artifactRefs, client, logger: silentLogger });

		expect(getAgentConfig).toHaveBeenCalledWith('project-1', 'agent-x');
		expect(getAgentSkills).toHaveBeenCalledWith('project-1', 'agent-x');
		expect(context).toContain('## Agent\n\n## Agent config');
		expect(context).toContain('My Agent');
		// The config-eval section still renders its fallback.
		expect(context).toContain('## Config-eval\n\n(no config-eval produced)');
	});

	it('fetches and renders a discovered config-eval ref against its data_table dataset', async () => {
		const workflowId = 'wf-1';
		const dataTableId = 'dt-1';
		const artifactRefs: ArtifactRef[] = [{ type: 'config-eval', id: workflowId }];
		const columns: DataTableColumnsResponse = [
			{
				id: 'col-1',
				dataTableId,
				name: 'input',
				type: 'string',
				index: 0,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			},
		];
		const rows: DataTableRowsResponse = {
			count: 1,
			data: [
				{
					id: 1,
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
					input: 'hi',
				},
			],
		};
		const client = {
			getWorkflowEvaluationConfigs: vi
				.fn()
				.mockResolvedValue([dataTableConfig(workflowId, dataTableId)]),
			getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
			getDataTableColumns: vi.fn().mockResolvedValue(columns),
			getDataTableRows: vi.fn().mockResolvedValue(rows),
		} as unknown as N8nClient;

		const context = await resolveArtifactContext({ artifactRefs, client, logger: silentLogger });

		expect(context).toContain('## Config-eval\n\n## Evaluation configs');
		expect(context).toContain('input');
		// The owning workflow id is reference/intent only and must never reach the judge.
		expect(context).not.toContain(workflowId);
		// The agent section still renders its fallback.
		expect(context).toContain('## Agent\n\n(no agent produced)');
	});

	it('surfaces a fetch failure inline instead of the fallback, and does not throw', async () => {
		const artifactRefs: ArtifactRef[] = [{ type: 'agent', id: 'agent-x' }];
		const client = {
			getPersonalProjectId: vi.fn().mockRejectedValue(new Error('network down')),
			getAgentConfig: vi.fn(),
			getAgentSkills: vi.fn(),
			getWorkflowEvaluationConfigs: vi.fn().mockResolvedValue([]),
		} as unknown as N8nClient;

		const context = await resolveArtifactContext({ artifactRefs, client, logger: silentLogger });

		expect(context).toContain(
			'## Agent\n\n(agent produced but could not be rendered: network down)',
		);
		expect(silentLogger.warn).toHaveBeenCalled();
	});
});
