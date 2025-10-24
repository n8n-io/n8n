import { getCurrentTaskInput } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { ProgrammaticChecksResult } from '@/validation/types';

import {
	createWorkflow,
	createNode,
	nodeTypes,
	parseToolResult,
	extractProgressMessages,
	findProgressMessage,
	createToolConfigWithWriter,
	createToolConfig,
	setupWorkflowState,
	expectToolSuccess,
	expectToolError,
	type ParsedToolContent,
} from '../../../test/test-utils';
import { createValidateWorkflowTool } from '../validate-workflow.tool';

jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

jest.mock('@/validation/programmatic', () => ({
	programmaticValidation: jest.fn(),
}));

const mockProgrammaticValidation =
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	jest.requireMock('@/validation/programmatic').programmaticValidation as jest.Mock;

describe('validateWorkflow tool', () => {
	const mockGetCurrentTaskInput = getCurrentTaskInput as jest.MockedFunction<
		typeof getCurrentTaskInput
	>;
	let parsedNodeTypes: INodeTypeDescription[];
	let validateWorkflowTool: ReturnType<typeof createValidateWorkflowTool>['tool'];
	let mockLogger: Logger;

	const sampleValidationResult: ProgrammaticChecksResult = {
		connections: [],
		trigger: [],
		agentPrompt: [
			{
				type: 'minor',
				description: 'Agent prompt is missing required expression.',
				pointsDeducted: 5,
			},
		],
		tools: [],
		fromAi: [],
	};

	beforeEach(() => {
		jest.clearAllMocks();

		parsedNodeTypes = [nodeTypes.code, nodeTypes.httpRequest, nodeTypes.webhook];
		mockLogger = mock<Logger>();
		validateWorkflowTool = createValidateWorkflowTool(parsedNodeTypes, mockLogger).tool;
	});

	it('should validate workflow and update state with results', async () => {
		const workflow = createWorkflow([createNode()]);
		setupWorkflowState(mockGetCurrentTaskInput, workflow);

		mockProgrammaticValidation.mockReturnValue(sampleValidationResult);

		const config = createToolConfigWithWriter('validate_workflow', 'call-1');

		const result = await validateWorkflowTool.invoke({}, config);
		const content = parseToolResult<ParsedToolContent>(result);

		expectToolSuccess(content, 'Workflow Validation Summary:');
		expect(content.update.workflowValidation).toEqual(sampleValidationResult);

		const progressMessages = extractProgressMessages(config.writer);
		expect(progressMessages).toHaveLength(3);
		expect(findProgressMessage(progressMessages, 'running', 'input')).toBeDefined();
		expect(findProgressMessage(progressMessages, 'running', 'progress')).toBeDefined();
		expect(findProgressMessage(progressMessages, 'completed')).toBeDefined();

		expect(mockProgrammaticValidation).toHaveBeenCalledWith(
			{ generatedWorkflow: workflow },
			parsedNodeTypes,
		);
	});

	it('should handle evaluation errors gracefully', async () => {
		setupWorkflowState(mockGetCurrentTaskInput, createWorkflow());
		const error = new Error('Evaluation failed');
		mockProgrammaticValidation.mockImplementation(() => {
			throw error;
		});

		const config = createToolConfig('validate_workflow', 'call-3');

		const result = await validateWorkflowTool.invoke({}, config);
		const content = parseToolResult<ParsedToolContent>(result);

		expectToolError(content, /Evaluation failed/);
		expect(mockLogger.warn).toHaveBeenCalledWith('validate_workflow tool failed', {
			error: expect.any(Error),
		});
	});

	it('should return error when critical or major violations exist', async () => {
		const workflow = createWorkflow([createNode()]);
		setupWorkflowState(mockGetCurrentTaskInput, workflow);

		const blockingEvaluation: ProgrammaticChecksResult = {
			...sampleValidationResult,
			connections: [
				{
					type: 'critical',
					description: 'Node HTTP Request is missing required main input.',
					pointsDeducted: 50,
				},
			],
		};

		mockProgrammaticValidation.mockReturnValue(blockingEvaluation);

		const config = createToolConfigWithWriter('validate_workflow', 'call-blocking');

		const result = await validateWorkflowTool.invoke({}, config);
		const content = parseToolResult<ParsedToolContent>(result);

		expectToolError(
			content,
			/Error: Workflow validation failed due to critical or major violations./,
		);
		expect(content.update.workflowValidation).toBeUndefined();

		const progressMessages = extractProgressMessages(config.writer);
		expect(findProgressMessage(progressMessages, 'running', 'input')).toBeDefined();
		expect(findProgressMessage(progressMessages, 'running', 'progress')).toBeDefined();
		const errorMessage = findProgressMessage(progressMessages, 'error');
		expect(errorMessage).toBeDefined();
		expect(errorMessage?.updates[0]?.data).toMatchObject({
			message: expect.stringContaining('Workflow validation failed'),
		});

		expect(mockLogger.warn).toHaveBeenCalledWith(
			'validate_workflow tool detected blocking violations',
			expect.objectContaining({
				violations: expect.arrayContaining([expect.objectContaining({ type: 'critical' })]),
			}),
		);
	});
});
