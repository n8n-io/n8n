import { currentJsonExpression, nodeItemJsonExpression } from '../column-ref-utils';
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

describe('formatEvalSetupTask — PRODUCTION ADAPTER section', () => {
	it('omits the section when namedRefs is empty or undefined', () => {
		const task = formatEvalSetupTask(BASE);
		expect(task).not.toMatch(/PRODUCTION ADAPTER/);
	});

	it('emits the PRODUCTION ADAPTER section when namedRefs is non-empty', () => {
		const task = formatEvalSetupTask({
			...BASE,
			namedRefs: [
				{
					nodeName: 'Voice or Text',
					field: 'text',
					originalExpression: "$('Voice or Text').item.json.text",
					column: 'text',
					targetNodeName: 'General Agent',
				},
			],
		});
		expect(task).toMatch(/PRODUCTION ADAPTER/);
		expect(task).toMatch(/Voice or Text/);
		expect(task).toMatch(/name: "text"/);
	});

	it('groups rewrites by target node when refs span agent + sub-component', () => {
		const task = formatEvalSetupTask({
			...BASE,
			suggestedInputColumns: ['text', 'sender_id'],
			detectedAiNodes: ['Agent'],
			namedRefs: [
				{
					nodeName: 'Voice or Text',
					field: 'text',
					originalExpression: "$('Voice or Text').item.json.text",
					column: 'text',
					targetNodeName: 'Agent',
				},
				{
					nodeName: 'Sender ID',
					field: 'id',
					originalExpression: "$('Sender ID').item.json.id",
					column: 'sender_id',
					targetNodeName: 'Postgres Memory',
				},
			],
		});
		expect(task).toMatch(/In `Agent`:[\s\S]*Replace `\$\('Voice or Text'\)/);
		expect(task).toMatch(/In `Postgres Memory`:[\s\S]*Replace `\$\('Sender ID'\)/);
	});

	it('agent rewrites use $json.<col> form', () => {
		const task = formatEvalSetupTask({
			...BASE,
			detectedAiNodes: ['Chef Agent'],
			namedRefs: [
				{
					nodeName: 'Voice or Text',
					field: 'text',
					originalExpression: "$('Voice or Text').item.json.text",
					column: 'text',
					targetNodeName: 'Chef Agent',
				},
			],
		});
		expect(task).toMatch(
			/Replace `\$\('Voice or Text'\)\.item\.json\.text` with `\{\{ \$json\.text \}\}`/,
		);
	});

	it("sub-component rewrites use $('<AgentName>').item.json.<col> form, not $json", () => {
		const task = formatEvalSetupTask({
			...BASE,
			detectedAiNodes: ['Chef Agent'],
			suggestedInputColumns: ['sender_id'],
			namedRefs: [
				{
					nodeName: 'Sender ID',
					field: 'id',
					originalExpression: "$('Sender ID').item.json.id",
					column: 'sender_id',
					targetNodeName: 'Postgres Memory',
				},
			],
		});
		expect(task).toContain(
			`Replace \`$('Sender ID').item.json.id\` with \`{{ ${nodeItemJsonExpression('Chef Agent', 'sender_id')} }}\``,
		);
		// Sub-component must not fall back to plain $json.<col>
		expect(task).not.toMatch(/In `Postgres Memory`:[\s\S]*\{\{ \$json\.sender_id \}\}/);
	});

	it('escapes generated adapter assignments and rewrite expressions', () => {
		const sourceNodeName = 'Voice "or" Text';
		const sourceField = 'message-id';
		const agentNodeName = "Chef's Agent";
		const column = 'user-message';
		const task = formatEvalSetupTask({
			...BASE,
			detectedAiNodes: ['Other Agent', agentNodeName],
			targetAgentNodeName: agentNodeName,
			suggestedInputColumns: [column],
			namedRefs: [
				{
					nodeName: sourceNodeName,
					field: sourceField,
					originalExpression: '$("Voice \\"or\\" Text").item.json["message-id"]',
					column,
					targetNodeName: agentNodeName,
				},
				{
					nodeName: 'Sender',
					field: 'sender-id',
					originalExpression: '$("Sender").item.json["sender-id"]',
					column: 'sender-id',
					targetNodeName: 'Postgres Memory',
				},
			],
		});

		expect(task).toContain(
			`value: ${JSON.stringify(`={{ ${nodeItemJsonExpression(sourceNodeName, sourceField)} }}`)}`,
		);
		expect(task).toContain(`with \`{{ ${currentJsonExpression(column)} }}\``);
		expect(task).toContain(`with \`{{ ${nodeItemJsonExpression(agentNodeName, 'sender-id')} }}\``);
	});
});
