// Mock the barrel import so importing the adapter module doesn't pull the full
// @n8n/instance-ai runtime; these tests exercise only the local eval-config mappers.
vi.mock('@n8n/instance-ai', () => ({
	wrapUntrustedData: (content: string) => content,
	builderTemplatesOptionsFromEnv: () => ({}),
	deriveCredentialHosts: () => [],
	BuilderTemplatesService: class {},
}));

vi.mock('@n8n/ai-utilities', () => ({
	braveSearch: vi.fn(),
	searxngSearch: vi.fn(),
}));

import type { EvaluationConfig } from '@n8n/db';
import type { UpsertEvaluationConfigInput } from '@n8n/instance-ai';

import {
	buildEvaluationConfigDto,
	evaluationConfigToSummary,
} from '../instance-ai.adapter.service';

const baseCorrectness: UpsertEvaluationConfigInput = {
	name: 'Answer quality',
	startNodeName: 'Agent',
	endNodeName: 'Agent',
	dataTableId: 'dt-1',
	metrics: [
		{
			name: 'Correctness',
			preset: 'correctness',
			provider: 'openai',
			credentialId: 'cred-1',
			model: 'gpt-4o',
			outputType: 'numeric',
			actualAnswer: '={{ $json.output }}',
			expectedAnswer: '={{ $json.expected }}',
		},
	],
};

describe('buildEvaluationConfigDto', () => {
	it('maps a correctness metric onto a schema-valid data_table config', () => {
		const dto = buildEvaluationConfigDto(baseCorrectness);

		expect(dto).toMatchObject({
			name: 'Answer quality',
			startNodeName: 'Agent',
			endNodeName: 'Agent',
			datasetSource: 'data_table',
			datasetRef: { dataTableId: 'dt-1' },
		});
		expect(dto.metrics).toHaveLength(1);
		expect(dto.metrics[0]).toMatchObject({
			name: 'Correctness',
			type: 'llm_judge',
			config: {
				preset: 'correctness',
				provider: 'openai',
				credentialId: 'cred-1',
				model: 'gpt-4o',
				outputType: 'numeric',
				inputs: {
					actualAnswer: '={{ $json.output }}',
					expectedAnswer: '={{ $json.expected }}',
				},
			},
		});
		// id is generated, not taken from the tool input
		expect(dto.metrics[0]?.id).toBeTruthy();
	});

	it('maps a helpfulness metric using userQuery', () => {
		const dto = buildEvaluationConfigDto({
			...baseCorrectness,
			metrics: [
				{
					name: 'Helpfulness',
					preset: 'helpfulness',
					provider: 'anthropic',
					credentialId: 'cred-2',
					model: 'claude-sonnet',
					outputType: 'numeric',
					actualAnswer: '={{ $json.output }}',
					userQuery: '={{ $json.question }}',
				},
			],
		});

		expect(dto.metrics[0]?.config).toMatchObject({
			preset: 'helpfulness',
			inputs: { userQuery: '={{ $json.question }}' },
		});
	});

	it('includes the prompt override only when provided', () => {
		const withPrompt = buildEvaluationConfigDto({
			...baseCorrectness,
			metrics: [{ ...baseCorrectness.metrics[0], prompt: 'Rate from 0 to 1' }],
		});
		expect(withPrompt.metrics[0]?.config).toMatchObject({ prompt: 'Rate from 0 to 1' });

		const withoutPrompt = buildEvaluationConfigDto(baseCorrectness);
		expect(withoutPrompt.metrics[0]?.config).not.toHaveProperty('prompt');
	});

	it('rejects a correctness metric without an expected answer', () => {
		expect(() =>
			buildEvaluationConfigDto({
				...baseCorrectness,
				metrics: [
					{
						name: 'Correctness',
						preset: 'correctness',
						provider: 'openai',
						credentialId: 'cred-1',
						model: 'gpt-4o',
						outputType: 'numeric',
						actualAnswer: '={{ $json.output }}',
					},
				],
			}),
		).toThrow();
	});

	it('rejects a helpfulness metric without a user query', () => {
		expect(() =>
			buildEvaluationConfigDto({
				...baseCorrectness,
				metrics: [
					{
						name: 'Helpfulness',
						preset: 'helpfulness',
						provider: 'anthropic',
						credentialId: 'cred-2',
						model: 'claude-sonnet',
						outputType: 'numeric',
						actualAnswer: '={{ $json.output }}',
					},
				],
			}),
		).toThrow();
	});
});

describe('evaluationConfigToSummary', () => {
	const dataTableConfig = {
		id: 'cfg-1',
		workflowId: 'wf-1',
		name: 'Answer quality',
		status: 'valid',
		invalidReason: null,
		datasetSource: 'data_table',
		datasetRef: { dataTableId: 'dt-1' },
		startNodeName: 'Agent',
		endNodeName: 'Agent',
		metrics: [{ id: 'm-1', name: 'Correctness', type: 'llm_judge', config: {} }],
	} as unknown as EvaluationConfig;

	it('maps entity fields and extracts dataTableId for a data_table config', () => {
		expect(evaluationConfigToSummary(dataTableConfig)).toEqual({
			id: 'cfg-1',
			workflowId: 'wf-1',
			name: 'Answer quality',
			status: 'valid',
			invalidReason: null,
			startNodeName: 'Agent',
			endNodeName: 'Agent',
			metrics: [{ id: 'm-1', name: 'Correctness', type: 'llm_judge' }],
			datasetSource: 'data_table',
			dataTableId: 'dt-1',
		});
	});

	it('omits dataTableId for a non-data_table dataset', () => {
		const gsheets = {
			...dataTableConfig,
			datasetSource: 'google_sheets',
			datasetRef: { credentialId: 'c', spreadsheetId: 's', sheetName: 'Sheet1' },
		} as unknown as EvaluationConfig;

		const summary = evaluationConfigToSummary(gsheets);

		expect(summary.dataTableId).toBeUndefined();
		expect(summary.datasetSource).toBe('google_sheets');
	});
});
