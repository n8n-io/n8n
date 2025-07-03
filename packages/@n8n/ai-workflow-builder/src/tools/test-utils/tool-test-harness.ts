import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { z } from 'zod';

import type { BaseWorkflowBuilderTool } from '../base/base-tool';
import type { ToolProgressMessage } from '../base/progress-reporter';

/**
 * Mock configuration for testing
 */
export interface MockConfig extends Partial<LangGraphRunnableConfig> {
	writer?: jest.Mock<void, [any]>;
	toolCall?: {
		id: string;
	};
}

/**
 * Type to extract the input schema from a tool
 */
type ExtractToolInput<T> = T extends BaseWorkflowBuilderTool<infer U, any> ? z.infer<U> : never;

/**
 * Test harness for workflow builder tools with type safety
 * @template TTool - The tool type being tested
 */
export class ToolTestHarness<TTool extends BaseWorkflowBuilderTool<any, any>> {
	private mockWriter: jest.Mock<void, [any]>;
	private mockConfig: MockConfig;
	private writtenMessages: any[] = [];
	private nodeTypes: INodeTypeDescription[] = [];

	constructor(private readonly ToolClass: new (nodeTypes: INodeTypeDescription[]) => TTool) {
		this.mockWriter = jest.fn((message) => {
			this.writtenMessages.push(message);
		});

		this.mockConfig = {
			writer: this.mockWriter,
			toolCall: {
				id: 'test-tool-call-id',
			},
		};
	}

	/**
	 * Set up node types for the test
	 */
	withNodeTypes(nodeTypes: INodeTypeDescription[]): this {
		this.nodeTypes = nodeTypes;
		return this;
	}

	/**
	 * Execute the tool with the given input
	 */
	async execute(input: ExtractToolInput<TTool>): Promise<{
		command: any;
		messages: any[];
		success: boolean;
	}> {
		// Create tool instance
		const toolInstance = new this.ToolClass(this.nodeTypes);

		// Create the LangChain tool
		const langChainTool = toolInstance.createLangChainTool();

		// Execute the tool
		await langChainTool.invoke(input, this.mockConfig as any);

		// Return simplified result for testing
		return {
			command: {}, // Would parse from actual command
			messages: this.writtenMessages,
			success: this.getMessagesOfType('completed').length > 0,
		};
	}

	/**
	 * Get all messages written by the tool
	 */
	getWrittenMessages(): any[] {
		return this.writtenMessages;
	}

	/**
	 * Get messages of a specific type
	 */
	getMessagesOfType<T extends ToolProgressMessage['status']>(status: T): ToolProgressMessage[] {
		return this.writtenMessages.filter(
			(msg) => msg.type === 'tool' && msg.status === status,
		) as ToolProgressMessage[];
	}

	/**
	 * Assert that progress messages were written
	 */
	expectProgress(message: string | RegExp): this {
		const progressMessages = this.getMessagesOfType('running');
		const hasMatch = progressMessages.some((msg) =>
			msg.updates.some((update) => {
				if (update.type !== 'progress') return false;
				const data = typeof update.data === 'string' ? update.data : JSON.stringify(update.data);
				return typeof message === 'string' ? data.includes(message) : message.test(data);
			}),
		);

		expect(hasMatch).toBe(true);
		return this;
	}

	/**
	 * Assert that the tool completed successfully
	 */
	expectSuccess(): this {
		const completedMessages = this.getMessagesOfType('completed');
		expect(completedMessages.length).toBeGreaterThan(0);
		return this;
	}

	/**
	 * Assert that the tool reported an error
	 */
	expectError(errorMessage?: string | RegExp): this {
		const errorMessages = this.getMessagesOfType('error');
		expect(errorMessages.length).toBeGreaterThan(0);

		if (errorMessage) {
			const hasMatch = errorMessages.some((msg) =>
				msg.updates.some((update) => {
					if (update.type !== 'error') return false;
					const message = update.data.message;
					return typeof errorMessage === 'string'
						? message.includes(errorMessage)
						: errorMessage.test(message);
				}),
			);
			expect(hasMatch).toBe(true);
		}

		return this;
	}

	/**
	 * Assert that input was captured
	 */
	expectInput<T>(validator?: (input: T) => boolean): this {
		const runningMessages = this.getMessagesOfType('running');
		const inputUpdates = runningMessages.flatMap((msg) =>
			msg.updates.filter((u) => u.type === 'input'),
		);

		expect(inputUpdates.length).toBeGreaterThan(0);

		if (validator) {
			const hasValidInput = inputUpdates.some((update) => validator(update.data));
			expect(hasValidInput).toBe(true);
		}

		return this;
	}

	/**
	 * Assert output data
	 */
	expectOutput<T>(validator: (output: T) => boolean): this {
		const completedMessages = this.getMessagesOfType('completed');
		const outputUpdates = completedMessages.flatMap((msg) =>
			msg.updates.filter((u) => u.type === 'output'),
		);

		expect(outputUpdates.length).toBeGreaterThan(0);

		const hasValidOutput = outputUpdates.some((update) => validator(update.data));
		expect(hasValidOutput).toBe(true);

		return this;
	}

	/**
	 * Reset the harness for a new test
	 */
	reset(): this {
		this.writtenMessages = [];
		this.mockWriter.mockClear();
		return this;
	}

	/**
	 * Get mock writer for custom assertions
	 */
	getMockWriter(): jest.Mock<void, [any]> {
		return this.mockWriter;
	}
}
