import {
	evaluationConfigSchema,
	evaluationMetricSchema,
	upsertEvaluationConfigSchema,
} from '../evaluation-config.dto';

const validLlmJudgeConfig = (overrides: Record<string, unknown> = {}) => ({
	preset: 'correctness' as const,
	prompt: 'You are a judge...',
	provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
	credentialId: 'cred-123',
	model: 'gpt-4o',
	outputType: 'numeric' as const,
	inputs: {
		actualAnswer: '={{ $("Agent").item.json.output }}',
		expectedAnswer: '={{ $json.expected_answer }}',
	},
	...overrides,
});

const validExpressionMetric = {
	id: 'm1',
	name: 'Tool match',
	type: 'expression' as const,
	config: {
		expression: '={{ $json.a === $json.b }}',
		outputType: 'boolean' as const,
	},
};

describe('evaluationMetricSchema', () => {
	it('accepts a valid expression metric', () => {
		expect(evaluationMetricSchema.safeParse(validExpressionMetric).success).toBe(true);
	});

	it('accepts a valid correctness llm_judge metric', () => {
		expect(
			evaluationMetricSchema.safeParse({
				id: 'm2',
				name: 'Correctness',
				type: 'llm_judge',
				config: validLlmJudgeConfig(),
			}).success,
		).toBe(true);
	});

	it('accepts a valid helpfulness llm_judge metric with userQuery', () => {
		expect(
			evaluationMetricSchema.safeParse({
				id: 'm3',
				name: 'Helpfulness',
				type: 'llm_judge',
				config: validLlmJudgeConfig({
					preset: 'helpfulness',
					inputs: {
						actualAnswer: '={{ $json.out }}',
						userQuery: '={{ $json.query }}',
					},
				}),
			}).success,
		).toBe(true);
	});

	it('rejects correctness without expectedAnswer', () => {
		expect(
			evaluationMetricSchema.safeParse({
				id: 'm4',
				name: 'Correctness',
				type: 'llm_judge',
				config: validLlmJudgeConfig({ inputs: { actualAnswer: '={{ $json.out }}' } }),
			}).success,
		).toBe(false);
	});

	it('rejects helpfulness without userQuery', () => {
		expect(
			evaluationMetricSchema.safeParse({
				id: 'm5',
				name: 'Helpfulness',
				type: 'llm_judge',
				config: validLlmJudgeConfig({
					preset: 'helpfulness',
					inputs: { actualAnswer: '={{ $json.out }}' },
				}),
			}).success,
		).toBe(false);
	});

	it('rejects an unknown preset', () => {
		expect(
			evaluationMetricSchema.safeParse({
				id: 'm6',
				name: 'Bad',
				type: 'llm_judge',
				config: validLlmJudgeConfig({ preset: 'invented' }),
			}).success,
		).toBe(false);
	});
});

describe('evaluationConfigSchema', () => {
	const validBase = {
		id: 'cfg-1',
		workflowId: 'wf-1',
		name: 'My eval',
		status: 'valid' as const,
		invalidReason: null,
		startNodeName: 'Trigger',
		endNodeName: 'Agent',
		metrics: [validExpressionMetric],
	};

	it('accepts a valid config with a data_table dataset', () => {
		expect(
			evaluationConfigSchema.safeParse({
				...validBase,
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
			}).success,
		).toBe(true);
	});

	it('accepts a valid config with a google_sheets dataset (forward-compatible)', () => {
		expect(
			evaluationConfigSchema.safeParse({
				...validBase,
				datasetSource: 'google_sheets',
				datasetRef: {
					credentialId: 'cred-9',
					spreadsheetId: 'abc123',
					sheetName: 'Sheet1',
					headerRow: 1,
				},
			}).success,
		).toBe(true);
	});

	it('rejects a google_sheets dataset missing required fields', () => {
		expect(
			evaluationConfigSchema.safeParse({
				...validBase,
				datasetSource: 'google_sheets',
				datasetRef: { credentialId: 'cred-9', spreadsheetId: 'abc123' },
			}).success,
		).toBe(false);
	});

	it('rejects a config with zero metrics', () => {
		expect(
			evaluationConfigSchema.safeParse({
				...validBase,
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
				metrics: [],
			}).success,
		).toBe(false);
	});

	it('rejects a config with a name longer than 128 chars', () => {
		expect(
			evaluationConfigSchema.safeParse({
				...validBase,
				name: 'a'.repeat(129),
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
			}).success,
		).toBe(false);
	});

	it('rejects an unknown status', () => {
		expect(
			evaluationConfigSchema.safeParse({
				...validBase,
				status: 'broken',
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
			}).success,
		).toBe(false);
	});

	it('accepts an invalid status with an invalidReason string', () => {
		expect(
			evaluationConfigSchema.safeParse({
				...validBase,
				status: 'invalid',
				invalidReason: 'END_NODE_DELETED',
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
			}).success,
		).toBe(true);
	});
});

describe('upsertEvaluationConfigSchema', () => {
	it('does not require id, workflowId, status, or invalidReason', () => {
		expect(
			upsertEvaluationConfigSchema.safeParse({
				name: 'My eval',
				startNodeName: 'Trigger',
				endNodeName: 'Agent',
				metrics: [validExpressionMetric],
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
			}).success,
		).toBe(true);
	});

	it('strips id from the parsed result if a client supplies it', () => {
		const result = upsertEvaluationConfigSchema.safeParse({
			id: 'cfg-1',
			name: 'My eval',
			startNodeName: 'Trigger',
			endNodeName: 'Agent',
			metrics: [validExpressionMetric],
			datasetSource: 'data_table',
			datasetRef: { dataTableId: 'dt-1' },
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect((result.data as Record<string, unknown>).id).toBeUndefined();
		}
	});
});
