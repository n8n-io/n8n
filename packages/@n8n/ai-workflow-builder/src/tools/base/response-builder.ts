import { ToolMessage } from '@langchain/core/messages';
import { Command, type LangGraphRunnableConfig } from '@langchain/langgraph';

import type { ToolError } from './types';
import type { WorkflowState } from '../../workflow-state';

/**
 * Type for state update functions
 */
export type StateUpdater<TState = typeof WorkflowState.State> =
	| Partial<TState>
	| ((state: TState) => Partial<TState>);

/**
 * Builder pattern for creating type-safe tool responses
 * @template TState - The state type (defaults to WorkflowState.State)
 */
export class ResponseBuilder<TState = typeof WorkflowState.State> {
	private message?: string;
	private error?: ToolError;
	private stateUpdates?: StateUpdater<TState>;
	private readonly toolCallId: string | undefined;

	constructor(config: LangGraphRunnableConfig) {
		// @ts-ignore - toolCall exists but not in types
		this.toolCallId = config.toolCall?.id;
	}

	/**
	 * Add a message to the response
	 * @param content - The message content
	 * @returns This builder for chaining
	 */
	withMessage(content: string): this {
		this.message = content;
		return this;
	}

	/**
	 * Add an error to the response
	 * @param error - The error to include
	 * @returns This builder for chaining
	 */
	withError(error: ToolError): this {
		this.error = error;
		this.message = `Error: ${error.message}`;
		return this;
	}

	/**
	 * Add state updates to the response
	 * @param updater - State updates or updater function
	 * @returns This builder for chaining
	 */
	withState(updater?: StateUpdater<TState>): this {
		if (updater) {
			this.stateUpdates = updater;
		}
		return this;
	}

	/**
	 * Build the final Command response
	 * @returns LangGraph Command with all configured options
	 */
	build(): Command {
		const messages: ToolMessage[] = [];

		// Always add a message
		if (this.message || this.error) {
			messages.push(
				new ToolMessage({
					content: this.message || 'Operation completed',
					// @ts-ignore - tool_call_id exists but not in types
					tool_call_id: this.toolCallId,
				}),
			);
		}

		// Build the update object
		const update: any = {
			messages,
		};

		// Add state updates if provided
		if (this.stateUpdates) {
			if (typeof this.stateUpdates === 'function') {
				// For function updaters, we need to apply them in the Command
				// This is a simplified version - in practice, LangGraph handles this
				Object.assign(update, this.stateUpdates);
			} else {
				// Direct state updates
				Object.assign(update, this.stateUpdates);
			}
		}

		return new Command({ update });
	}

	/**
	 * Creates a response builder with workflow JSON updates
	 * @param workflowJSON - The updated workflow JSON
	 * @returns This builder for chaining
	 */
	withWorkflowJSON(workflowJSON: TState extends { workflowJSON: infer W } ? W : never): this {
		return this.withState({ workflowJSON } as any);
	}

	/**
	 * Static factory methods for common responses
	 */
	static success<TState = typeof WorkflowState.State>(
		config: LangGraphRunnableConfig,
		message: string,
		stateUpdates?: StateUpdater<TState>,
	): Command {
		return new ResponseBuilder<TState>(config).withMessage(message).withState(stateUpdates).build();
	}

	static error<TState = typeof WorkflowState.State>(
		config: LangGraphRunnableConfig,
		error: ToolError,
	): Command {
		return new ResponseBuilder<TState>(config).withError(error).build();
	}
}
