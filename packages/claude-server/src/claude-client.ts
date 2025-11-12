import Anthropic from '@anthropic-ai/sdk';
import type { Session, ToolResult, ToolDefinition } from './types';
import { createFileTools } from './tools/file-ops';
import { createBashTool } from './tools/bash';
import { createSearchTools } from './tools/search';

/**
 * Client for interacting with Claude via the Anthropic API.
 * Handles tool execution and conversation management.
 */
export class ClaudeClient {
	private client: Anthropic;
	private model = 'claude-sonnet-4-5-20250929';
	private maxTokens = 8192;

	constructor(apiKey: string) {
		this.client = new Anthropic({ apiKey });
	}

	/**
	 * Sends a message to Claude and handles tool execution automatically.
	 * This is the main method - it orchestrates the entire conversation loop.
	 */
	async sendMessage(
		session: Session,
		userMessage: string,
	): Promise<{ content: string; toolResults: ToolResult[] }> {
		// Add user message to session history
		session.messages.push({
			role: 'user',
			content: userMessage,
		});

		// Set up tools for this session's working directory
		const tools = this.createTools(session.workingDirectory);

		const toolResults: ToolResult[] = [];
		let continueLoop = true;

		// Main conversation loop - Claude may need multiple rounds if it uses tools
		while (continueLoop) {
			const response = await this.client.messages.create({
				model: this.model,
				max_tokens: this.maxTokens,
				messages: session.messages,
				tools: tools.map((tool) => ({
					name: tool.name,
					description: tool.description,
					input_schema: tool.input_schema,
				})),
			});

			// Check if Claude wants to use any tools
			const toolUseBlocks = response.content.filter((block) => block.type === 'tool_use');

			if (toolUseBlocks.length > 0) {
				// Claude wants to use tools - execute them
				const toolResultBlocks = await Promise.all(
					toolUseBlocks.map(async (block) => {
						if (block.type !== 'tool_use') return null;

						const tool = tools.find((t) => t.name === block.name);
						if (!tool) {
							return {
								type: 'tool_result' as const,
								tool_use_id: block.id,
								content: `Error: Tool ${block.name} not found`,
								is_error: true,
							};
						}

						try {
							const output = await tool.execute(block.input);

							// Track this tool use for the response
							toolResults.push({
								toolName: block.name,
								input: block.input,
								output,
								isError: false,
							});

							return {
								type: 'tool_result' as const,
								tool_use_id: block.id,
								content: output,
							};
						} catch (error) {
							const err = error as Error;
							const errorOutput = `Error executing ${block.name}: ${err.message}`;

							toolResults.push({
								toolName: block.name,
								input: block.input,
								output: errorOutput,
								isError: true,
							});

							return {
								type: 'tool_result' as const,
								tool_use_id: block.id,
								content: errorOutput,
								is_error: true,
							};
						}
					}),
				);

				// Add Claude's response (with tool uses) to history
				session.messages.push({
					role: 'assistant',
					content: response.content,
				});

				// Add tool results to history
				session.messages.push({
					role: 'user',
					content: toolResultBlocks.filter((block) => block !== null),
				});

				// Continue loop - Claude will process tool results
				continueLoop = true;
			} else {
				// No tools used - Claude has given a final response
				session.messages.push({
					role: 'assistant',
					content: response.content,
				});

				// Extract text content from response
				const textContent = response.content
					.filter((block) => block.type === 'text')
					.map((block) => (block.type === 'text' ? block.text : ''))
					.join('\n');

				return {
					content: textContent,
					toolResults,
				};
			}
		}

		// Should never reach here, but TypeScript needs this
		throw new Error('Unexpected end of conversation loop');
	}

	/**
	 * Creates tool definitions for a given working directory
	 */
	private createTools(workingDir: string): ToolDefinition[] {
		return [
			...createFileTools(workingDir),
			createBashTool(workingDir),
			...createSearchTools(workingDir),
		];
	}
}
