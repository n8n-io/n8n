import { ITaskData } from '../../packages/workflow/src';
import { IPinData } from '../../packages/workflow';
import { clickExecuteWorkflowButton } from '../composables';

export function createNodeExecutionData(
	name: string,
	{
		data,
		executionStatus = 'success',
		jsonData,
	}: Partial<ITaskData> & { jsonData?: Record<string, object> },
): Record<string, ITaskData> {
	return {
		[name]: {
			startTime: new Date().getTime(),
			executionTime: 0,
			executionStatus,
			data: jsonData
				? Object.keys(jsonData).reduce((acc, key) => {
						acc[key] = [
							[
								{
									json: jsonData[key],
									pairedItem: { item: 0 },
								},
							],
						];

						return acc;
				  }, {})
				: data,
			source: [null],
		},
	};
}

export function createWorkflowExecutionData({
	executionId,
	runData,
	pinData = {},
	lastNodeExecuted,
}: {
	executionId: string;
	runData: Record<string, ITaskData | ITaskData[]>;
	pinData?: IPinData;
	lastNodeExecuted: string;
}) {
	return {
		executionId,
		data: {
			data: {
				startData: {},
				resultData: {
					runData,
					pinData,
					lastNodeExecuted,
				},
				executionData: {
					contextData: {},
					nodeExecutionStack: [],
					metadata: {},
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			},
			mode: 'manual',
			startedAt: new Date().toISOString(),
			stoppedAt: new Date().toISOString(),
			status: 'success',
			finished: true,
		},
	};
}

export function executeWorkflow({
	trigger,
	lastNodeExecuted,
	runData,
	workflowExecutionData,
}: {
	trigger?: () => void;
	lastNodeExecuted: string;
	runData: Array<ReturnType<typeof createNodeExecutionData>>;
	workflowExecutionData?: ReturnType<typeof createWorkflowExecutionData>;
}) {
	const executionId = Math.random().toString(36).substring(4);

	cy.intercept('POST', '/rest/workflows/run', {
		statusCode: 201,
		body: {
			data: {
				executionId,
			},
		},
	}).as('runWorkflow');

	if (trigger) {
		trigger();
	} else {
		clickExecuteWorkflowButton();
	}

	cy.wait('@runWorkflow');

	const resolvedRunData = {};
	runData.forEach((nodeExecution) => {
		const nodeName = Object.keys(nodeExecution)[0];
		const nodeRunData = nodeExecution[nodeName];

		cy.push('nodeExecuteBefore', {
			executionId,
			nodeName,
		});
		cy.push('nodeExecuteAfter', {
			executionId,
			nodeName,
			data: nodeRunData,
		});

		resolvedRunData[nodeName] = nodeExecution[nodeName];
	});

	cy.push(
		'executionFinished',
		createWorkflowExecutionData({
			executionId,
			lastNodeExecuted,
			runData: resolvedRunData,
			...workflowExecutionData,
		}),
	);
}

// {
// 	executionId,
// 		data: {
// 	data: {
// 		startData: {},
// 		resultData: {
// 			runData: {
// 			...createNodeExecutionData('On new manual Chat Message', {
// 					main: [[{ json: { input: 'Hello!' } }]],
// 				}),
// 			...createNodeExecutionData('OpenAI Chat Model', {
// 					ai_languageModel: [
// 						[
// 							{
// 								json: {
// 									response: {
// 										generations: [
// 											{
// 												text: '{\n    "action": "Final Answer",\n    "action_input": "Hi there! How can I assist you today?"\n}',
// 												message: {
// 													lc: 1,
// 													type: 'constructor',
// 													id: ['langchain', 'schema', 'AIMessage'],
// 													kwargs: {
// 														content:
// 															'{\n    "action": "Final Answer",\n    "action_input": "Hi there! How can I assist you today?"\n}',
// 														additional_kwargs: {},
// 													},
// 												},
// 												generationInfo: { finish_reason: 'stop' },
// 											},
// 										],
// 										llmOutput: {
// 											tokenUsage: {
// 												completionTokens: 26,
// 												promptTokens: 519,
// 												totalTokens: 545,
// 											},
// 										},
// 									},
// 								},
// 							},
// 						],
// 					],
// 				}),
// 			...createNodeExecutionData('Agent', {
// 					main: [
// 						[
// 							{
// 								json: { output: 'Hi there! How can I assist you today?' },
// 								pairedItem: { item: 0 },
// 							},
// 						],
// 					],
// 				}),
//
// 				// 'OpenAI Chat Model': [
// 				// 	{
// 				// 		startTime: 1698057673563,
// 				// 		executionTime: 2794,
// 				// 		executionStatus: 'success',
// 				// 		source: [null],
// 				// 		data: ,
// 				// 		inputOverride: {
// 				// 			ai_languageModel: [
// 				// 				[
// 				// 					{
// 				// 						json: {
// 				// 							messages: [
// 				// 								{
// 				// 									lc: 1,
// 				// 									type: 'constructor',
// 				// 									id: ['langchain', 'schema', 'SystemMessage'],
// 				// 									kwargs: {
// 				// 										content:
// 				// 											'Assistant is a large language model trained by OpenAI.\n\nAssistant is designed to be able to assist with a wide range of tasks, from answering simple questions to providing in-depth explanations and discussions on a wide range of topics. As a language model, Assistant is able to generate human-like text based on the input it receives, allowing it to engage in natural-sounding conversations and provide responses that are coherent and relevant to the topic at hand.\n\nAssistant is constantly learning and improving, and its capabilities are constantly evolving. It is able to process and understand large amounts of text, and can use this knowledge to provide accurate and informative responses to a wide range of questions. Additionally, Assistant is able to generate its own text based on the input it receives, allowing it to engage in discussions and provide explanations and descriptions on a wide range of topics.\n\nOverall, Assistant is a powerful system that can help with a wide range of tasks and provide valuable insights and information on a wide range of topics. Whether you need help with a specific question or just want to have a conversation about a particular topic, Assistant is here to assist. However, above all else, all responses must adhere to the format of RESPONSE FORMAT INSTRUCTIONS.',
// 				// 										additional_kwargs: {},
// 				// 									},
// 				// 								},
// 				// 								{
// 				// 									lc: 1,
// 				// 									type: 'constructor',
// 				// 									id: ['langchain', 'schema', 'HumanMessage'],
// 				// 									kwargs: {
// 				// 										content:
// 				// 											'TOOLS\n------\nAssistant can ask the user to use tools to look up information that may be helpful in answering the users original question. The tools the human can use are:\n\n\n\nRESPONSE FORMAT INSTRUCTIONS\n----------------------------\n\nOutput a JSON markdown code snippet containing a valid JSON object in one of two formats:\n\n**Option 1:**\nUse this if you want the human to use a tool.\nMarkdown code snippet formatted in the following schema:\n\n```json\n{\n    "action": string, // The action to take. Must be one of []\n    "action_input": string // The input to the action. May be a stringified object.\n}\n```\n\n**Option #2:**\nUse this if you want to respond directly and conversationally to the human. Markdown code snippet formatted in the following schema:\n\n```json\n{\n    "action": "Final Answer",\n    "action_input": string // You should put what you want to return to use here and make sure to use valid json newline characters.\n}\n```\n\nFor both options, remember to always include the surrounding markdown code snippet delimiters (begin with "```json" and end with "```")!\n\n\nUSER\'S INPUT\n--------------------\nHere is the user\'s input (remember to respond with a markdown code snippet of a json blob with a single action, and NOTHING else):\n\nHello!',
// 				// 										additional_kwargs: {},
// 				// 									},
// 				// 								},
// 				// 							],
// 				// 							options: { stop: ['Observation:'], promptIndex: 0 },
// 				// 						},
// 				// 					},
// 				// 				],
// 				// 			],
// 				// 		},
// 				// 	},
// 				// ],
// 				// Agent: [
// 				// 	{
// 				// 		startTime: 1698057673556,
// 				// 		executionTime: 2803,
// 				// 		source: [{ previousNode: 'On new manual Chat Message' }],
// 				// 		executionStatus: 'success',
// 				// 		data: ,
// 				// 		metadata: { subRun: [{ node: 'OpenAI Chat Model', runIndex: 0 }] },
// 				// 	},
// 				// ],
// 			},
// 			pinData: {},
// 			lastNodeExecuted: 'Agent',
// 		},
// 		executionData: {
// 			contextData: {},
// 			nodeExecutionStack: [],
// 				metadata: { Agent: [{ subRun: [{ node: 'OpenAI Chat Model', runIndex: 0 }] }] },
// 			waitingExecution: {},
// 			waitingExecutionSource: {},
// 		},
// 	},
// 	mode: 'manual',
// 		startedAt: new Date().toISOString(),
// 		stoppedAt: new Date().toISOString(),
// 		status: 'success',
// 		finished: true,
// },
// }
