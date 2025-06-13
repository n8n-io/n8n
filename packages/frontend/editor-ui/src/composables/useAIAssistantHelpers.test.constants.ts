import { VIEWS } from '@/constants';
import type { ChatRequest } from '@/types/assistant.types';
import { NodeConnectionTypes } from 'n8n-workflow';

export const PAYLOAD_SIZE_FOR_1_PASS = 4;
export const PAYLOAD_SIZE_FOR_2_PASSES = 2;

export const ERROR_HELPER_TEST_PAYLOAD: ChatRequest.RequestPayload = {
	payload: {
		role: 'user',
		type: 'init-error-helper',
		user: {
			firstName: 'Milorad',
		},
		error: {
			name: 'NodeOperationError',
			message: "Referenced node doesn't exist",
			description:
				"The node <strong>'Hey'</strong> doesn't exist, but it's used in an expression here.",
		},
		node: {
			position: [0, 0],
			parameters: {
				mode: 'manual',
				duplicateItem: false,
				assignments: {
					assignments: {
						'0': {
							id: '0957fbdb-a021-413b-9d42-fc847666f999',
							name: 'text',
							value: 'Lorem ipsum dolor sit amet',
							type: 'string',
						},
						'1': {
							id: '8efecfa7-8df7-492e-83e7-3d517ad03e60',
							name: 'foo',
							value: {
								value: "={{ $('Hey').json.name }}",
								resolvedExpressionValue: 'Error in expression: "Referenced node doesn\'t exist"',
							},
							type: 'string',
						},
					},
				},
				includeOtherFields: false,
				options: {},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			id: '6dc70bf3-ba54-4481-b9f5-ce255bdd5fb8',
			name: 'This is fine',
		},
		executionSchema: [],
	},
};

export const SUPPORT_CHAT_TEST_PAYLOAD: ChatRequest.RequestPayload = {
	payload: {
		role: 'user',
		type: 'init-support-chat',
		user: {
			firstName: 'Milorad',
		},
		context: {
			currentView: {
				name: VIEWS.WORKFLOW,
				description:
					'The user is currently looking at the current workflow in n8n editor, without any specific node selected.',
			},
			activeNodeInfo: {
				node: {
					position: [0, 0],
					parameters: {
						mode: 'manual',
						duplicateItem: false,
						assignments: {
							assignments: {
								'0': {
									id: '969e86d0-76de-44f6-b07d-44a8a953f564',
									name: 'name',
									value: {
										value: "={{ $('Edit Fields 2').name }}",
										resolvedExpressionValue:
											'Error in expression: "Referenced node doesn\'t exist"',
									},
									type: 'number',
								},
							},
						},
						includeOtherFields: false,
						options: {},
					},
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					id: '8eac1591-ddc6-4d93-bec7-998cbfe27cc7',
					name: 'Edit Fields1',
				},
				executionStatus: {
					status: 'error',
					error: {
						name: 'NodeOperationError',
						message: "Referenced node doesn't exist",
						stack:
							"NodeOperationError: Referenced node doesn't exist\n    at ExecuteContext.execute (/Users/miloradfilipovic/workspace/n8n/packages/nodes-base/nodes/Set/v2/manual.mode.ts:256:9)\n    at ExecuteContext.execute (/Users/miloradfilipovic/workspace/n8n/packages/nodes-base/nodes/Set/v2/SetV2.node.ts:351:48)\n    at WorkflowExecute.runNode (/Users/miloradfilipovic/workspace/n8n/packages/core/src/execution-engine/workflow-execute.ts:1097:31)\n    at /Users/miloradfilipovic/workspace/n8n/packages/core/src/execution-engine/workflow-execute.ts:1505:38\n    at /Users/miloradfilipovic/workspace/n8n/packages/core/src/execution-engine/workflow-execute.ts:2066:11",
					},
				},
				referencedNodes: [],
			},
			currentWorkflow: {
				name: '🧪 Assistant context test',
				active: false,
				connections: {
					'When clicking ‘Execute workflow’': {
						main: [
							[
								{
									node: 'Edit Fields',
									type: NodeConnectionTypes.Main,
									index: 0,
								},
							],
						],
					},
					'Edit Fields': {
						main: [
							[
								{
									node: 'Bad request no chat found',
									type: NodeConnectionTypes.Main,
									index: 0,
								},
								{
									node: 'Slack',
									type: NodeConnectionTypes.Main,
									index: 0,
								},
								{
									node: 'Edit Fields1',
									type: NodeConnectionTypes.Main,
									index: 0,
								},
								{
									node: 'Edit Fields2',
									type: NodeConnectionTypes.Main,
									index: 0,
								},
							],
						],
					},
				},
				nodes: [
					{
						parameters: {
							notice: '',
						},
						id: 'c457ff96-3b0c-4dbc-b47f-dc88396a46ae',
						name: 'When clicking ‘Execute workflow’',
						type: 'n8n-nodes-base.manualTrigger',
						position: [-60, 200],
						typeVersion: 1,
					},
					{
						parameters: {
							resource: 'chat',
							operation: 'get',
							chatId: '13',
						},
						id: '60ddc045-d4e3-4b62-9832-12ecf78937a6',
						name: 'Bad request no chat found',
						type: 'n8n-nodes-base.telegram',
						typeVersion: 1.1,
						position: [540, 0],
						issues: {},
						disabled: true,
					},
					{
						parameters: {
							mode: 'manual',
							duplicateItem: false,
							assignments: {
								assignments: [
									{
										id: '70448b12-9b2b-4bfb-abee-6432c4c58de1',
										name: 'name',
										value: 'Joe',
										type: 'string',
									},
								],
							},
							includeOtherFields: false,
							options: {},
						},
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [200, 200],
						id: '0a831739-13cd-4541-b20b-7db73abbcaf0',
						name: 'Edit Fields',
					},
					{
						parameters: {
							authentication: 'oAuth2',
							resource: 'channel',
							operation: 'archive',
							channelId: {
								__rl: true,
								mode: 'list',
								value: '',
							},
						},
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.2,
						position: [540, 200],
						id: 'aff7471e-b2bc-4274-abe1-97897a17eaa6',
						name: 'Slack',
						webhookId: '7f8b574c-7729-4220-bbe9-bf5aa382406a',
						credentials: {
							slackOAuth2Api: {
								id: 'mZRj4wi3gavIzu9b',
								name: 'Slack account',
							},
						},
						disabled: true,
					},
					{
						parameters: {
							mode: 'manual',
							duplicateItem: false,
							assignments: {
								assignments: [
									{
										id: '969e86d0-76de-44f6-b07d-44a8a953f564',
										name: 'name',
										value: "={{ $('Edit Fields 2').name }}",
										type: 'number',
									},
								],
							},
							includeOtherFields: false,
							options: {},
						},
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [540, 400],
						id: '8eac1591-ddc6-4d93-bec7-998cbfe27cc7',
						name: 'Edit Fields1',
						issues: {
							execution: true,
						},
					},
					{
						parameters: {
							mode: 'manual',
							duplicateItem: false,
							assignments: {
								assignments: [
									{
										id: '9bdfc283-64f7-41c5-9a55-b8d8ccbe3e9d',
										name: 'age',
										value: '={{ $json.name }}',
										type: 'number',
									},
								],
							},
							includeOtherFields: false,
							options: {},
						},
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [440, 560],
						id: '34e56e14-d1a9-4a73-9208-15d39771a9ba',
						name: 'Edit Fields2',
					},
				],
			},
			executionData: {
				runData: {
					'When clicking ‘Execute workflow’': [
						{
							hints: [],
							startTime: 1737540693122,
							executionIndex: 0,
							executionTime: 1,
							source: [],
							executionStatus: 'success',
						},
					],
					'Edit Fields': [
						{
							hints: [],
							startTime: 1737540693124,
							executionIndex: 1,
							executionTime: 2,
							source: [
								{
									previousNode: 'When clicking ‘Execute workflow’',
								},
							],
							executionStatus: 'success',
						},
					],
					'Bad request no chat found': [
						{
							hints: [],
							startTime: 1737540693126,
							executionIndex: 2,
							executionTime: 0,
							source: [
								{
									previousNode: 'Edit Fields',
								},
							],
							executionStatus: 'success',
						},
					],
					Slack: [
						{
							hints: [],
							startTime: 1737540693127,
							executionIndex: 3,
							executionTime: 0,
							source: [
								{
									previousNode: 'Edit Fields',
								},
							],
							executionStatus: 'success',
						},
					],
					'Edit Fields1': [
						{
							hints: [],
							startTime: 1737540693127,
							executionIndex: 4,
							executionTime: 28,
							source: [
								{
									previousNode: 'Edit Fields',
								},
							],
							executionStatus: 'error',
							// @ts-expect-error Incomplete mock objects are expected
							error: {
								level: 'warning',
								tags: {
									packageName: 'workflow',
								},
								context: {
									itemIndex: 0,
									nodeCause: 'Edit Fields 2',
									descriptionKey: 'nodeNotFound',
									parameter: 'assignments',
								},
								functionality: 'regular',
								name: 'NodeOperationError',
								timestamp: 1737540693141,
								node: {
									parameters: {
										mode: 'manual',
										duplicateItem: false,
										assignments: {
											assignments: [
												{
													id: '969e86d0-76de-44f6-b07d-44a8a953f564',
													name: 'name',
													value: "={{ $('Edit Fields 2').name }}",
													type: 'number',
												},
											],
										},
										includeOtherFields: false,
										options: {},
									},
									type: 'n8n-nodes-base.set',
									typeVersion: 3.4,
									position: [540, 400],
									id: '8eac1591-ddc6-4d93-bec7-998cbfe27cc7',
									name: 'Edit Fields1',
								},
								messages: [],
								message: "Referenced node doesn't exist",
								stack:
									"NodeOperationError: Referenced node doesn't exist\n    at ExecuteContext.execute (/Users/miloradfilipovic/workspace/n8n/packages/nodes-base/nodes/Set/v2/manual.mode.ts:256:9)\n    at ExecuteContext.execute (/Users/miloradfilipovic/workspace/n8n/packages/nodes-base/nodes/Set/v2/SetV2.node.ts:351:48)\n    at WorkflowExecute.runNode (/Users/miloradfilipovic/workspace/n8n/packages/core/src/execution-engine/workflow-execute.ts:1097:31)\n    at /Users/miloradfilipovic/workspace/n8n/packages/core/src/execution-engine/workflow-execute.ts:1505:38\n    at /Users/miloradfilipovic/workspace/n8n/packages/core/src/execution-engine/workflow-execute.ts:2066:11",
							},
						},
					],
				},
				// @ts-expect-error Incomplete mock objects are expected
				error: {
					level: 'warning',
					tags: {
						packageName: 'workflow',
					},
					context: {
						itemIndex: 0,
						nodeCause: 'Edit Fields 2',
						descriptionKey: 'nodeNotFound',
						parameter: 'assignments',
					},
					functionality: 'regular',
					name: 'NodeOperationError',
					timestamp: 1737540693141,
					node: {
						parameters: {
							mode: 'manual',
							duplicateItem: false,
							assignments: {
								assignments: [
									{
										id: '969e86d0-76de-44f6-b07d-44a8a953f564',
										name: 'name',
										value: "={{ $('Edit Fields 2').name }}",
										type: 'number',
									},
								],
							},
							includeOtherFields: false,
							options: {},
						},
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [540, 400],
						id: '8eac1591-ddc6-4d93-bec7-998cbfe27cc7',
						name: 'Edit Fields1',
					},
					messages: [],
					message: "Referenced node doesn't exist",
					stack:
						"NodeOperationError: Referenced node doesn't exist\n    at ExecuteContext.execute (/Users/miloradfilipovic/workspace/n8n/packages/nodes-base/nodes/Set/v2/manual.mode.ts:256:9)\n    at ExecuteContext.execute (/Users/miloradfilipovic/workspace/n8n/packages/nodes-base/nodes/Set/v2/SetV2.node.ts:351:48)\n    at WorkflowExecute.runNode (/Users/miloradfilipovic/workspace/n8n/packages/core/src/execution-engine/workflow-execute.ts:1097:31)\n    at /Users/miloradfilipovic/workspace/n8n/packages/core/src/execution-engine/workflow-execute.ts:1505:38\n    at /Users/miloradfilipovic/workspace/n8n/packages/core/src/execution-engine/workflow-execute.ts:2066:11",
				},
				lastNodeExecuted: 'Edit Fields1',
			},
		},
		question: 'Hey',
	},
};
