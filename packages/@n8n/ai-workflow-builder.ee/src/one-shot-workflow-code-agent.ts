/**
 * One-Shot Workflow Code Agent
 *
 * Generates complete workflows in a single LLM call using TypeScript SDK format.
 * Replaces the complex multi-agent system with a simpler, faster approach.
 *
 * POC with extensive debug logging for development.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { inspect } from 'node:util';
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
 * Debug logging helper - logs to console with timestamp and prefix
 * Uses util.inspect for terminal-friendly output with full depth
 */
function debugLog(context: string, message: string, data?: Record<string, unknown>): void {
	const timestamp = new Date().toISOString();
	const prefix = `[ONE-SHOT-AGENT][${timestamp}][${context}]`;
	if (data) {
		const formatted = inspect(data, {
			depth: null, // Full depth
			colors: true, // Terminal colors
			maxStringLength: null, // No string truncation
			maxArrayLength: null, // No array truncation
			breakLength: 120, // Line wrap at 120 chars
		});
		console.log(`${prefix} ${message}\n${formatted}`);
	} else {
		console.log(`${prefix} ${message}`);
	}
}

/**
 * Read the SDK types/base.ts source file for the prompt.
 * Resolves the path relative to the workflow-sdk package.
 */
function readSdkSourceFile(): string {
	debugLog('INIT', 'Reading SDK source file...');
	// Resolve path to workflow-sdk package
	const workflowSdkPath = dirname(require.resolve('@n8n/workflow-sdk/package.json'));
	const baseTsPath = join(workflowSdkPath, 'src', 'types', 'base.ts');
	debugLog('INIT', 'SDK source file path', { workflowSdkPath, baseTsPath });
	const content = readFileSync(baseTsPath, 'utf-8');
	debugLog('INIT', 'SDK source file loaded', { contentLength: content.length });
	return content;
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
		debugLog('CONSTRUCTOR', 'Initializing OneShotWorkflowCodeAgent...', {
			nodeTypesCount: config.nodeTypes.length,
			hasLogger: !!config.logger,
		});
		this.llm = config.llm;
		this.nodeTypeParser = new NodeTypeParser(config.nodeTypes);
		this.logger = config.logger;
		this.sdkSourceCode = readSdkSourceFile();
		debugLog('CONSTRUCTOR', 'OneShotWorkflowCodeAgent initialized', {
			sdkSourceCodeLength: this.sdkSourceCode.length,
		});
	}

	/**
	 * Main chat method - generates workflow and streams output
	 */
	async *chat(
		payload: ChatPayload,
		userId: string,
		abortSignal?: AbortSignal,
	): AsyncGenerator<StreamOutput, void, unknown> {
		const startTime = Date.now();
		debugLog('CHAT', '========== STARTING CHAT ==========');
		debugLog('CHAT', 'Input payload', {
			userId,
			messageLength: payload.message.length,
			message: payload.message,
			hasWorkflowContext: !!payload.workflowContext,
			hasCurrentWorkflow: !!payload.workflowContext?.currentWorkflow,
		});

		try {
			this.logger?.debug('One-shot agent starting', {
				userId,
				messageLength: payload.message.length,
			});

			// Stream reasoning message
			debugLog('CHAT', 'Streaming initial "Generating workflow..." message');
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
			debugLog('CHAT', 'Building prompt...');
			const currentWorkflowCode = payload.workflowContext?.currentWorkflow
				? this.workflowToCode(payload.workflowContext.currentWorkflow)
				: undefined;

			if (currentWorkflowCode) {
				debugLog('CHAT', 'Current workflow context provided', {
					currentWorkflowCodeLength: currentWorkflowCode.length,
					currentWorkflowCodePreview: currentWorkflowCode.substring(0, 500),
				});
			}

			const prompt = this.buildPrompt(currentWorkflowCode);
			debugLog('CHAT', 'Prompt built successfully');

			// Bind tools to LLM and structure the output
			debugLog('CHAT', 'Binding tools to LLM...');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const llmWithTools = this.bindTools(this.llm) as any;
			debugLog('CHAT', 'Tools bound to LLM');

			// Structure the output
			debugLog('CHAT', 'Adding structured output to LLM...');
			const structuredLlm =
				llmWithTools.withStructuredOutput?.(WorkflowCodeOutputSchema, {
					name: 'generate_workflow',
				}) ?? llmWithTools;
			debugLog('CHAT', 'Structured output configured', {
				hasWithStructuredOutput: !!llmWithTools.withStructuredOutput,
			});

			// Generate workflow code
			debugLog('CHAT', 'Calling generateWorkflowCode...');
			const llmStartTime = Date.now();
			const result = await this.generateWorkflowCode(
				structuredLlm,
				prompt,
				payload.message,
				abortSignal,
			);
			const llmDuration = Date.now() - llmStartTime;
			debugLog('CHAT', 'LLM generation complete', {
				llmDurationMs: llmDuration,
				reasoningLength: result.reasoning?.length ?? 0,
				workflowCodeLength: result.workflowCode.length,
				warningsCount: result.warnings?.length ?? 0,
			});

			// Stream reasoning
			if (result.reasoning) {
				debugLog('CHAT', 'Streaming reasoning', { reasoning: result.reasoning });
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
			debugLog('CHAT', 'Parsing and validating workflow code...');
			debugLog('CHAT', 'Raw workflow code from LLM:', { workflowCode: result.workflowCode });
			const parseStartTime = Date.now();
			const workflow = await this.parseAndValidate(result.workflowCode);
			const parseDuration = Date.now() - parseStartTime;
			debugLog('CHAT', 'Workflow parsed and validated', {
				parseDurationMs: parseDuration,
				workflowId: workflow.id,
				workflowName: workflow.name,
				nodeCount: workflow.nodes.length,
				nodeTypes: workflow.nodes.map((n) => n.type),
			});

			// Log success
			this.logger?.info('One-shot agent generated workflow', {
				userId,
				nodeCount: workflow.nodes.length,
				warnings: result.warnings?.length || 0,
			});

			// Stream workflow update
			debugLog('CHAT', 'Streaming workflow update');
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
				debugLog('CHAT', 'Streaming warnings', { warnings: result.warnings });
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

			const totalDuration = Date.now() - startTime;
			debugLog('CHAT', '========== CHAT COMPLETE ==========', {
				totalDurationMs: totalDuration,
				llmDurationMs: llmDuration,
				parseDurationMs: parseDuration,
				nodeCount: workflow.nodes.length,
			});
		} catch (error) {
			const totalDuration = Date.now() - startTime;
			debugLog('CHAT', '========== CHAT FAILED ==========', {
				totalDurationMs: totalDuration,
				errorMessage: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
			});

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
		debugLog('BUILD_PROMPT', 'Getting node IDs by category...');
		const nodeIds = this.nodeTypeParser.getNodeIdsByCategory();
		debugLog('BUILD_PROMPT', 'Node IDs retrieved', {
			triggerCount: nodeIds.triggers.length,
			coreCount: nodeIds.core.length,
			aiCount: nodeIds.ai.length,
			otherCount: nodeIds.other.length,
			triggersPreview: nodeIds.triggers.slice(0, 5),
			corePreview: nodeIds.core.slice(0, 5),
			aiPreview: nodeIds.ai.slice(0, 5),
		});
		debugLog('BUILD_PROMPT', 'Building prompt template...', {
			hasCurrentWorkflow: !!currentWorkflow,
			sdkSourceCodeLength: this.sdkSourceCode.length,
		});
		const prompt = buildOneShotGeneratorPrompt(nodeIds, this.sdkSourceCode, currentWorkflow);
		debugLog('BUILD_PROMPT', 'Prompt template built');
		return prompt;
	}

	/**
	 * Bind search and get tools to the LLM
	 */
	private bindTools(llm: BaseChatModel): unknown {
		debugLog('BIND_TOOLS', 'Creating search and get tools...');
		const searchTool = createOneShotNodeSearchTool(this.nodeTypeParser);
		const getTool = createOneShotNodeGetTool();
		debugLog('BIND_TOOLS', 'Tools created', {
			searchToolName: searchTool.name,
			getToolName: getTool.name,
		});

		// bindTools returns a Runnable, not BaseChatModel
		// Check if bindTools exists (it should for ChatAnthropic)
		if (llm.bindTools) {
			debugLog('BIND_TOOLS', 'LLM supports bindTools, binding tools...');
			const result = llm.bindTools([searchTool, getTool]);
			debugLog('BIND_TOOLS', 'Tools bound successfully');
			return result;
		}

		// Fallback if bindTools is not available
		debugLog('BIND_TOOLS', 'WARNING: LLM does not support bindTools, returning LLM without tools');
		return llm;
	}

	/**
	 * Generate workflow code using structured output
	 */
	private async generateWorkflowCode(
		structuredLlm: unknown, // Runnable with structured output
		prompt: unknown,
		userMessage: string,
		abortSignal?: AbortSignal,
	): Promise<WorkflowCodeOutput> {
		debugLog('GENERATE_CODE', 'Formatting messages from prompt template...');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const messages = await (prompt as any).formatMessages({ userMessage });
		debugLog('GENERATE_CODE', 'Messages formatted', {
			messageCount: messages.length,
			messageSizes: messages.map((m: { content: string }) => ({
				role: m.constructor.name,
				contentLength: typeof m.content === 'string' ? m.content.length : 'non-string',
			})),
		});

		// Log first message (system prompt) preview
		if (messages.length > 0 && typeof messages[0].content === 'string') {
			debugLog('GENERATE_CODE', 'System prompt preview (first 1000 chars)', {
				systemPromptPreview: messages[0].content.substring(0, 1000),
			});
		}

		// Log user message
		if (messages.length > 1 && typeof messages[1].content === 'string') {
			debugLog('GENERATE_CODE', 'User message', {
				userMessage: messages[1].content,
			});
		}

		this.logger?.debug('Invoking LLM for workflow generation', {
			messageCount: messages.length,
		});

		debugLog('GENERATE_CODE', 'Invoking LLM...');
		const invokeStartTime = Date.now();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result = await (structuredLlm as any).invoke(messages, { signal: abortSignal });
		const invokeDuration = Date.now() - invokeStartTime;
		debugLog('GENERATE_CODE', 'LLM invocation complete', {
			invokeDurationMs: invokeDuration,
			resultType: typeof result,
			resultKeys: result && typeof result === 'object' ? Object.keys(result) : [],
		});

		// Log raw result
		debugLog('GENERATE_CODE', 'Raw LLM result', { result });

		// The structured output should match our schema
		debugLog('GENERATE_CODE', 'Parsing result with Zod schema...');
		const output = WorkflowCodeOutputSchema.parse(result);
		debugLog('GENERATE_CODE', 'Result parsed successfully', {
			reasoningLength: output.reasoning.length,
			workflowCodeLength: output.workflowCode.length,
			warningsCount: output.warnings?.length ?? 0,
			reasoning: output.reasoning,
			warnings: output.warnings,
		});

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
		debugLog('PARSE_VALIDATE', '========== PARSING WORKFLOW CODE ==========');
		debugLog('PARSE_VALIDATE', 'Input code', {
			codeLength: code.length,
			codePreview: code.substring(0, 500),
			codeEnd: code.substring(Math.max(0, code.length - 500)),
		});

		try {
			// Parse the TypeScript code
			this.logger?.debug('Parsing WorkflowCode', { codeLength: code.length });
			debugLog('PARSE_VALIDATE', 'Calling parseWorkflowCode...');
			const parseStartTime = Date.now();
			const workflow = parseWorkflowCode(code);
			const parseDuration = Date.now() - parseStartTime;

			debugLog('PARSE_VALIDATE', 'Workflow parsed successfully', {
				parseDurationMs: parseDuration,
				workflowId: workflow.id,
				workflowName: workflow.name,
				nodeCount: workflow.nodes.length,
				connectionCount: Object.keys(workflow.connections).length,
			});

			// Log each node
			debugLog('PARSE_VALIDATE', 'Parsed nodes', {
				nodes: workflow.nodes.map((n) => ({
					id: n.id,
					name: n.name,
					type: n.type,
					position: n.position,
					parametersKeys: n.parameters ? Object.keys(n.parameters) : [],
				})),
			});

			// Log connections
			debugLog('PARSE_VALIDATE', 'Parsed connections', {
				connections: workflow.connections,
			});

			this.logger?.debug('Parsed workflow', {
				id: workflow.id,
				name: workflow.name,
				nodeCount: workflow.nodes.length,
			});

			// Validate (but don't fail on warnings)
			debugLog('PARSE_VALIDATE', 'Validating workflow...');
			const validateStartTime = Date.now();
			const validationResult = validateWorkflow(workflow);
			const validateDuration = Date.now() - validateStartTime;

			debugLog('PARSE_VALIDATE', 'Validation complete', {
				validateDurationMs: validateDuration,
				isValid: validationResult.valid,
				errorCount: validationResult.errors.length,
				warningCount: validationResult.warnings.length,
			});

			if (validationResult.errors.length > 0) {
				debugLog('PARSE_VALIDATE', 'VALIDATION ERRORS', {
					errors: validationResult.errors.map((e: { message: string; code?: string }) => ({
						message: e.message,
						code: e.code,
					})),
				});
				this.logger?.warn('Workflow validation errors', {
					errors: validationResult.errors.map((e: { message: string }) => e.message),
				});
			}

			if (validationResult.warnings.length > 0) {
				debugLog('PARSE_VALIDATE', 'VALIDATION WARNINGS', {
					warnings: validationResult.warnings.map((w: { message: string; code?: string }) => ({
						message: w.message,
						code: w.code,
					})),
				});
				this.logger?.info('Workflow validation warnings', {
					warnings: validationResult.warnings.map((w: { message: string }) => w.message),
				});
			}

			// Log full workflow JSON
			debugLog('PARSE_VALIDATE', 'Final workflow JSON', {
				workflow: JSON.stringify(workflow, null, 2),
			});

			debugLog('PARSE_VALIDATE', '========== PARSING COMPLETE ==========');

			// Always return the workflow, even with validation issues
			// The frontend can handle warnings, and errors are often false positives
			return workflow;
		} catch (error) {
			debugLog('PARSE_VALIDATE', '========== PARSING FAILED ==========', {
				errorMessage: error instanceof Error ? error.message : String(error),
				errorStack: error instanceof Error ? error.stack : undefined,
				code: code,
			});

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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private workflowToCode(workflow: Partial<Record<string, unknown>>): string {
		debugLog('WORKFLOW_TO_CODE', 'Converting workflow to code', {
			workflowKeys: Object.keys(workflow),
		});
		// For now, just stringify the workflow
		// In the future, could use generateWorkflowCode from workflow-sdk
		const code = JSON.stringify(workflow, null, 2);
		debugLog('WORKFLOW_TO_CODE', 'Workflow converted', {
			codeLength: code.length,
		});
		return code;
	}
}
