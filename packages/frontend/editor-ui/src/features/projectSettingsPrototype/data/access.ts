import { CREDENTIAL_TYPES, NODE_TYPES } from './catalog';
import { intBetween, sample, seeded } from './random';
import type { InstanceRule, ProjectAccess } from './types';

/**
 * The instance's node policy. A type that isn't listed is allowed.
 * Restricted: nodes that reach the host. Opt-in: nodes that send data to an
 * AI provider or run code elsewhere, which each project decides on.
 */
export const NODE_RULES: Record<string, InstanceRule> = {
	'execute-command': 'restricted',
	ssh: 'restricted',
	'read-write-file': 'restricted',
	'open-ai': 'opt-in',
	anthropic: 'opt-in',
	'google-gemini': 'opt-in',
	'ai-agent': 'opt-in',
	'aws-lambda': 'opt-in',
};

/** The instance's credential policy. A type that isn't listed is allowed. */
export const CREDENTIAL_RULES: Record<string, InstanceRule> = {
	'ssh-private-key': 'restricted',
	'http-basic-auth': 'restricted',
	aws: 'opt-in',
	'open-ai-api': 'opt-in',
	'anthropic-api': 'opt-in',
};

/**
 * Marketing shows every state without a click: Discord and Telegram are
 * restricted in the project, OpenAI and AI Agent are enabled, and Anthropic,
 * Google Gemini, and AWS Lambda wait for the project to enable them.
 */
const HAND_WRITTEN_ACCESS: Record<string, ProjectAccess> = {
	marketing: {
		restrictedNodes: ['discord', 'telegram'],
		enabledNodes: ['open-ai', 'ai-agent'],
		restrictedCredentials: ['stripe-api'],
		enabledCredentials: ['open-ai-api'],
	},
	engineering: {
		restrictedNodes: [],
		enabledNodes: ['open-ai', 'anthropic', 'ai-agent', 'aws-lambda'],
		restrictedCredentials: [],
		enabledCredentials: ['aws', 'open-ai-api', 'anthropic-api'],
	},
	finance: {
		restrictedNodes: ['discord', 'telegram', 'twilio', 'shopify', 'mailchimp'],
		enabledNodes: [],
		restrictedCredentials: ['mailchimp-api'],
		enabledCredentials: [],
	},
	'customer-success': {
		restrictedNodes: [],
		enabledNodes: ['open-ai', 'ai-agent'],
		restrictedCredentials: [],
		enabledCredentials: ['open-ai-api'],
	},
};

const idsWithRule = (rules: Record<string, InstanceRule>, rule: InstanceRule) =>
	Object.keys(rules).filter((id) => rules[id] === rule);

const OPT_IN_NODES = idsWithRule(NODE_RULES, 'opt-in');
const OPT_IN_CREDENTIALS = idsWithRule(CREDENTIAL_RULES, 'opt-in');
const RESTRICTABLE_NODES = NODE_TYPES.filter(
	(type) => type.category === 'Apps' && !NODE_RULES[type.id],
).map((type) => type.id);
const RESTRICTABLE_CREDENTIALS = CREDENTIAL_TYPES.filter((type) => !CREDENTIAL_RULES[type.id]).map(
	(type) => type.id,
);

/**
 * What a project changed at the start of the session. Of the generated
 * projects, about one in three restricts something and about half enable
 * an opt-in type, so the instance's override lists have real entries.
 */
export function seedAccess(projectId: string): ProjectAccess {
	const written = HAND_WRITTEN_ACCESS[projectId];
	if (written) {
		return {
			restrictedNodes: [...written.restrictedNodes],
			enabledNodes: [...written.enabledNodes],
			restrictedCredentials: [...written.restrictedCredentials],
			enabledCredentials: [...written.enabledCredentials],
		};
	}

	const next = seeded(`access:${projectId}`);
	const access: ProjectAccess = {
		restrictedNodes: [],
		enabledNodes: [],
		restrictedCredentials: [],
		enabledCredentials: [],
	};
	if (next() < 0.32) {
		access.restrictedNodes = sample(next, RESTRICTABLE_NODES, intBetween(next, 1, 4));
	}
	if (next() < 0.5) {
		access.enabledNodes = sample(next, OPT_IN_NODES, intBetween(next, 1, 3));
	}
	if (next() < 0.12) {
		access.restrictedCredentials = sample(next, RESTRICTABLE_CREDENTIALS, intBetween(next, 1, 2));
	}
	if (next() < 0.3) {
		access.enabledCredentials = sample(next, OPT_IN_CREDENTIALS, intBetween(next, 1, 2));
	}
	return access;
}

function usable(
	ids: string[],
	rules: Record<string, InstanceRule>,
	restricted: string[],
	enabled: string[],
): string[] {
	return ids.filter((id) => {
		const rule = rules[id] ?? 'allowed';
		if (rule === 'restricted') return false;
		if (rule === 'opt-in') return enabled.includes(id);
		return !restricted.includes(id);
	});
}

/** Node types the project's seeded workflows may use: nothing a rule blocks. */
export function usableNodeIds(projectId: string): string[] {
	const access = seedAccess(projectId);
	return usable(
		NODE_TYPES.map((type) => type.id),
		NODE_RULES,
		access.restrictedNodes,
		access.enabledNodes,
	);
}

/** Credential types the project's seeded credentials may be of. */
export function usableCredentialIds(projectId: string): string[] {
	const access = seedAccess(projectId);
	return usable(
		CREDENTIAL_TYPES.map((type) => type.id),
		CREDENTIAL_RULES,
		access.restrictedCredentials,
		access.enabledCredentials,
	);
}
