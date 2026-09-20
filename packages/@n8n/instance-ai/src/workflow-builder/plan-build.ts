import { NodeSearchEngine } from '@n8n/ai-utilities/node-catalog';
import { z } from 'zod';

import type { InstanceAiNodeService } from '../types';
import { rankOperations, tokenize } from '../workflow-compiler/catalog/retrieval';
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
		.max(60)
		.describe(
			'Use an empty array for a parameter-only edit that keeps the existing node types and operations. Describe the change and preserved behavior in plan. Include steps when node or operation choices are needed.',
		)
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

const MAX_OPERATION_CANDIDATES = 12;

function shortlistCandidates(candidates: Candidate[], query: string): Candidate[] {
	if (candidates.length <= MAX_OPERATION_CANDIDATES) return candidates;
	return rankOperations(
		candidates.map((candidate, index) => ({
			id: String(index).padStart(5, '0'),
			integration: candidate.nodeType.split('.').at(-1) ?? candidate.nodeType,
			keywords: [
				...new Set(
					tokenize(
						[candidate.resource, candidate.operation, candidate.mode, candidate.description]
							.filter(Boolean)
							.join(' ')
							.replace(/[_-]/g, ' '),
					),
				),
			],
			candidate,
		})),
		query.replace(/[_-]/g, ' '),
		{ limit: MAX_OPERATION_CANDIDATES, minScore: 0 },
	).map(({ operation }) => operation.candidate);
}

/** Ground the LLM's plan in installed nodes before it fills parameters and builds the graph. */
export async function decideBuildPlan(
	input: z.infer<typeof buildPlanSchema>,
	nodes: InstanceAiNodeService,
	decisions: DecisionService,
	abortSignal?: AbortSignal,
) {
	abortSignal?.throwIfAborted();
	const engine = new NodeSearchEngine(input.steps.length ? await nodes.listSearchable() : []);
	const searches = new Map<string, Promise<Candidate[]>>();
	const wiring = new Map<
		string,
		{
			nodeType: string;
			version: number;
			inputs: string[];
			outputs: Array<{ index: number; type: string; name?: string }>;
			hint?: string;
		}
	>();
	const candidatesFor = async (search: string) => {
		let pending = searches.get(search);
		if (!pending) {
			const matches = engine.searchByName(search, 4);
			const normalizedSearch = search.trim().toLowerCase();
			const namedMatches = matches.map((node) => ({
				node,
				nameLength: Math.max(
					0,
					...[
						node.name,
						node.name.split('.').at(-1) ?? node.name,
						node.displayName,
						node.displayName.split(' (')[0],
					].map((name) => {
						const normalizedName = name.toLowerCase();
						return normalizedSearch === normalizedName ||
							normalizedSearch.startsWith(`${normalizedName} `)
							? normalizedName.length
							: 0;
					}),
				),
			}));
			const longestName = Math.max(0, ...namedMatches.map(({ nameLength }) => nameLength));
			const exact = namedMatches
				.filter(({ nameLength }) => longestName > 0 && nameLength === longestName)
				.map(({ node }) => node);
			pending = Promise.all(
				(exact.length ? exact : matches).map(async (node): Promise<Candidate[]> => {
					const description = await nodes.getDescription(node.name, node.version, {
						includeGatewayMetadata: false,
					});
					wiring.set(`${node.name}:${node.version}`, {
						nodeType: node.name,
						version: node.version,
						inputs: description.inputs,
						outputs: description.outputs.map((type, index) => ({
							index,
							type,
							name: description.outputNames?.[index],
						})),
						hint: description.builderHint,
					});
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
					const flatOptions = description.properties.flatMap((discriminator) => {
						if (
							(discriminator.name !== 'operation' && discriminator.name !== 'mode') ||
							discriminator.type !== 'options'
						)
							return [];
						const resources = discriminator.displayOptions?.show?.resource?.filter(
							(value): value is string => typeof value === 'string',
						) ?? [undefined];
						return resources.flatMap((resource) =>
							(discriminator.options ?? []).flatMap(({ name, value }) =>
								typeof value === 'string'
									? [
											{
												...base,
												description: `${base.description}. ${name}`,
												...(resource ? { resource } : {}),
												[discriminator.name]: value,
											},
										]
									: [],
							),
						);
					});
					// SDK file names can use aliases. JSON needs the live parameter values.
					return flatOptions.length ? flatOptions : operations?.length ? operations : [base];
				}),
			).then((groups) => groups.flat());
			searches.set(search, pending);
		}
		return await pending;
	};
	const allCandidates = await Promise.all(
		input.steps.map(async ({ search }) => await candidatesFor(search)),
	);
	const candidates = allCandidates.map((options, index) =>
		shortlistCandidates(options, `${input.steps[index].search} ${input.steps[index].intent}`),
	);
	abortSignal?.throwIfAborted();
	const questions: DecisionQuestions = {
		coverage: {
			type: 'noul',
			instructions:
				'Does the detailed plan and its step list cover every behavior in the original request? Check triggers, waits, conditions, data isolation, human decisions, failure handling, and requested integrations. Missing behavior means no. Unspecified credential values do not mean missing behavior. A parameter-only edit may use an empty step list when the plan states the change and preserves the existing behavior.',
		},
		progress: {
			type: 'noul',
			instructions:
				'Does the plan preserve independent progress and recover from failed effects? A successful send or create must precede its completed status. Long human waits must not block unrelated records in a serial loop. Retries must use durable record and event identifiers. Answer yes when these concerns do not apply.',
		},
		scope: {
			type: 'noul',
			instructions:
				'Does the plan scope reads, writes, and human responses to the correct record and authorized person? Do not expose internal feedback to external participants. Do not trust a public identifier as proof of identity. Answer yes when these concerns do not apply. Assess the proposed workflow runtime behavior, not the Assistant action that edits the workflow.',
			criteria: {
				true: 'The proposed workflow behavior has no participant-specific record access or human-response processing, or it verifies identity and limits each such operation to the authorized record. Changing a local constant without changing access or identity also qualifies.',
				false:
					'The proposed workflow trusts caller-supplied identifiers as proof of identity, exposes internal feedback to external participants, or accepts human responses without checking the authorized person and record.',
			},
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
	const entries = Object.entries(questions);
	const batches: DecisionQuestions[] = [];
	if (entries.length <= 12 && candidates.reduce((sum, group) => sum + group.length, 0) <= 48) {
		batches.push(questions);
	} else {
		// Keep quality checks independent so a large operation batch cannot hide them.
		batches.push(Object.fromEntries(entries.slice(0, 3)));
		for (let offset = 3; offset < entries.length; offset += 8) {
			batches.push(Object.fromEntries(entries.slice(offset, offset + 8)));
		}
	}
	const started = performance.now();
	const outcomes = await Promise.all(
		batches.map(
			async (batch) =>
				await decisions.decide({
					name: 'build-plan.operations',
					schemaVersion: 'build-plan-v4',
					state:
						'coverage' in batch
							? input
							: {
									...input,
									steps: input.steps.filter((_, index) => `step_${index}` in batch),
								},
					questions: batch,
					abortSignal,
				}),
		),
	);
	const decisionLatencyMs = Math.round(performance.now() - started);
	const answers = Object.fromEntries(
		outcomes.flatMap((outcome) => (outcome.ok ? Object.entries(outcome.answers) : [])),
	);
	const failures = outcomes.flatMap((outcome) => (outcome.ok ? [] : [outcome.reason]));
	abortSignal?.throwIfAborted();
	const selections = input.steps.map((step, index) => {
		const options = candidates[index];
		const answer = answers[`step_${index}`];
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
			...(selected
				? {}
				: {
						candidates: options,
						candidateCount: allCandidates[index].length,
						candidatesTruncated: allCandidates[index].length > options.length,
					}),
			confidence: choice?.confidence ?? 0,
		};
	});
	const capabilities = new Map<
		string,
		{
			nodeType: string;
			version: number;
			operations: Array<{ resource?: string; operation?: string; mode?: string }>;
		}
	>();
	for (const group of allCandidates) {
		for (const candidate of group) {
			const key = `${candidate.nodeType}:${candidate.version}`;
			const entry = capabilities.get(key) ?? {
				nodeType: candidate.nodeType,
				version: candidate.version,
				operations: [],
			};
			const operation = {
				resource: candidate.resource,
				operation: candidate.operation,
				mode: candidate.mode,
			};
			if (
				(candidate.operation || candidate.mode) &&
				!entry.operations.some(
					(item) =>
						item.resource === operation.resource &&
						item.operation === operation.operation &&
						item.mode === operation.mode,
				)
			) {
				entry.operations.push(operation);
			}
			capabilities.set(key, entry);
		}
	}
	const selectedTypes = new Map(
		selections.flatMap(({ selected }) =>
			selected ? [[JSON.stringify(selected), selected] as const] : [],
		),
	);
	// Supply required fields without accepting an uncertain choice.
	const unresolvedTypes = new Map(
		selections.flatMap(({ selected, candidates: options }, index) => {
			if (selected) return [];
			const answer = answers[`step_${index}`];
			const candidate =
				options?.length === 1
					? options[0]
					: options?.find((_, i) => answer?.type === 'choice' && answer.choice === `option_${i}`);
			if (!candidate) return [];
			const key = JSON.stringify(candidate);
			return selectedTypes.has(key) ? [] : [[key, candidate] as const];
		}),
	);
	const [definitions, candidateDefinitions] = await Promise.all(
		[selectedTypes, unresolvedTypes].map(
			async (types) =>
				await Promise.all(
					[...types.values()].map(async (candidate) => ({
						...candidate,
						definition: await nodes.getNodeTypeDefinition?.(candidate.nodeType, {
							version: String(candidate.version),
							resource: candidate.resource,
							operation: candidate.operation,
							mode: candidate.mode,
						}),
					})),
				),
		),
	);
	abortSignal?.throwIfAborted();
	const coverage = resolveNoul(answers.coverage);
	const checks = Object.fromEntries(
		['coverage', 'progress', 'scope'].map((key) => [key, resolveNoul(answers[key])]),
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
		capabilities: [...capabilities.values()],
		wiring: [...wiring.values()],
		definitions,
		candidateDefinitions,
		decisionLatencyMs,
		decisionStatus: failures.length ? 'incomplete' : 'completed',
		decisionFailures: failures,
		guidance: ready
			? input.steps.length === 0
				? 'Apply the planned parameter edit with build-workflow jsonEdits. Reuse the saved version and node IDs from the workflow read. Use parameterUpdates for a nested value so code preserves the rest of its collection. Keep all unrelated behavior. Use the existing approval and credential setup flow, then verify the changed and alternate paths.'
				: 'Fill parameters from these definitions. Capabilities lists the other installed operations; definitions covers only the selections. Pass nodes, parameters, and named edges in build-workflow graph. Code assembles IDs, positions, groups, and n8n connections. Preserve every planned branch and wait. Use the existing approval and credential setup tools.'
			: 'Resolve every no or uncertain quality check before building. Node matches alone do not pass these checks. Use LLM reasoning for behavior and uncertain selections. candidateDefinitions supplies schemas for unresolved candidates, not accepted choices. Use these required fields if you select that candidate. Choices are limited to ranked installed operations. Check the full capabilities before claiming an operation is unavailable. Retrieve other missing parameter definitions and follow the indexed wiring outputs. Use ask-user only for unresolved human choices. Never ask the user to choose internal node operations. Keep credentials in the existing setup cards.',
	};
}
