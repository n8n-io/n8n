import { isSensitiveKey } from '@n8n/utils/redaction/sensitive-key';
import { SECRET_KEYS, SECRET_VALUE_PATTERNS } from '@n8n/utils/scrub-secrets';
import { z } from 'zod';

import { MAX_TESTED_INPUT_LENGTH } from '../regex';
import type { RawFinding } from '../types';
import {
	collectStringParameters,
	getCheckedNodes,
	getParameter,
	getSetting,
	isExpression,
} from '../workflow-access';
import { defineCatalogueRule } from './define';
import { hostMatchesDomain, hostOf, intersectDomains, isHttpRequestNode } from './http';

const domainListSchema = z.array(z.string().trim().min(1).max(253)).max(500);

export const httpRequestCredential = defineCatalogueRule({
	id: 'http-request-credential',
	category: 'security',
	title: 'HTTP Request uses a credential',
	description: 'HTTP Request nodes authenticate with a stored credential.',
	defaultSeverity: 'block',
	optionsSchema: z.object({ exceptDomains: domainListSchema.default([]) }),
	tightenOptions: (instance, project) => ({
		exceptDomains: intersectDomains(instance.exceptDomains, project.exceptDomains),
	}),
	evaluate(workflow, { exceptDomains }) {
		const findings: RawFinding[] = [];
		for (const node of getCheckedNodes(workflow)) {
			if (!isHttpRequestNode(node)) continue;
			const authentication = getParameter(node, 'authentication');
			// Saved JSON drops parameters that hold their default, so a missing value means `none`.
			if (isExpression(authentication)) continue;
			if (authentication !== undefined && authentication !== 'none') continue;

			const url = getParameter(node, 'url');
			const host = typeof url === 'string' && !isExpression(url) ? hostOf(url) : undefined;
			if (host && exceptDomains.some((domain) => hostMatchesDomain(host, domain))) continue;

			findings.push({
				message: `Node "${node.name}" sends requests without a credential. Choose a credential under Authentication.`,
				params: { node: node.name },
				node,
				parameterPath: 'authentication',
			});
		}
		return findings;
	},
});

export const allowedHttpDomains = defineCatalogueRule({
	id: 'allowed-http-domains',
	category: 'security',
	title: 'Allowed HTTP domains',
	description: 'HTTP Request nodes only call approved domains.',
	defaultSeverity: 'block',
	optionsSchema: z.object({
		domains: domainListSchema.default([]),
		allowExpressions: z.boolean().default(true),
	}),
	validate: ({ domains }) => (domains.length === 0 ? 'Add at least one domain' : undefined),
	tightenOptions: (instance, project) => ({
		domains: intersectDomains(instance.domains, project.domains),
		allowExpressions: instance.allowExpressions && project.allowExpressions,
	}),
	evaluate(workflow, { domains, allowExpressions }) {
		const findings: RawFinding[] = [];
		for (const node of getCheckedNodes(workflow)) {
			if (!isHttpRequestNode(node)) continue;
			const url = getParameter(node, 'url');
			if (isExpression(url)) {
				if (!allowExpressions) {
					findings.push({
						message: `Node "${node.name}" builds its URL with an expression, so its domain cannot be checked.`,
						params: { node: node.name },
						node,
						parameterPath: 'url',
					});
				}
				continue;
			}
			if (typeof url !== 'string') continue;
			const host = hostOf(url);
			if (!host || domains.some((domain) => hostMatchesDomain(host, domain))) continue;
			findings.push({
				message: `Node "${node.name}" calls ${host}, which is not an allowed domain.`,
				params: { node: node.name, host },
				node,
				parameterPath: 'url',
			});
		}
		return findings;
	},
});

// The key-based patterns from `SECRET_VALUE_PATTERNS` match `password: item.pw` in code, so
// they are left out. Key names are judged only where a user typed them, in `{ name, value }` pairs.
const TOKEN_PATTERNS = SECRET_VALUE_PATTERNS.filter(
	(pattern) => !pattern.source.includes(SECRET_KEYS),
).map((pattern) => new RegExp(pattern.source, pattern.flags.replace('g', '')));

const MIN_PAIR_SECRET_LENGTH = 8;

function looksLikeSecret(key: string, value: string, fromPair: boolean): boolean {
	const sample = value.slice(0, MAX_TESTED_INPUT_LENGTH);
	if (TOKEN_PATTERNS.some((pattern) => pattern.test(sample))) return true;
	const trimmed = sample.trim();
	return (
		fromPair &&
		isSensitiveKey(key) &&
		trimmed.length >= MIN_PAIR_SECRET_LENGTH &&
		!/\s/.test(trimmed)
	);
}

export const noHardcodedSecrets = defineCatalogueRule({
	id: 'no-hardcoded-secrets',
	category: 'security',
	title: 'No secrets in parameters',
	description: 'API keys, tokens and passwords live in credentials, not in node parameters.',
	defaultSeverity: 'block',
	optionsSchema: z.object({}),
	evaluate(workflow) {
		const findings: RawFinding[] = [];
		for (const node of getCheckedNodes(workflow)) {
			for (const { path, key, value, fromPair } of collectStringParameters(node)) {
				if (isExpression(value) || !looksLikeSecret(key, value, fromPair)) continue;
				findings.push({
					message: `Node "${node.name}" has what looks like a secret in "${path}". Store it in a credential.`,
					params: { node: node.name, parameter: path },
					node,
					parameterPath: path,
				});
			}
		}
		return findings;
	},
});

const EXECUTE_WORKFLOW_TRIGGER = 'n8n-nodes-base.executeWorkflowTrigger';

export const subWorkflowCallerPolicy = defineCatalogueRule({
	id: 'sub-workflow-caller-policy',
	category: 'security',
	title: 'Sub-workflow callers are limited',
	description:
		'A workflow that other workflows can call does not accept calls from every workflow.',
	defaultSeverity: 'warn',
	optionsSchema: z.object({}),
	evaluate(workflow, _options, ctx) {
		const isCallable = getCheckedNodes(workflow).some(
			(node) => node.type === EXECUTE_WORKFLOW_TRIGGER && node.disabled !== true,
		);
		if (!isCallable) return [];
		const policy =
			getSetting(workflow, 'callerPolicy') ?? ctx.defaults.callerPolicy ?? 'workflowsFromSameOwner';
		if (policy !== 'any') return [];
		return [
			{
				message: 'Any workflow can call this workflow. Limit the callers in the workflow settings.',
				params: {},
			},
		];
	},
});
