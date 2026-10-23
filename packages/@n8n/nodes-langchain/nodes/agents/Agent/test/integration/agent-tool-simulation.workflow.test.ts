import { NodeTypes } from '@nodes-testing/node-types';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { WorkflowExecute } from 'n8n-core/dist/execution-engine/workflow-execute';
import {
	NodeConnectionTypes,
	type INodeExecutionData,
	type INodeType,
	type WorkflowTestData,
} from 'n8n-workflow';
import nock from 'nock';
import path from 'node:path';

function mockCompletion(
	content: string,
	tool?: string,
	requestBody?: (body: unknown) => boolean,
): NonNullable<WorkflowTestData['nock']>['mocks'][number] {
	return {
		method: 'post',
		path: '/v1/chat/completions',
		statusCode: 200,
		requestBody,
		responseBody: {
			id: 'chatcmpl-test',
			object: 'chat.completion',
			created: 1700000000,
			model: 'gpt-4o-mini',
			choices: [
				{
					index: 0,
					message: tool
						? {
								role: 'assistant',
								content: null,
								tool_calls: [
									{
										id: `call_${tool}`,
										type: 'function',
										function: {
											name: tool,
											arguments: JSON.stringify({ input: 'Write a record' }),
										},
									},
								],
							}
						: { role: 'assistant', content },
					finish_reason: tool ? 'tool_calls' : 'stop',
				},
			],
			usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
		},
	};
}

describe('Agent tool simulation', () => {
	const harness = new NodeTestHarness({
		additionalPackagePaths: [path.dirname(require.resolve('n8n-nodes-base'))],
	});
	const fixture = { id: 'simulated-write-1', status: 'accepted' };
	const credentials = { openAiApi: { apiKey: 'test-api-key', url: 'https://api.openai.com/v1' } };

	for (const agentVersion of [3, 3.1]) {
		for (const nested of [false, true]) {
			describe(`Agent ${agentVersion}, nested=${nested}`, () => {
				const workflow = harness.readWorkflowJSON(
					nested ? 'workflows/sub-agent-with-inner-tool.json' : 'workflows/agent-v3-with-tool.json',
				);
				workflow.settings = { ...workflow.settings, executionOrder: 'v1' };
				const agentName = nested ? 'Parent Agent' : 'AI Agent';
				const callerName = nested ? 'MathSubAgent' : agentName;
				workflow.nodes.find((node) => node.name === agentName)!.typeVersion = agentVersion;
				const write = workflow.nodes.find((node) => node.name === 'Calculator')!;
				write.name = 'Write';
				write.type = 'n8n-nodes-testing.write';
				write.typeVersion = 1;
				write.parameters = {};
				workflow.connections.Write = workflow.connections.Calculator;
				delete workflow.connections.Calculator;
				delete workflow.pinData;

				const writeImplementation = vi.fn(
					async (): Promise<INodeExecutionData[][]> => [[{ json: { id: 'real-write' } }]],
				);
				const writeNode: INodeType = {
					description: {
						displayName: 'Write',
						name: 'write',
						description: 'Writes a record',
						group: ['output'],
						version: 1,
						defaults: { name: 'Write' },
						inputs: [NodeConnectionTypes.Main],
						outputs: [NodeConnectionTypes.AiTool],
						properties: [],
					},
					execute: writeImplementation,
				};
				const getNodeType = NodeTypes.prototype.getByNameAndVersion;
				const runNode = WorkflowExecute.prototype.runNode;
				let receivedFixture = false;
				beforeEach(() => {
					receivedFixture = false;
					writeImplementation.mockClear();
					vi.spyOn(NodeTypes.prototype, 'getByNameAndVersion').mockImplementation(function (
						this: NodeTypes,
						type,
						version,
					) {
						return type === write.type ? writeNode : getNodeType.call(this, type, version);
					});
					let initialized = false;
					vi.spyOn(WorkflowExecute.prototype, 'runNode').mockImplementation(async function (
						this: WorkflowExecute,
						...args
					) {
						const [, executionData, runData, , , , , response] = args;
						if (!initialized) {
							initialized = true;
							// The harness starts at the trigger. Add per-execution pins before the Agent runs.
							runData.resultData.pinData = { Write: [{ json: fixture }] };
						}
						if (executionData.node.name === callerName && response?.actionResponses.length) {
							expect(response.actionResponses).toEqual(
								expect.arrayContaining([
									expect.objectContaining({
										action: expect.objectContaining({ nodeName: 'Write', type: 'ai_tool' }),
										data: expect.objectContaining({
											data: { ai_tool: [[expect.objectContaining({ json: fixture })]] },
										}),
									}),
								]),
							);
							receivedFixture = true;
						}
						return await runNode.apply(this, args);
					});
				});
				afterEach(() => {
					vi.restoreAllMocks();
					nock.cleanAll();
				});

				const mocks = [
					...(nested ? [mockCompletion('', 'MathSubAgent')] : []),
					mockCompletion('', 'Write'),
					mockCompletion('Fixture received', undefined, (body) =>
						JSON.stringify(body).includes(fixture.id),
					),
					...(nested ? [mockCompletion('Fixture received')] : []),
				];
				harness.setupTest(
					{
						description: 'returns the write fixture to the Agent through ai_tool',
						input: { workflowData: workflow },
						output: { nodeData: { [agentName]: [[{ json: { output: 'Fixture received' } }]] } },
						nock: { baseUrl: 'https://api.openai.com', mocks },
					},
					{
						credentials,
						customAssertions: () => {
							expect(writeImplementation).not.toHaveBeenCalled();
							expect(receivedFixture).toBe(true);
							expect(nock.isDone()).toBe(true);
						},
					},
				);
			});
		}
	}
});
