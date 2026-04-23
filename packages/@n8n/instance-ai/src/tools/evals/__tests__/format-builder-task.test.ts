import { formatEvalBuilderTask } from '../format-builder-task';

const BASE = {
	workflowId: 'w1',
	detectedAiNodes: ['General Agent'],
	suggestedOutputColumns: ['agent_response'],
	enabledMetrics: [
		{
			id: 'correctness',
			name: 'Correctness',
			kind: 'llm-judge' as const,
			description: 'Factual correctness of response.',
			prompt: 'Judge if the response is correct.',
			cannedMetricKey: 'correctness',
			defaultEnabled: true,
		},
	],
};

describe('formatEvalBuilderTask', () => {
	it('includes the workflow id and detected AI nodes', () => {
		const task = formatEvalBuilderTask({
			...BASE,
			dataTableId: 'dt-1',
			datasetChoice: 'generate',
		});
		expect(task).toContain('workflow w1');
		expect(task).toContain('General Agent');
	});

	it('instructs the builder to use the DataTable when dataTableId is provided', () => {
		const task = formatEvalBuilderTask({
			...BASE,
			dataTableId: 'dt-1',
			datasetChoice: 'generate',
		});
		expect(task).toContain('dt-1');
		expect(task).not.toContain('Leave the `evaluationTrigger` dataTableId empty');
	});

	it('instructs the builder to leave dataTableId empty when datasetChoice is "later"', () => {
		const task = formatEvalBuilderTask({
			...BASE,
			dataTableId: undefined,
			datasetChoice: 'later',
		});
		expect(task).toContain('Leave the `evaluationTrigger` dataTableId empty');
	});

	it('includes each suggested output column', () => {
		const task = formatEvalBuilderTask({
			...BASE,
			suggestedOutputColumns: ['agent_response', 'tool_used'],
			dataTableId: 'dt-1',
			datasetChoice: 'generate',
		});
		expect(task).toContain('- agent_response');
		expect(task).toContain('- tool_used');
	});

	it('includes metric names, kinds, and canned keys', () => {
		const task = formatEvalBuilderTask({
			...BASE,
			dataTableId: 'dt-1',
			datasetChoice: 'generate',
		});
		expect(task).toContain('Correctness');
		expect(task).toContain('llm-judge');
		expect(task).toContain('canned=correctness');
	});

	it('includes the judge prompt for llm-judge metrics', () => {
		const task = formatEvalBuilderTask({
			...BASE,
			dataTableId: 'dt-1',
			datasetChoice: 'generate',
		});
		expect(task).toContain('Judge prompt: Judge if the response is correct.');
	});

	it('omits cannedMetricKey marker when the metric does not have one', () => {
		const task = formatEvalBuilderTask({
			...BASE,
			enabledMetrics: [
				{
					id: 'exact',
					name: 'Exact Match',
					kind: 'exact-match' as const,
					description: 'Literal match.',
					defaultEnabled: true,
				},
			],
			dataTableId: 'dt-1',
			datasetChoice: 'generate',
		});
		expect(task).toContain('Exact Match');
		expect(task).not.toContain('canned=');
	});

	it('mentions the checkIfEvaluating gate and isolates side effects', () => {
		const task = formatEvalBuilderTask({
			...BASE,
			dataTableId: 'dt-1',
			datasetChoice: 'generate',
		});
		expect(task).toContain('checkIfEvaluating');
		expect(task).toContain('side-effect nodes MUST NOT be reached');
	});
});
