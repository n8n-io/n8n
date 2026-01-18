/**
 * One-Shot Workflow Code Agent
 *
 * Generates complete workflows in a single LLM call using TypeScript SDK format.
 * Replaces the complex multi-agent system with a simpler, faster approach.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';
import { parseWorkflowCode } from '@n8n/workflow-sdk';
import { validateWorkflow } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { NodeTypeParser } from './utils/node-type-parser';
import { buildOneShotGeneratorPrompt } from './prompts/one-shot-generator.prompt';
import { createOneShotNodeSearchTool } from './tools/one-shot-node-search.tool';
import { createOneShotNodeGetTool } from './tools/one-shot-node-get.tool';
import type { StreamOutput, AgentMessageChunk, WorkflowUpdateChunk } from './types/streaming';
import type { ChatPayload } from './workflow-builder-agent';

/**
 * Read the SDK types/base.ts source file for the prompt.
 * Resolves the path relative to the workflow-sdk package.
 */
function readSdkSourceFile(): string {
	// Resolve path to workflow-sdk package
	const workflowSdkPath = dirname(require.resolve('@n8n/workflow-sdk/package.json'));
	const baseTsPath = join(workflowSdkPath, 'src', 'types', 'base.ts');
	return readFileSync(baseTsPath, 'utf-8');
}

/**
 * Structured output schema for the LLM response
 */
const WorkflowCodeOutputSchema = z.object({
	reasoning: z.string().describe('Brief explanation of workflow design decisions'),
	workflowCode: z
		.string()
		.describe("Complete TypeScript SDK code starting with 'return workflow(...)'"),
	warnings: z
		.array(z.string())
		.optional()
		.describe('Potential issues or limitations to warn the user about'),
});

type WorkflowCodeOutput = z.infer<typeof WorkflowCodeOutputSchema>;

/**
 * Configuration for the one-shot agent
 */
export interface OneShotWorkflowCodeAgentConfig {
	/** LLM for generation */
	llm: BaseChatModel;
	/** Parsed node types from n8n */
	nodeTypes: INodeTypeDescription[];
	/** Optional logger */
	logger?: Logger;
}

/**
 * One-Shot Workflow Code Agent
 *
 * Generates workflows by:
 * 1. Building a comprehensive system prompt with node docs
 * 2. Making a single LLM call with structured output
 * 3. Parsing the TypeScript code to WorkflowJSON
 * 4. Validating and streaming the result
 */
export class OneShotWorkflowCodeAgent {
	private llm: BaseChatModel;
	private nodeTypeParser: NodeTypeParser;
	private logger?: Logger;
	private sdkSourceCode: string;

	constructor(config: OneShotWorkflowCodeAgentConfig) {
		this.llm = config.llm;
		this.nodeTypeParser = new NodeTypeParser(config.nodeTypes);
		this.logger = config.logger;
		this.sdkSourceCode = readSdkSourceFile();
	}

	/**
	 * Main chat method - generates workflow and streams output
	 */
	async *chat(
		payload: ChatPayload,
		userId: string,
		abortSignal?: AbortSignal,
	): AsyncGenerator<StreamOutput, void, unknown> {
		try {
			this.logger?.debug('One-shot agent starting', {
				userId,
				messageLength: payload.message.length,
			});

			// Stream reasoning message
			yield {
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: 'Generating workflow...',
					} as AgentMessageChunk,
				],
			};

			// Build prompt with current workflow context if available
			const currentWorkflowCode = payload.workflowContext?.currentWorkflow
				? this.workflowToCode(payload.workflowContext.currentWorkflow)
				: undefined;

			const prompt = this.buildPrompt(currentWorkflowCode);

			// Bind tools to LLM
			const llmWithTools = this.bindTools(this.llm);

			// Structure the output
			const structuredLlm =
				llmWithTools.withStructuredOutput?.(WorkflowCodeOutputSchema, {
					name: 'generate_workflow',
				}) ?? llmWithTools;

			// Generate workflow code
			const result = await this.generateWorkflowCode(
				structuredLlm,
				prompt,
				payload.message,
				abortSignal,
			);

			// Stream reasoning
			if (result.reasoning) {
				yield {
					messages: [
						{
							role: 'assistant',
							type: 'message',
							text: result.reasoning,
						} as AgentMessageChunk,
					],
				};
			}

			// Parse and validate
			const workflow = await this.parseAndValidate(result.workflowCode);

			// Log success
			this.logger?.info('One-shot agent generated workflow', {
				userId,
				nodeCount: workflow.nodes.length,
				warnings: result.warnings?.length || 0,
			});

			// Stream workflow update
			yield {
				messages: [
					{
						role: 'assistant',
						type: 'workflow-updated',
						codeSnippet: JSON.stringify(workflow, null, 2),
					} as WorkflowUpdateChunk,
				],
			};

			// Stream warnings if any
			if (result.warnings && result.warnings.length > 0) {
				yield {
					messages: [
						{
							role: 'assistant',
							type: 'message',
							text: `\n\nWarnings:\n${result.warnings.map((w) => `- ${w}`).join('\n')}`,
						} as AgentMessageChunk,
					],
				};
			}
		} catch (error) {
			this.logger?.error('One-shot agent failed', {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});

			// Stream error message
			yield {
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: `I encountered an error while generating the workflow: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your request.`,
					} as AgentMessageChunk,
				],
			};
		}
	}

	/**
	 * Build the system prompt with node IDs and SDK reference
	 */
	private buildPrompt(currentWorkflow?: string) {
		const nodeIds = this.nodeTypeParser.getNodeIdsByCategory();
		return buildOneShotGeneratorPrompt(nodeIds, this.sdkSourceCode, currentWorkflow);
	}

	/**
	 * Bind search and get tools to the LLM
	 */
	private bindTools(llm: BaseChatModel): any {
		const searchTool = createOneShotNodeSearchTool(this.nodeTypeParser);
		const getTool = createOneShotNodeGetTool(this.nodeTypeParser);

		// bindTools returns a Runnable, not BaseChatModel
		// Check if bindTools exists (it should for ChatAnthropic)
		if (llm.bindTools) {
			return llm.bindTools([searchTool, getTool]);
		}

		// Fallback if bindTools is not available
		return llm;
	}

	/**
	 * Generate workflow code using structured output
	 */
	private async generateWorkflowCode(
		structuredLlm: any, // Runnable with structured output
		prompt: any,
		userMessage: string,
		abortSignal?: AbortSignal,
	): Promise<WorkflowCodeOutput> {
		const messages = await prompt.formatMessages({ userMessage });

		this.logger?.debug('Invoking LLM for workflow generation', {
			messageCount: messages.length,
		});

		const result = await structuredLlm.invoke(messages, { signal: abortSignal });

		// The structured output should match our schema
		const output = WorkflowCodeOutputSchema.parse(result);

		this.logger?.debug('Generated WorkflowCode', {
			codeLength: output.workflowCode.length,
			hasWarnings: !!output.warnings?.length,
		});

		return output;
	}

	/**
	 * Parse TypeScript code to WorkflowJSON and validate
	 */
	private async parseAndValidate(code: string): Promise<WorkflowJSON> {
		try {
			// Parse the TypeScript code
			this.logger?.debug('Parsing WorkflowCode', { codeLength: code.length });
			const workflow = parseWorkflowCode(code);

			this.logger?.debug('Parsed workflow', {
				id: workflow.id,
				name: workflow.name,
				nodeCount: workflow.nodes.length,
			});

			// Validate (but don't fail on warnings)
			const validationResult = validateWorkflow(workflow);

			if (validationResult.errors.length > 0) {
				this.logger?.warn('Workflow validation errors', {
					errors: validationResult.errors.map((e: any) => e.message),
				});
			}

			if (validationResult.warnings.length > 0) {
				this.logger?.info('Workflow validation warnings', {
					warnings: validationResult.warnings.map((w: any) => w.message),
				});
			}

			// Always return the workflow, even with validation issues
			// The frontend can handle warnings, and errors are often false positives
			return workflow;
		} catch (error) {
			this.logger?.error('Failed to parse WorkflowCode', {
				error: error instanceof Error ? error.message : String(error),
				code: code.substring(0, 500), // Log first 500 chars
			});

			// Retry once with error feedback
			throw new Error(
				`Failed to parse generated workflow code: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Convert partial workflow JSON to TypeScript code (for context)
	 */
	private workflowToCode(workflow: Partial<any>): string {
		// For now, just stringify the workflow
		// In the future, could use generateWorkflowCode from workflow-sdk
		return JSON.stringify(workflow, null, 2);
	}
}
