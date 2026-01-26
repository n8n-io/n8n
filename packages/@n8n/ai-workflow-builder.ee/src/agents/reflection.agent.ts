/**
 * Reflection Agent
 *
 * Implements the CRITIC pattern for self-reflection on validation failures.
 * Analyzes WHY validation failed (root cause) and suggests specific fixes.
 *
 * Research basis:
 * - CRITIC Framework (arXiv 2305.11738): LLMs validate own outputs with tool interaction
 * - Nature 2025: Self-reflection most effective when external verification available
 * - TACL 2024: Error localization is the bottleneck - models can fix once they know the cause
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';

import { buildReflectionPrompt } from '@/prompts/agents/reflection.prompt';

import type { ReflectionContext, ReflectionResult } from '../types/reflection';

const systemPrompt = ChatPromptTemplate.fromMessages([
	[
		'system',
		[
			{
				type: 'text',
				text: buildReflectionPrompt(),
				cache_control: { type: 'ephemeral' },
			},
		],
	],
	['placeholder', '{messages}'],
]);

/**
 * Schema for reflection output - structured analysis of validation failure
 */
const reflectionOutputSchema = z.object({
	summary: z.string().describe('Brief 1-sentence summary of the validation failure'),
	rootCause: z
		.string()
		.describe('Root cause analysis explaining WHY this happened, not just WHAT failed'),
	category: z
		.enum([
			'missing_connection',
			'wrong_connection_type',
			'missing_subnode',
			'invalid_structure',
			'connection_direction',
			'other',
		])
		.describe('Category of the issue for tracking'),
	suggestedFixes: z
		.array(
			z.object({
				action: z.enum(['add_node', 'add_connection', 'remove_connection', 'reconfigure']),
				targetNodes: z.array(z.string()),
				guidance: z.string(),
			}),
		)
		.describe('Specific fixes to attempt'),
	avoidStrategies: z.array(z.string()).describe('What NOT to try again based on previous attempts'),
});

export interface ReflectionAgentConfig {
	llm: BaseChatModel;
}

/**
 * Reflection Agent
 *
 * Analyzes validation failures to identify root causes and suggest fixes.
 * Uses structured output for consistent, actionable results.
 */
export class ReflectionAgent {
	private llm: BaseChatModel;

	constructor(config: ReflectionAgentConfig) {
		this.llm = config.llm;
	}

	/**
	 * Build context message with violations and workflow state
	 */
	private buildContextMessage(context: ReflectionContext): HumanMessage {
		const parts: string[] = [];

		// 1. Validation violations (the symptoms to analyze)
		parts.push('<validation_failures>');
		for (const v of context.violations) {
			parts.push(`- [${v.type}] ${v.name}: ${v.description}`);
			if (v.metadata) {
				parts.push(`  Metadata: ${JSON.stringify(v.metadata)}`);
			}
		}
		parts.push('</validation_failures>');

		// 2. Current workflow structure
		parts.push('<current_workflow>');
		parts.push(
			`Nodes (${context.workflowJSON.nodes.length}): ${context.workflowJSON.nodes.map((n) => `${n.name} (${n.type})`).join(', ')}`,
		);
		if (Object.keys(context.workflowJSON.connections).length > 0) {
			parts.push(`Connections: ${JSON.stringify(context.workflowJSON.connections, null, 2)}`);
		} else {
			parts.push('Connections: None');
		}
		parts.push('</current_workflow>');

		// 3. Discovery intent (what was supposed to be built)
		if (context.discoveryContext?.nodesFound && context.discoveryContext.nodesFound.length > 0) {
			parts.push('<intended_nodes_from_discovery>');
			for (const node of context.discoveryContext.nodesFound) {
				parts.push(`- ${node.nodeName}: ${node.reasoning}`);
				if (node.connectionChangingParameters.length > 0) {
					parts.push(
						`  Connection-changing params: ${node.connectionChangingParameters.map((p) => p.name).join(', ')}`,
					);
				}
			}
			parts.push('</intended_nodes_from_discovery>');
		}

		// 4. Previous reflection attempts (to avoid repeating)
		if (context.previousReflections.length > 0) {
			parts.push('<previous_reflection_attempts>');
			for (let i = 0; i < context.previousReflections.length; i++) {
				const reflection = context.previousReflections[i];
				parts.push(`Attempt ${i + 1}:`);
				parts.push(`  Issue: ${reflection.summary}`);
				parts.push(`  Root cause: ${reflection.rootCause}`);
				parts.push(
					`  Suggested fixes: ${reflection.suggestedFixes.map((f) => f.guidance).join('; ')}`,
				);
			}
			parts.push('</previous_reflection_attempts>');
		}

		// 5. User request for context
		parts.push('<user_request>');
		parts.push(context.userRequest);
		parts.push('</user_request>');

		return new HumanMessage({ content: parts.join('\n') });
	}

	/**
	 * Analyze validation failures and return reflection result
	 * @param context - Reflection context with violations, workflow, and history
	 * @param config - Optional RunnableConfig for tracing callbacks
	 */
	async invoke(context: ReflectionContext, config?: RunnableConfig): Promise<ReflectionResult> {
		const agent = systemPrompt.pipe<ReflectionResult>(
			this.llm.withStructuredOutput(reflectionOutputSchema, {
				name: 'reflection_analysis',
			}),
		);

		const contextMessage = this.buildContextMessage(context);

		return await agent.invoke({ messages: [contextMessage] }, config);
	}
}
