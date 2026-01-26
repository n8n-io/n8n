/**
 * Configurator Reflection Agent
 *
 * Implements the CRITIC pattern for self-reflection on configuration validation failures.
 * Analyzes WHY configuration validation failed and suggests specific fixes.
 *
 * Similar to ReflectionAgent but specialized for configuration issues:
 * - Agent prompts (missing system message, static prompts)
 * - Tool parameters (missing $fromAI, static values)
 * - $fromAI usage (used in non-tool nodes)
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';

import { buildConfiguratorReflectionPrompt } from '@/prompts/agents/configurator-reflection.prompt';

import type { ReflectionContext, ReflectionResult } from '../types/reflection';

const systemPrompt = ChatPromptTemplate.fromMessages([
	[
		'system',
		[
			{
				type: 'text',
				text: buildConfiguratorReflectionPrompt(),
				cache_control: { type: 'ephemeral' },
			},
		],
	],
	['placeholder', '{messages}'],
]);

/**
 * Schema for configurator reflection output
 */
const reflectionOutputSchema = z.object({
	summary: z.string().describe('Brief 1-sentence summary of the configuration failure'),
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

export interface ConfiguratorReflectionAgentConfig {
	llm: BaseChatModel;
}

/**
 * Configurator Reflection Agent
 *
 * Analyzes configuration validation failures to identify root causes and suggest fixes.
 * Specialized for parameter configuration issues.
 */
export class ConfiguratorReflectionAgent {
	private llm: BaseChatModel;

	constructor(config: ConfiguratorReflectionAgentConfig) {
		this.llm = config.llm;
	}

	/**
	 * Build context message with violations and workflow state
	 */
	private buildContextMessage(context: ReflectionContext): HumanMessage {
		const parts: string[] = [];

		// 1. Configuration violations (the symptoms to analyze)
		parts.push('<configuration_failures>');
		for (const v of context.violations) {
			parts.push(`- [${v.type}] ${v.name}: ${v.description}`);
			if (v.metadata) {
				parts.push(`  Metadata: ${JSON.stringify(v.metadata)}`);
			}
		}
		parts.push('</configuration_failures>');

		// 2. Current workflow with node parameters
		parts.push('<current_workflow>');
		for (const node of context.workflowJSON.nodes) {
			parts.push(`Node: ${node.name} (${node.type})`);
			if (node.parameters && Object.keys(node.parameters).length > 0) {
				parts.push(`  Parameters: ${JSON.stringify(node.parameters, null, 2)}`);
			} else {
				parts.push('  Parameters: (none configured)');
			}
		}
		parts.push('</current_workflow>');

		// 3. Discovery context (what nodes are supposed to do)
		if (context.discoveryContext?.nodesFound && context.discoveryContext.nodesFound.length > 0) {
			parts.push('<intended_node_purposes>');
			for (const node of context.discoveryContext.nodesFound) {
				parts.push(`- ${node.nodeName}: ${node.reasoning}`);
			}
			parts.push('</intended_node_purposes>');
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
	 * Analyze configuration validation failures and return reflection result
	 * @param context - Reflection context with violations, workflow, and history
	 * @param config - Optional RunnableConfig for tracing callbacks
	 */
	async invoke(context: ReflectionContext, config?: RunnableConfig): Promise<ReflectionResult> {
		const agent = systemPrompt.pipe<ReflectionResult>(
			this.llm.withStructuredOutput(reflectionOutputSchema, {
				name: 'configurator_reflection_analysis',
			}),
		);

		const contextMessage = this.buildContextMessage(context);

		return await agent.invoke({ messages: [contextMessage] }, config);
	}
}
