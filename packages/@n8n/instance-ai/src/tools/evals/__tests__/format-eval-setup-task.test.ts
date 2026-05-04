import { formatEvalSetupTask } from '../format-eval-setup-task';

const BASE = {
	workflowId: 'w1',
	workflowName: 'Telegram AI Q&A Bot',
	detectedAiNodes: ['General Agent'],
	datasetChoice: 'create-empty' as const,
	suggestedInputColumns: ['user_message'],
	suggestedOutputColumns: ['agent_response'],
	enabledMetrics: [
		{
			id: 'correctness',
			name: 'Correctness',
			kind: 'llm-judge' as const,
			description: 'Factual correctness of the response.',
			prompt: 'Judge if the response is correct.',
			cannedMetricKey: 'correctness',
			defaultEnabled: true,
		},
	],
};

describe('formatEvalSetupTask', () => {
	it('includes workflow id and name, and detected AI nodes', () => {
		const task = formatEvalSetupTask(BASE);
		expect(task).toContain('w1');
		expect(task).toContain('Telegram AI Q&A Bot');
		expect(task).toContain('General Agent');
	});

	it('instructs sub-agent to create an empty DataTable only', () => {
		const task = formatEvalSetupTask(BASE);
		expect(task).toContain('Create an empty DataTable');
		expect(task).toContain('Do not insert rows');
		expect(task).toContain('- user_message');
		expect(task).toContain('- agent_response');
	});

	it('lists each enabled metric with kind and canned key when present', () => {
		const task = formatEvalSetupTask(BASE);
		expect(task).toContain('Correctness');
		expect(task).toContain('llm-judge');
		expect(task).toContain('canned=correctness');
		expect(task).toContain('Judge prompt: Judge if the response is correct.');
	});

	it('omits canned marker when the metric has no cannedMetricKey', () => {
		const task = formatEvalSetupTask({
			...BASE,
			enabledMetrics: [
				{
					id: 'exact',
					name: 'Exact Match',
					kind: 'exact-match' as const,
					description: 'Literal string match.',
					defaultEnabled: true,
				},
			],
		});
		expect(task).toContain('Exact Match');
		expect(task).toContain('exact-match');
		expect(task).not.toContain('canned=');
	});

	it('mentions the checkIfEvaluating topology as expected behavior', () => {
		const task = formatEvalSetupTask(BASE);
		expect(task).toContain('checkIfEvaluating');
		expect(task).toContain('setInputs');
		expect(task).toMatch(/Normal/);
	});

	it('instructs the shape bridge to enter the target AI node directly', () => {
		const task = formatEvalSetupTask(BASE);

		expect(task).toContain('SHAPE BRIDGE) → target AI agent node');
		expect(task).not.toContain('first processing node');
	});

	it('instructs shape bridge assignments to read only the current eval row', () => {
		const task = formatEvalSetupTask(BASE);

		expect(task).toContain('current EvaluationTrigger row');
		expect(task).toContain('$json.<input_column>');
		expect(task).toContain('Never reference original workflow nodes');
		expect(task).toContain("$('Some Node').item.json");
	});

	it('instructs eval setup not to rewrite existing AI agent parameters', () => {
		const task = formatEvalSetupTask(BASE);

		expect(task).toContain('Do not modify existing production node parameters');
		expect(task).toContain('do not rewrite the AI Agent prompt');
	});

	it('lists the suggested output columns as bullet items', () => {
		const task = formatEvalSetupTask({
			...BASE,
			suggestedOutputColumns: ['agent_response', 'tool_used'],
		});
		expect(task).toContain('- agent_response');
		expect(task).toContain('- tool_used');
	});
});
