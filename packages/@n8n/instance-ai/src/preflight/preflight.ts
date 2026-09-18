/**
 * Opening-turn preflight (spike), built on TypeSafe's Jev decision model.
 *
 * One `systemOne` request answers every question in parallel: which builder
 * skill the request needs, which candidate nodes it actually uses, and which
 * stored credential it refers to when several share a type. Jev only answers
 * typed questions, so candidates come from a local fuzzy match of the prompt
 * against the node catalog and Jev prunes them. No chat-model tokens are spent.
 *
 * When confident, the host preloads the skill and hands the orchestrator a
 * `<preflight>` block so the first turns skip `load_skill`, `nodes.search`,
 * `credentials.list` and the node-groups reference read, and call
 * `nodes.type-definition` with correct discriminators on the first try.
 */

import { NodeSearchEngine, type NodeSearchResult } from '@n8n/ai-utilities/node-catalog';
import { NODE_GROUPS_REFERENCE } from '@n8n/workflow-sdk/prompts/sdk-reference';
import type {
	ChoiceQuestion,
	NoulQuestion,
	Question,
	Questions,
	ResultFor,
	SystemOneResult,
} from '@typesafe-ai/sdk';

import type {
	CredentialSummary,
	InstanceAiCredentialService,
	InstanceAiNodeService,
} from '../types';

export type PreflightSkillId = 'workflow-builder' | 'agent-builder';

const INTENT_CRITERIA = {
	workflow_builder: 'Create or change an n8n workflow: an automation with a trigger and nodes',
	agent_builder: 'Create or change a standalone conversational AI agent, not a workflow',
	question: 'A question or request for explanation; nothing is built or changed',
	other: 'Anything else',
} as const;

type IntentChoice = ChoiceQuestion<typeof INTENT_CRITERIA>;

const INTENT_SKILL: Record<keyof typeof INTENT_CRITERIA, PreflightSkillId | undefined> = {
	workflow_builder: 'workflow-builder',
	agent_builder: 'agent-builder',
	question: undefined,
	other: undefined,
};

/** Minimal client shape so tests can stub the SDK. */
export interface PreflightDecisionClient {
	systemOne<const Q extends Questions>(request: {
		state: string;
		questions: Q;
	}): Promise<SystemOneResult<Q>>;
}

export interface PreflightNode {
	node: NodeSearchResult;
	probability: number;
	/** Resource → operations index for split nodes; undefined for flat nodes. */
	discriminators?: Array<{ name: string; operations: string[] }>;
	credentialTypes: string[];
}

export interface PreflightCredentialGroup {
	type: string;
	/** Distinct names; a name may map to several ids when the user has duplicates. */
	names: Array<{ name: string; ids: string[] }>;
	chosenName?: string;
}

export interface PreflightResult {
	skillId: PreflightSkillId;
	intentConfidence: number;
	nodes: PreflightNode[];
	credentials: PreflightCredentialGroup[];
	otherCredentialTypeCount: number;
	/** Rendered `<preflight>` block for the thread context. */
	block: string;
	model: string;
	usage: { inputTokens: number; outputTokens: number };
}

export interface RunPreflightOptions {
	message: string;
	client: PreflightDecisionClient;
	nodeService: InstanceAiNodeService;
	credentialService: InstanceAiCredentialService;
	/** Intent confidence below this skips preflight entirely. */
	intentConfidenceThreshold?: number;
	/** Node `noul` probability required to keep a candidate. */
	nodeProbabilityThreshold?: number;
	/** Credential choice confidence required to name a single credential. */
	credentialConfidenceThreshold?: number;
	maxCandidateNodes?: number;
}

const DEFAULTS = {
	intentConfidenceThreshold: 0.6,
	nodeProbabilityThreshold: 0.7,
	credentialConfidenceThreshold: 0.7,
	maxCandidateNodes: 30,
};

const UNSPECIFIED = 'unspecified';

export async function createJevPreflightClient(): Promise<PreflightDecisionClient | undefined> {
	if (!process.env.TYPESAFE_API_KEY?.trim()) return undefined;
	const { TypeSafeClient } = await import('@typesafe-ai/sdk');
	return new TypeSafeClient();
}

export async function runPreflight(options: RunPreflightOptions): Promise<PreflightResult | null> {
	const cfg = { ...DEFAULTS, ...options };
	const [nodeTypes, credentials] = await Promise.all([
		options.nodeService.listSearchable(),
		options.credentialService.list({}),
	]);

	const candidates = findCandidateNodes(options.message, nodeTypes, cfg.maxCandidateNodes);
	// Credential types the candidates can accept, so Jev only disambiguates
	// credentials that could matter and the block omits the rest.
	const candidateCredentialTypes = await Promise.all(
		candidates.map(async (node) => await getCredentialTypes(options.nodeService, node.name)),
	);
	const relevantTypes = new Set(candidateCredentialTypes.flat());
	const allGroups = groupByType(credentials);
	const relevantGroups = allGroups.filter((group) => relevantTypes.has(group.type));
	const ambiguousGroups = relevantGroups.filter((group) => group.names.length > 1);

	const questions = {
		intent: {
			type: 'choice',
			instructions: 'What does the user ask the n8n assistant to do?',
			criteria: INTENT_CRITERIA,
		} satisfies IntentChoice,
		...Object.fromEntries(
			candidates.map((node, index): [string, NoulQuestion] => [
				`node_${index}`,
				nodeQuestion(node),
			]),
		),
		...Object.fromEntries(
			ambiguousGroups.map((group): [string, ChoiceQuestion] => [
				`cred_${group.type}`,
				{
					type: 'choice',
					instructions: `Which stored "${group.type}" credential does the request refer to? Pick "${UNSPECIFIED}" when the request does not say.`,
					criteria: {
						...Object.fromEntries(
							group.names.map(({ name }) => [name, `Credential named "${name}"`]),
						),
						[UNSPECIFIED]: 'The request does not name or imply a specific one',
					},
				},
			]),
		),
	};

	const result = await options.client.systemOne({ state: options.message, questions });
	const intent = result.answers.intent;
	if (intent.type !== 'choice') return null;
	const skillId = INTENT_SKILL[intent.choice];
	if (!skillId || intent.confidence < cfg.intentConfidenceThreshold) return null;

	// The dynamic question keys are not statically known, so read them through a string index.
	const answers: Record<string, ResultFor<Question> | undefined> = result.answers;

	const kept = candidates
		.map((node, index) => {
			const answer = answers[`node_${index}`];
			return {
				node,
				index,
				probability: answer?.type === 'noul' ? answer.noul : 0,
			};
		})
		.filter(({ node, probability }) => {
			if (probability < cfg.nodeProbabilityThreshold) return false;
			// Agent-only variants are noise for a plain workflow build.
			return skillId === 'agent-builder' || !isAgentOnlyVariant(node.name);
		})
		.sort((a, b) => b.probability - a.probability);

	const nodes: PreflightNode[] = await Promise.all(
		kept.map(async ({ node, index, probability }) => ({
			node,
			probability,
			discriminators: (await options.nodeService.listDiscriminators?.(node.name))?.resources,
			credentialTypes: candidateCredentialTypes[index],
		})),
	);

	// Narrow again to the credential types of nodes that survived Jev.
	const keptTypes = new Set(nodes.flatMap((entry) => entry.credentialTypes));
	const credentialGroups = relevantGroups
		.filter((group) => keptTypes.has(group.type))
		.map((group): PreflightCredentialGroup => {
			if (group.names.length === 1) return { ...group, chosenName: group.names[0].name };
			const answer = answers[`cred_${group.type}`];
			if (
				answer?.type === 'choice' &&
				answer.choice !== UNSPECIFIED &&
				answer.confidence >= cfg.credentialConfidenceThreshold
			) {
				return { ...group, chosenName: answer.choice };
			}
			return group;
		});

	const partial = {
		skillId,
		intentConfidence: intent.confidence,
		nodes,
		credentials: credentialGroups,
		otherCredentialTypeCount: allGroups.length - credentialGroups.length,
		model: result.model,
		usage: { inputTokens: result.usage.input_tokens, outputTokens: result.usage.output_tokens },
	};
	return { ...partial, block: renderPreflightBlock(partial) };
}

const STOP_WORDS = new Set([
	'the',
	'and',
	'for',
	'with',
	'from',
	'into',
	'that',
	'this',
	'when',
	'then',
	'else',
	'our',
	'your',
	'their',
	'them',
	'they',
	'you',
	'use',
	'using',
	'create',
	'send',
	'sends',
	'make',
	'build',
	'new',
	'each',
	'every',
	'all',
	'any',
	'can',
	'cannot',
	'not',
	'should',
	'will',
	'workflow',
	'node',
	'trigger',
	'message',
	'messages',
	'data',
	'team',
	'user',
	'customer',
	'instantly',
	'automatically',
	'also',
	'via',
	'about',
	'against',
	'reply',
	'alert',
]);

/**
 * Ask about the node's role, not its catalog blurb: a trigger is "does the
 * workflow start on an event from X", an action node is "does the workflow
 * act through X". Thin descriptions like "Access WhatsApp API" otherwise
 * score poorly even when the service is central to the request.
 */
function nodeQuestion(node: NodeSearchResult): NoulQuestion {
	const isTrigger = Array.isArray(node.inputs) && node.inputs.length === 0;
	const service = node.displayName.replace(/\s+Trigger$/i, '');
	if (isTrigger) {
		return {
			type: 'noul',
			instructions: `The workflow should start when an event happens in ${service} (n8n node "${node.displayName}": ${node.description})`,
			criteria: {
				true: `An incoming event or message from ${service} is what kicks off the workflow`,
				false: `${service} is not the starting event, or is not involved at all`,
			},
		};
	}
	return {
		type: 'noul',
		instructions: `The workflow should read from, write to, or send something through ${service} (n8n node "${node.displayName}": ${node.description})`,
		criteria: {
			true: `The request sends, creates, reads, updates or looks something up in ${service}, or uses ${service} as its AI model`,
			false: `${service} is not used, or only a similarly named service is`,
		},
	};
}

/** `*Tool` sub-nodes, HITL tools and MCP-registry servers only make sense inside an agent. */
function isAgentOnlyVariant(nodeName: string): boolean {
	return nodeName.endsWith('Tool') || nodeName.startsWith('@n8n/mcp-registry.');
}

/**
 * Local recall step: fuzzy-match every content word and bigram of the prompt
 * against the node catalog. Precision is Jev's job, so this errs wide.
 */
function findCandidateNodes(
	message: string,
	nodeTypes: Awaited<ReturnType<InstanceAiNodeService['listSearchable']>>,
	max: number,
): NodeSearchResult[] {
	const engine = new NodeSearchEngine(nodeTypes);
	const words = message
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
	const terms = new Set<string>(words);
	for (let i = 0; i < words.length - 1; i++) terms.add(`${words[i]} ${words[i + 1]}`);

	const byName = new Map<string, NodeSearchResult>();
	for (const term of terms) {
		for (const hit of engine.searchByName(term, 3)) {
			const existing = byName.get(hit.name);
			if (!existing || hit.score > existing.score) byName.set(hit.name, hit);
		}
	}
	return [...byName.values()].sort((a, b) => b.score - a.score).slice(0, max);
}

async function getCredentialTypes(
	nodeService: InstanceAiNodeService,
	nodeType: string,
): Promise<string[]> {
	try {
		const description = await nodeService.getDescription(nodeType);
		return (description.credentials ?? []).map((credential) => credential.name);
	} catch {
		return [];
	}
}

function groupByType(credentials: CredentialSummary[]): PreflightCredentialGroup[] {
	const byType = new Map<string, Map<string, string[]>>();
	for (const credential of credentials) {
		const names = byType.get(credential.type) ?? new Map<string, string[]>();
		names.set(credential.name, [...(names.get(credential.name) ?? []), credential.id]);
		byType.set(credential.type, names);
	}
	return [...byType.entries()]
		.map(([type, names]) => ({
			type,
			names: [...names.entries()].map(([name, ids]) => ({ name, ids })),
		}))
		.sort((a, b) => a.type.localeCompare(b.type));
}

function renderPreflightBlock(result: Omit<PreflightResult, 'block'>): string {
	const lines: string[] = ['<preflight>'];
	lines.push(
		`The "${result.skillId}" skill is already active (intent confidence ${result.intentConfidence.toFixed(2)}) — do not call load_skill for it.`,
	);

	lines.push('');
	if (result.nodes.length === 0) {
		lines.push('No node shortlist: no catalog node matched the request with confidence.');
	} else {
		lines.push(
			'Nodes the request most likely needs (probability), with the exact resource (operations) discriminators each accepts. Call nodes.type-definition with these discriminators; do not call nodes.search for these services:',
		);
		for (const { node, probability, discriminators, credentialTypes } of result.nodes) {
			lines.push(`- ${node.name} (${node.displayName}) ${probability.toFixed(2)}`);
			if (discriminators?.length) {
				lines.push(
					`  resources: ${discriminators.map((r) => `${r.name} (${r.operations.join(', ')})`).join('; ')}`,
				);
			}
			if (credentialTypes.length) lines.push(`  credentials: ${credentialTypes.join(', ')}`);
		}
	}

	lines.push('');
	if (result.credentials.length === 0) {
		lines.push(
			'Credentials on this instance for these nodes: none. Use newCredential(...) for each.' +
				(result.otherCredentialTypeCount > 0
					? ` (${result.otherCredentialTypeCount} unrelated credential types exist; call credentials.list only if you need one.)`
					: ''),
		);
	} else {
		lines.push(
			'Stored credentials matching these nodes (this replaces credentials.list; call it only for a type not shown):',
		);
		for (const { type, names, chosenName } of result.credentials) {
			const rendered = names.map(({ name, ids }) => `"${name}" (${ids.join(', ')})`).join(', ');
			const suffix =
				names.length > 1
					? chosenName
						? ` ← use "${chosenName}"`
						: ' ← several, request does not say which; pick by name or ask'
					: '';
			lines.push(`- ${type}: ${rendered}${suffix}`);
		}
		if (result.otherCredentialTypeCount > 0) {
			lines.push(
				`(${result.otherCredentialTypeCount} other credential types exist; call credentials.list only if you need one.)`,
			);
		}
	}

	if (result.skillId === 'workflow-builder') {
		lines.push('');
		lines.push(
			'Node groups reference (already read; do not read knowledge-base/reference/node-groups.md):',
		);
		lines.push(NODE_GROUPS_REFERENCE.trim());
	}

	lines.push('</preflight>');
	return lines.join('\n');
}
