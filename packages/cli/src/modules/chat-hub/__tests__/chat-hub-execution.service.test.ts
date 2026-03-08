import type { Logger } from '@n8n/backend-common';
import type { ExecutionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type { IRun } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { ChatExecutionManager } from '@/chat/chat-execution-manager';
import type { ExecutionService } from '@/executions/execution.service';
import type { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import type { ChatHubExecutionStore } from '../chat-hub-execution-store.service';
import { ChatHubExecutionService } from '../chat-hub-execution.service';
import type { ChatHubWorkflowService } from '../chat-hub-workflow.service';
import type { ChatHubMessageRepository } from '../chat-message.repository';
import type { ChatStreamService } from '../chat-stream.service';

describe('ChatHubExecutionService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const executionService = mock<ExecutionService>();
	const workflowExecutionService = mock<WorkflowExecutionService>();
	const executionRepository = mock<ExecutionRepository>();
	const executionManager = mock<ChatExecutionManager>();
	const activeExecutions = mock<ActiveExecutions>();
	const instanceSettings = mock<InstanceSettings>();
	const chatStreamService = mock<ChatStreamService>();
	const chatHubWorkflowService = mock<ChatHubWorkflowService>();
	const chatHubExecutionStore = mock<ChatHubExecutionStore>();
	const messageRepository = mock<ChatHubMessageRepository>();

	let service: ChatHubExecutionService;

	beforeEach(() => {
		jest.clearAllMocks();

		service = new ChatHubExecutionService(
			logger,
			executionService,
			workflowExecutionService,
			executionRepository,
			executionManager,
			activeExecutions,
			instanceSettings,
			chatStreamService,
			chatHubWorkflowService,
			chatHubExecutionStore,
			messageRepository,
		);
	});

	describe('extractMessage', () => {
		const createRunData = (
			lastNodeExecuted: string | undefined,
			nodeRunData: Record<string, unknown>,
		): IRun =>
			({
				data: {
					resultData: {
						lastNodeExecuted,
						runData: nodeRunData,
					},
				},
			}) as unknown as IRun;

		describe('responseNodes mode', () => {
			it('should return string sendMessage directly', () => {
				const runData = createRunData('TestNode', {
					TestNode: [{ data: { main: [[{ json: {}, sendMessage: 'Hello from node' }]] } }],
				});

				expect(service.extractMessage(runData, 'responseNodes')).toBe('Hello from node');
			});

			it('should parse valid with-buttons object and return JSON string', () => {
				const withButtons = {
					type: 'with-buttons',
					text: 'Please approve',
					blockUserInput: true,
					buttons: [{ text: 'Approve', link: '/approve', type: 'primary' }],
				};
				const runData = createRunData('TestNode', {
					TestNode: [{ data: { main: [[{ json: {}, sendMessage: withButtons }]] } }],
				});

				const result = service.extractMessage(runData, 'responseNodes');
				expect(result).toBe(JSON.stringify(withButtons));
			});

			it('should return empty string when sendMessage is invalid object', () => {
				const invalidObject = { notAValidFormat: true };
				const runData = createRunData('TestNode', {
					TestNode: [{ data: { main: [[{ json: {}, sendMessage: invalidObject }]] } }],
				});

				expect(service.extractMessage(runData, 'responseNodes')).toBe('');
			});

			it('should return empty string when sendMessage is undefined', () => {
				const runData = createRunData('TestNode', {
					TestNode: [{ data: { main: [[{ json: {} }]] } }],
				});

				expect(service.extractMessage(runData, 'responseNodes')).toBe('');
			});

			it('should return empty string when sendMessage is an object missing required fields', () => {
				// Missing buttons array
				const partialWithButtons = {
					type: 'with-buttons',
					text: 'Please approve',
					blockUserInput: true,
				};
				const runData = createRunData('TestNode', {
					TestNode: [{ data: { main: [[{ json: {}, sendMessage: partialWithButtons }]] } }],
				});

				expect(service.extractMessage(runData, 'responseNodes')).toBe('');
			});

			it('should return empty string when buttons array is empty', () => {
				const withEmptyButtons = {
					type: 'with-buttons',
					text: 'Please approve',
					blockUserInput: true,
					buttons: [],
				};
				const runData = createRunData('TestNode', {
					TestNode: [{ data: { main: [[{ json: {}, sendMessage: withEmptyButtons }]] } }],
				});

				expect(service.extractMessage(runData, 'responseNodes')).toBe('');
			});
		});

		describe('lastNode mode', () => {
			it('should return json.output when present', () => {
				const runData = createRunData('TestNode', {
					TestNode: [{ data: { main: [[{ json: { output: 'Output text' } }]] } }],
				});

				expect(service.extractMessage(runData, 'lastNode')).toBe('Output text');
			});

			it('should return json.text when output is absent', () => {
				const runData = createRunData('TestNode', {
					TestNode: [{ data: { main: [[{ json: { text: 'Text content' } }]] } }],
				});

				expect(service.extractMessage(runData, 'lastNode')).toBe('Text content');
			});

			it('should return json.message when output and text are absent', () => {
				const runData = createRunData('TestNode', {
					TestNode: [{ data: { main: [[{ json: { message: 'Message content' } }]] } }],
				});

				expect(service.extractMessage(runData, 'lastNode')).toBe('Message content');
			});

			it('should return empty string when no recognized field present', () => {
				const runData = createRunData('TestNode', {
					TestNode: [{ data: { main: [[{ json: { other: 'value' } }]] } }],
				});

				expect(service.extractMessage(runData, 'lastNode')).toBe('');
			});

			it('should stringify non-string values', () => {
				const runData = createRunData('TestNode', {
					TestNode: [{ data: { main: [[{ json: { output: { nested: 'object' } } }]] } }],
				});

				expect(service.extractMessage(runData, 'lastNode')).toBe('{"nested":"object"}');
			});

			it('should prefer output over text and message', () => {
				const runData = createRunData('TestNode', {
					TestNode: [
						{
							data: {
								main: [[{ json: { output: 'Output wins', text: 'Text', message: 'Message' } }]],
							},
						},
					],
				});

				expect(service.extractMessage(runData, 'lastNode')).toBe('Output wins');
			});

			it('should prefer text over message when output is missing', () => {
				const runData = createRunData('TestNode', {
					TestNode: [{ data: { main: [[{ json: { text: 'Text wins', message: 'Message' } }]] } }],
				});

				expect(service.extractMessage(runData, 'lastNode')).toBe('Text wins');
			});
		});

		describe('branch selection', () => {
			it('should skip empty branches and find first valid entry', () => {
				const runData = createRunData('TestNode', {
					TestNode: [
						{
							data: {
								main: [null, [], [{ json: { output: 'Found in branch 2' } }]],
							},
						},
					],
				});

				expect(service.extractMessage(runData, 'lastNode')).toBe('Found in branch 2');
			});

			it('should skip null branches', () => {
				const runData = createRunData('TestNode', {
					TestNode: [
						{
							data: {
								main: [null, [{ json: { output: 'Found after null' } }]],
							},
						},
					],
				});

				expect(service.extractMessage(runData, 'lastNode')).toBe('Found after null');
			});

			it('should use the last run when multiple runs exist', () => {
				const runData = createRunData('TestNode', {
					TestNode: [
						{ data: { main: [[{ json: { output: 'First run' } }]] } },
						{ data: { main: [[{ json: { output: 'Last run' } }]] } },
					],
				});

				expect(service.extractMessage(runData, 'lastNode')).toBe('Last run');
			});
		});

		describe('AiTool connection type fallback', () => {
			it('should fallback to AiTool connection type when main is undefined', () => {
				const runData = {
					data: {
						resultData: {
							lastNodeExecuted: 'TestNode',
							runData: {
								TestNode: [
									{
										data: {
											[NodeConnectionTypes.AiTool]: [[{ json: { output: 'From AiTool' } }]],
										},
									},
								],
							},
						},
					},
				} as unknown as IRun;

				expect(service.extractMessage(runData, 'lastNode')).toBe('From AiTool');
			});
		});

		describe('edge cases (undefined returns)', () => {
			it('should return undefined when lastNodeExecuted is not a string', () => {
				const runData = {
					data: {
						resultData: {
							lastNodeExecuted: undefined,
							runData: {},
						},
					},
				} as unknown as IRun;

				expect(service.extractMessage(runData, 'lastNode')).toBeUndefined();
			});

			it('should return undefined when nodeRunData is empty', () => {
				const runData = createRunData('TestNode', {});

				expect(service.extractMessage(runData, 'lastNode')).toBeUndefined();
			});

			it('should return undefined when nodeRunData array is empty', () => {
				const runData = createRunData('TestNode', { TestNode: [] });

				expect(service.extractMessage(runData, 'lastNode')).toBeUndefined();
			});

			it('should return undefined when no output data exists', () => {
				const runData = createRunData('TestNode', {
					TestNode: [{ data: { main: [] } }],
				});

				expect(service.extractMessage(runData, 'lastNode')).toBeUndefined();
			});
		});
	});

	describe('extractErrorMessage', () => {
		it('should return error description when present', () => {
			const runData = {
				data: {
					resultData: {
						error: {
							description: 'Detailed error description',
							message: 'Error message',
						},
					},
				},
			} as unknown as IRun;

			expect(service.extractErrorMessage(runData)).toBe('Detailed error description');
		});

		it('should return error message when description is absent', () => {
			const runData = {
				data: {
					resultData: {
						error: {
							message: 'Error message only',
						},
					},
				},
			} as unknown as IRun;

			expect(service.extractErrorMessage(runData)).toBe('Error message only');
		});

		it('should return undefined when no error exists', () => {
			const runData = {
				data: {
					resultData: {},
				},
			} as unknown as IRun;

			expect(service.extractErrorMessage(runData)).toBeUndefined();
		});
	});
});
