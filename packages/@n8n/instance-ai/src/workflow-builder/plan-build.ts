import { NodeSearchEngine } from '@n8n/ai-utilities/node-catalog';
import { z } from 'zod';

import type { InstanceAiNodeService } from '../types';
import type { DecisionService } from '../workflow-compiler/decision/decision-service';
import { resolveChoice, resolveNoul } from '../workflow-compiler/decision/policy';
import { NONE_OF_THESE, type DecisionQuestions } from '../workflow-compiler/decision/schemas';

export const buildPlanSchema = z.object({
	originalRequest: z
		.string()
		.min(1)
		.describe('The complete user request, including prior answers.'),
	plan: z
		.string()
		.min(1)
		.describe(
			'Detailed behavior in plain text. Cover triggers, data, conditions, waits, approvals, state changes, and failure paths. Do not write workflow JSON yet.',
		),
	steps: z
		.array(
			z.object({
				id: z.string().min(1),
				intent: z
					.string()
					.min(1)
					.describe(
						'One operation and its required behavior. Split create, update, delete, and lookup into separate steps. Include each control step.',
					),
				search: z
					.string()
					.min(1)
					.describe(
						'Short node or service name to search, such as Gmail, Google Calendar, Wait, or Switch.',
					),
			}),
		)
		.min(1)
		.max(60)
		.refine(
			(steps) => new Set(steps.map(({ id }) => id)).size === steps.length,
			'Use unique step ids.',
		),
});

type Candidate = {
	nodeType: string;
	version: number;
	description: string;
	resource?: string;
	operation?: string;
	mode?: string;
};

/** Ground the LLM's plan in installed nodes before it fills parameters and builds the graph. */
export async function decideBuildPlan(
	input: z.infer<typeof buildPlanSchema>,
	nodes: InstanceAiNodeService,
	decisions: DecisionService,
	abortSignal?: AbortSignal,
) {
	abortSignal?.throwIfAborted();
	const engine = new NodeSearchEngine(await nodes.listSearchable());
	const searches = new Map<string, Promise<Candidate[]>>();
	const candidatesFor = async (search: string) => {
		let pending = searches.get(search);
		if (!pending) {
			pending = Promise.all(
				engine.searchByName(search, 4).map(async (node): Promise<Candidate[]> => {
					const base = {
						nodeType: node.name,
						version: node.version,
						description: `${node.displayName}: ${node.description}`,
					};
					const discriminators = await nodes.listDiscriminators?.(node.name);
					const operations = discriminators?.resources.flatMap((resource) =>
						resource.operations.map((operation) => ({
							...base,
							resource: resource.name,
							operation,
						})),
					);
					if (operations?.length) return operations;
					const description = await nodes.getDescription(node.name, node.version);
					const discriminator = description.properties.find(
						(property) =>
							(property.name === 'operation' || property.name === 'mode') &&
							property.type === 'options' &&
							!property.displayOptions?.show?.resource,
					);
					const flatOptions = discriminator?.options?.flatMap(({ name, value }) =>
						typeof value === 'string'
							? [
									{
										...base,
										description: `${base.description}. ${name}`,
										[discriminator.name]: value,
									},
								]
							: [],
					);
					return flatOptions?.length ? flatOptions : [base];
				}),
			).then((groups) => groups.flat());
			searches.set(search, pending);
		}
		return await pending;
	};
	const candidates = await Promise.all(
		input.steps.map(async ({ search }) => await candidatesFor(search)),
	);
	abortSignal?.throwIfAborted();
	const questions: DecisionQuestions = {
		coverage: {
			type: 'noul',
			instructions:
				'Does the detailed plan and its step list cover every behavior in the original request? Check triggers, waits, conditions, data isolation, human decisions, failure handling, and requested integrations. Missing behavior means no. Unspecified credential values do not mean missing behavior.',
		},
		progress: {
			type: 'noul',
			instructions:
				'Does the plan preserve independent progress and recover from failed effects? A successful send or create must precede its completed status. Long human waits must not block unrelated records in a serial loop. Retries must use durable record and event identifiers. Answer yes when these concerns do not apply.',
		},
		scope: {
			type: 'noul',
			instructions:
				'Does the plan scope reads, writes, and human responses to the correct record and authorized person? Do not expose internal feedback to external participants. Do not trust a public identifier as proof of identity. Answer yes when these concerns do not apply.',
		},
	};
	for (const [index, step] of input.steps.entries()) {
		questions[`step_${index}`] = {
			type: 'choice',
			instructions: `Choose the installed node and operation for this step: ${step.intent}. Choose none_of_these if none implements it.`,
			criteria: {
				...Object.fromEntries(
					candidates[index].map((candidate, i) => [`option_${i}`, JSON.stringify(candidate)]),
				),
				[NONE_OF_THESE]: 'None of these operations implements the required step.',
			},
		};
	}
	const outcome = await decisions.decide({
		name: 'build-plan.operations',
		schemaVersion: 'build-plan-v2',
		state: input,
		questions,
		abortSignal,
	});
	abortSignal?.throwIfAborted();
	const selections = input.steps.map((step, index) => {
		const options = candidates[index];
		const answer = outcome.ok ? outcome.answers[`step_${index}`] : undefined;
		// An unavailable reader is not evidence, even when retrieval found one option.
		const choice = answer
			? resolveChoice({ allowed: options.map((_, i) => `option_${i}`), answer })
			: undefined;
		const selected =
			choice?.status === 'chosen'
				? options.find((_, i) => `option_${i}` === choice.value)
				: undefined;
		return {
			id: step.id,
			intent: step.intent,
			selected,
			...(selected ? {} : { candidates: options }),
			confidence: choice?.confidence ?? 0,
		};
	});
	const selectedTypes = new Map(
		selections.flatMap(({ selected }) =>
			selected
				? [
						[
							JSON.stringify([
								selected.nodeType,
								selected.version,
								selected.resource,
								selected.operation,
								selected.mode,
							]),
							selected,
						] as const,
					]
				: [],
		),
	);
	const definitions = await Promise.all(
		[...selectedTypes.values()].map(async (selected) => ({
			...selected,
			definition: await nodes.getNodeTypeDefinition?.(selected.nodeType, {
				version: String(selected.version),
				resource: selected.resource,
				operation: selected.operation,
				mode: selected.mode,
			}),
		})),
	);
	abortSignal?.throwIfAborted();
	const coverage = resolveNoul(outcome.ok ? outcome.answers.coverage : undefined);
	const checks = Object.fromEntries(
		['coverage', 'progress', 'scope'].map((key) => [
			key,
			resolveNoul(outcome.ok ? outcome.answers[key] : undefined),
		]),
	);
	const ready =
		Object.values(checks).every((check) => check === 'yes') &&
		selections.every(({ selected }) => selected) &&
		definitions.every(({ definition }) => definition?.content && !definition.error);
	return {
		status: ready ? 'ready' : 'needs_reasoning',
		coverage,
		checks,
		selections,
		definitions,
		decisionLatencyMs: outcome.latencyMs,
		guidance: ready
			? 'Fill parameters from these definitions. Build the complete graph. Preserve every planned branch and wait. Use the existing approval and credential setup tools.'
			: 'Use the LLM to resolve missing behavior or uncertain selections. Search installed nodes when needed. Use ask-user only for unresolved human choices. Never ask the user to choose internal node operations. Keep credentials in the existing setup cards.',
	};
}
