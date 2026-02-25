/**
 * Chat Setup Handler
 *
 * Handles the setup phase of the chat() method in CodeBuilderAgent.
 * Extracts initialization logic to reduce cyclomatic complexity in chat().
 */

import type {
	BaseChatModel,
	BaseChatModelCallOptions,
} from '@langchain/core/language_models/chat_models';
import type { AIMessage, BaseMessage } from '@langchain/core/messages';
import type { Runnable } from '@langchain/core/runnables';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { Logger } from '@n8n/backend-common';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { TEXT_EDITOR_TOOL, VALIDATE_TOOL, BATCH_STR_REPLACE_TOOL } from '../constants';
import { buildCodeBuilderPrompt, type HistoryContext } from '../prompts';
import { TextEditorHandler } from './text-editor-handler';
import { TextEditorToolHandler } from './text-editor-tool-handler';
import type { TextEditorCommand } from './text-editor.types';
import type { PlanOutput } from '../../types/planning';
import type { ChatPayload } from '../../workflow-builder-agent';
import { formatNodeResult } from '../tools/code-builder-search.tool';
import type { ParseAndValidateResult } from '../types';
import { SDK_IMPORT_STATEMENT } from '../utils/extract-code';
import type { NodeTypeParser } from '../utils/node-type-parser';

/**
 * Parse and validate function type
 */
type ParseAndValidateFn = (
	code: string,
	currentWorkflow?: WorkflowJSON,
) => Promise<ParseAndValidateResult>;

/**
 * Get error context function type
 */
type GetErrorContextFn = (code: string, errorMessage: string) => string;

/**
 * Configuration for ChatSetupHandler
 */
export interface ChatSetupHandlerConfig {
	llm: BaseChatModel;
	tools: StructuredToolInterface[];
	enableTextEditorConfig?: boolean;
	parseAndValidate: ParseAndValidateFn;
	getErrorContext: GetErrorContextFn;
	nodeTypeParser?: NodeTypeParser;
	logger?: Logger;
}

/**
 * Parameters for setup execution
 */
export interface ChatSetupParams {
	payload: ChatPayload;
	historyContext?: HistoryContext;
}

/**
 * Type for LLM with tools bound - matches what AgentIterationHandler expects
 */
export type LlmWithTools = Runnable<BaseMessage[], AIMessage, BaseChatModelCallOptions>;

/**
 * Result of chat setup
 */
export interface ChatSetupResult {
	llmWithTools: LlmWithTools;
	messages: BaseMessage[];
	textEditorEnabled: boolean;
	preGeneratedWorkflowCode?: string;
	currentWorkflow?: WorkflowJSON;
	textEditorHandler?: TextEditorHandler;
	textEditorToolHandler?: TextEditorToolHandler;
}

/**
 * Handles the setup phase of the chat() method.
 *
 * This handler:
 * 1. Determines if text editor should be enabled
 * 2. Pre-generates workflow code for consistency
 * 3. Builds the prompt with workflow context
 * 4. Binds tools to the LLM
 * 5. Formats initial messages
 * 6. Initializes text editor handlers if enabled
 */
export class ChatSetupHandler {
	private llm: BaseChatModel;
	private tools: StructuredToolInterface[];
	private enableTextEditorConfig?: boolean;
	private parseAndValidate: ParseAndValidateFn;
	private getErrorContext: GetErrorContextFn;
	private nodeTypeParser?: NodeTypeParser;
	private logger?: Logger;

	constructor(config: ChatSetupHandlerConfig) {
		this.llm = config.llm;
		this.tools = config.tools;
		this.enableTextEditorConfig = config.enableTextEditorConfig;
		this.parseAndValidate = config.parseAndValidate;
		this.getErrorContext = config.getErrorContext;
		this.nodeTypeParser = config.nodeTypeParser;
		this.logger = config.logger;
	}

	/**
	 * Execute the setup phase of chat().
	 *
	 * @param params - Setup parameters
	 * @returns ChatSetupResult with all initialized components
	 */
	async execute(params: ChatSetupParams): Promise<ChatSetupResult> {
		const { payload, historyContext } = params;
		const currentWorkflow = payload.workflowContext?.currentWorkflow as WorkflowJSON | undefined;

		// Treat empty workflows (no nodes) as no workflow for code context.
		// This forces the agent to use `create` instead of editing pre-populated code.
		const workflowForCodeContext =
			(currentWorkflow?.nodes?.length ?? 0) > 0 ? currentWorkflow : undefined;

		// Pre-generate workflow code for consistency between prompt and text editor
		const preGeneratedWorkflowCode = this.preGenerateWorkflowCode(payload, workflowForCodeContext);

		// Pre-fetch search results for plan's suggestedNodes to save an LLM round-trip
		const preSearchResults = payload.planOutput
			? this.prefetchSearchResults(payload.planOutput)
			: undefined;

		// Check if text editor mode should be enabled
		const textEditorEnabled = this.shouldEnableTextEditor();

		// Build prompt
		const prompt = buildCodeBuilderPrompt(workflowForCodeContext, historyContext, {
			enableTextEditor: textEditorEnabled,
			executionSchema: payload.workflowContext?.executionSchema,
			executionData: payload.workflowContext?.executionData,
			expressionValues: payload.workflowContext?.expressionValues,
			preGeneratedCode: preGeneratedWorkflowCode,
			valuesExcluded: payload.workflowContext?.valuesExcluded,
			pinnedNodes: payload.workflowContext?.pinnedNodes,
			planOutput: payload.planOutput,
			preSearchResults,
		});

		// Bind tools to LLM (exclude get_suggested_nodes when plan provides node suggestions)
		const llmWithTools = this.bindToolsToLlm(textEditorEnabled, !!payload.planOutput);

		// Format initial messages
		const messages = await this.formatInitialMessages(prompt, payload.message);

		// Initialize text editor handlers if enabled
		const { textEditorHandler, textEditorToolHandler } = this.initializeTextEditorHandlers(
			textEditorEnabled,
			preGeneratedWorkflowCode,
		);

		return {
			llmWithTools,
			messages,
			textEditorEnabled,
			preGeneratedWorkflowCode,
			currentWorkflow,
			textEditorHandler,
			textEditorToolHandler,
		};
	}

	/**
	 * Determine whether to enable the text editor tool.
	 * Auto-enables for Claude 4.x models if not explicitly configured.
	 */
	private shouldEnableTextEditor(): boolean {
		if (this.enableTextEditorConfig !== undefined) {
			return this.enableTextEditorConfig;
		}
		// Auto-enable for Claude 4.x models (check model name from LLM)
		const modelName = (this.llm as { modelId?: string }).modelId ?? '';
		return (
			modelName.includes('claude-4') ||
			modelName.includes('opus-4') ||
			modelName.includes('sonnet-4')
		);
	}

	/**
	 * Pre-generate workflow code with execution context
	 */
	private preGenerateWorkflowCode(
		payload: ChatPayload,
		currentWorkflow?: WorkflowJSON,
	): string | undefined {
		if (!currentWorkflow) {
			return undefined;
		}

		return generateWorkflowCode({
			workflow: currentWorkflow,
			executionSchema: payload.workflowContext?.executionSchema,
			executionData: payload.workflowContext?.executionData,
			expressionValues: payload.workflowContext?.expressionValues,
			valuesExcluded: payload.workflowContext?.valuesExcluded,
			pinnedNodes: payload.workflowContext?.pinnedNodes,
		});
	}

	/**
	 * Bind tools to LLM
	 *
	 * @returns LLM with tools bound, typed for use with AgentIterationHandler
	 */
	private bindToolsToLlm(textEditorEnabled: boolean, hasPlanOutput: boolean): LlmWithTools {
		if (!this.llm.bindTools) {
			throw new Error('LLM does not support bindTools - cannot use tools for node discovery');
		}

		// When an approved plan is provided, exclude get_suggested_nodes
		// because the plan already contains curated node suggestions per step
		let tools: Array<
			| StructuredToolInterface
			| typeof TEXT_EDITOR_TOOL
			| typeof VALIDATE_TOOL
			| typeof BATCH_STR_REPLACE_TOOL
		> = hasPlanOutput ? this.tools.filter((t) => t.name !== 'get_suggested_nodes') : this.tools;

		if (textEditorEnabled) {
			tools = [...tools, TEXT_EDITOR_TOOL, VALIDATE_TOOL, BATCH_STR_REPLACE_TOOL];
		}

		return this.llm.bindTools(tools) as LlmWithTools;
	}

	/**
	 * Format initial messages from the prompt
	 */
	private async formatInitialMessages(
		prompt: ReturnType<typeof buildCodeBuilderPrompt>,
		userMessage: string,
	): Promise<BaseMessage[]> {
		const formattedMessages = await prompt.formatMessages({ userMessage });
		return [...formattedMessages];
	}

	/**
	 * Initialize text editor handlers if enabled
	 */
	private initializeTextEditorHandlers(
		textEditorEnabled: boolean,
		preGeneratedWorkflowCode?: string,
	): {
		textEditorHandler?: TextEditorHandler;
		textEditorToolHandler?: TextEditorToolHandler;
	} {
		if (!textEditorEnabled) {
			return {};
		}

		const textEditorHandler = new TextEditorHandler();

		// Create text editor tool handler (wraps the text editor handler)
		const textEditorToolHandler = new TextEditorToolHandler({
			textEditorExecute: (args) => textEditorHandler.execute(args as unknown as TextEditorCommand),
			textEditorGetCode: () => textEditorHandler.getWorkflowCode(),
			parseAndValidate: this.parseAndValidate,
			getErrorContext: this.getErrorContext,
		});

		// Pre-populate with the SAME code that's in the system prompt
		// This ensures str_replace commands match what the LLM sees
		if (preGeneratedWorkflowCode) {
			const codeWithImport = `${SDK_IMPORT_STATEMENT}\n\n${preGeneratedWorkflowCode}`;
			textEditorHandler.setWorkflowCode(codeWithImport);
		}

		return { textEditorHandler, textEditorToolHandler };
	}

	/**
	 * Pre-fetch node info for the plan's suggestedNodes using direct NodeTypeParser lookup.
	 * Returns the formatted result string, or undefined if not applicable.
	 */
	private prefetchSearchResults(plan: PlanOutput): string | undefined {
		const nodeNames = extractNodeNamesFromPlan(plan);
		if (nodeNames.length === 0) return undefined;
		if (!this.nodeTypeParser) {
			this.logger?.warn('nodeTypeParser not available, skipping pre-fetch of plan suggestedNodes');
			return undefined;
		}

		const formattedResults: string[] = [];
		for (const nodeName of nodeNames) {
			const result = formatNodeResult(this.nodeTypeParser, nodeName);
			if (result) {
				formattedResults.push(result);
			}
		}

		if (formattedResults.length === 0) return undefined;

		return `Found ${formattedResults.length} nodes:\n\n${formattedResults.join('\n\n')}`;
	}
}

/**
 * Extract deduplicated full node type names from a plan's suggestedNodes.
 */
export function extractNodeNamesFromPlan(plan: PlanOutput): string[] {
	const nodeSet = new Set<string>();
	for (const step of plan.steps) {
		if (step.suggestedNodes) {
			for (const nodeName of step.suggestedNodes) {
				nodeSet.add(nodeName);
			}
		}
	}
	return [...nodeSet];
}
