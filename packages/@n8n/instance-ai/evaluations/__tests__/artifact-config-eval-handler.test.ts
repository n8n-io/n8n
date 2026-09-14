import type { EvaluationConfigDto } from '@n8n/api-types';
import type { Mock } from 'vitest';

import { dataTableConfig } from './fixtures';
import type {
	DataTableColumnsResponse,
	DataTableRowsResponse,
	N8nClient,
} from '../clients/n8n-client';
import { configEvalHandler } from '../harness/artifacts/config-eval-handler';
import type { ArtifactRef } from '../types';

function googleSheetsConfig(workflowId: string): EvaluationConfigDto {
	return {
		id: 'config-2',
		workflowId,
		name: 'Sheets eval',
		status: 'valid',
		invalidReason: null,
		startNodeName: 'Start',
		endNodeName: 'End',
		metrics: [
			{
				id: 'metric-2',
				name: 'Correctness',
				type: 'llm_judge',
				config: {
					preset: 'correctness',
					provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					credentialId: 'cred-judge',
					model: 'gpt-4.1',
					outputType: 'numeric',
					inputs: { actualAnswer: '={{ $json.actual }}', expectedAnswer: '={{ $json.expected }}' },
				},
			},
		],
		datasetSource: 'google_sheets',
		datasetRef: {
			credentialId: 'cred-1',
			spreadsheetId: 'sheet-1',
			sheetName: 'Sheet1',
		},
	};
}

describe('configEvalHandler', () => {
	it('declares its type and static execution mode', () => {
		expect(configEvalHandler.type).toBe('config-eval');
		expect(configEvalHandler.runsExecutionScenarios).toBe(false);
	});

	it('discover() selects config-eval refs (owning workflow id) captured from the SSE stream', () => {
		const artifactRefs: ArtifactRef[] = [
			{ type: 'config-eval', id: 'wf-1' },
			{ type: 'agent', id: 'agent-1' },
		];

		const refs = configEvalHandler.discover({ artifactRefs });

		expect(refs).toEqual([{ type: 'config-eval', id: 'wf-1' }]);
	});

	it('fetch() follows the data_table dataset ref to columns + rows', async () => {
		const workflowId = 'wf-1';
		const dataTableId = 'dt-1';
		const projectId = 'project-1';
		const configs = [dataTableConfig(workflowId, dataTableId)];
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

		const getWorkflowEvaluationConfigs: Mock = vi.fn().mockResolvedValue(configs);
		const getPersonalProjectId: Mock = vi.fn().mockResolvedValue(projectId);
		const getDataTableColumns: Mock = vi.fn().mockResolvedValue(columns);
		const getDataTableRows: Mock = vi.fn().mockResolvedValue(rows);
		const client = {
			getWorkflowEvaluationConfigs,
			getPersonalProjectId,
			getDataTableColumns,
			getDataTableRows,
		} as unknown as N8nClient;

		const result = await configEvalHandler.fetch({ type: 'config-eval', id: workflowId }, client);

		expect(getWorkflowEvaluationConfigs).toHaveBeenCalledWith(workflowId);
		expect(getDataTableColumns).toHaveBeenCalledWith(projectId, dataTableId);
		expect(getDataTableRows).toHaveBeenCalledWith(projectId, dataTableId);
		expect(result.configs).toBe(configs);
		expect(result.dataTable).toEqual({ columns, rows });
	});

	it('fetch() leaves dataTable undefined and skips data-table calls when no config uses a data_table dataset', async () => {
		const workflowId = 'wf-2';
		const configs = [googleSheetsConfig(workflowId)];

		const getWorkflowEvaluationConfigs: Mock = vi.fn().mockResolvedValue(configs);
		const getPersonalProjectId: Mock = vi.fn();
		const getDataTableColumns: Mock = vi.fn();
		const getDataTableRows: Mock = vi.fn();
		const client = {
			getWorkflowEvaluationConfigs,
			getPersonalProjectId,
			getDataTableColumns,
			getDataTableRows,
		} as unknown as N8nClient;

		const result = await configEvalHandler.fetch({ type: 'config-eval', id: workflowId }, client);

		expect(result.configs).toBe(configs);
		expect(result.dataTable).toBeUndefined();
		expect(getPersonalProjectId).not.toHaveBeenCalled();
		expect(getDataTableColumns).not.toHaveBeenCalled();
		expect(getDataTableRows).not.toHaveBeenCalled();
	});

	it('renderArtifact() surfaces config + dataset detail and never mentions the owning workflow', () => {
		const workflowId = 'wf-should-not-appear';
		const configs = [dataTableConfig(workflowId, 'dt-1')];
		const columns: DataTableColumnsResponse = [
			{
				id: 'col-1',
				dataTableId: 'dt-1',
				name: 'input',
				type: 'string',
				index: 0,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			},
		];
		const rows: DataTableRowsResponse = { count: 0, data: [] };

		const output = configEvalHandler.renderArtifact({ configs, dataTable: { columns, rows } });

		expect(output).toContain('Correctness');
		expect(output).toContain('input');
		expect(output).not.toContain(workflowId);
	});
});
