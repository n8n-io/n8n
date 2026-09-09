import type { SuspensionInfo } from '../../../src/utils/stream-helpers';
import { discoveryTestCaseSchema } from '../../data/discovery';
import {
	buildConfirmationPolicy,
	resolveConfirmation,
	unmatchedConfirmations,
} from '../confirmation-policy';
import { credentialAutoSetupResponder } from '../credential-approval';
import { createMcpConnectResponder, createStubMcpRegistry } from '../stub-mcp-registry';
import type { DiscoveryTestCase } from '../types';

function scenario(overrides: Partial<DiscoveryTestCase> = {}): DiscoveryTestCase {
	return {
		id: 'test',
		userMessage: 'do the thing',
		expectedToolInvocations: { anyOf: ['mcp-servers'] },
		...overrides,
	};
}

function suspension(
	toolName: string,
	suspendPayload: Record<string, unknown> = {},
): SuspensionInfo {
	return { toolCallId: 'call-1', requestId: 'req-1', toolName, suspendPayload };
}

const connectPayload = {
	mcpConnectRequest: { servers: [{ serverSlug: 'notion' }, { serverSlug: 'linear' }] },
};

const credentialPayload = {
	credentialRequests: [{ credentialType: 'slackOAuth2Api' }],
};

function mcpResponders() {
	const registry = createStubMcpRegistry({ registry: ['notion', 'linear'], connected: [] });
	return { registry, responders: [createMcpConnectResponder(registry)] };
}

describe('buildConfirmationPolicy', () => {
	it('is empty when the scenario declares nothing', () => {
		expect(buildConfirmationPolicy(scenario()).size).toBe(0);
	});

	it('normalizes a bare decision into an answer', () => {
		const policy = buildConfirmationPolicy(scenario({ confirmations: { 'mcp-servers': 'deny' } }));
		expect(policy.get('mcp-servers')).toEqual({ decision: 'deny' });
	});

	it('keeps an answer object as declared', () => {
		const answer = { decision: 'approve' as const, resumeWith: { connectedSlugs: ['notion'] } };
		const policy = buildConfirmationPolicy(scenario({ confirmations: { 'mcp-servers': answer } }));
		expect(policy.get('mcp-servers')).toEqual(answer);
	});
});

describe('resolveConfirmation', () => {
	const empty = buildConfirmationPolicy(scenario());

	it('approves a suspension no policy entry covers', () => {
		expect(resolveConfirmation(suspension('some-tool'), empty)).toEqual({ approved: true });
	});

	it('approves when the suspension is unknown', () => {
		expect(resolveConfirmation(undefined, empty)).toEqual({ approved: true });
	});

	it('denies when the scenario says so', async () => {
		const policy = buildConfirmationPolicy(scenario({ confirmations: { 'mcp-servers': 'deny' } }));
		const { responders, registry } = mcpResponders();
		expect(
			resolveConfirmation(suspension('mcp-servers', connectPayload), policy, responders),
		).toEqual({ approved: false });
		await expect(registry.service.listConnections()).resolves.toEqual([]);
	});

	it('denies an mcp tool call by its prefixed name', () => {
		const policy = buildConfirmationPolicy(
			scenario({ confirmations: { 'mcp_notion_notion-search': 'deny' } }),
		);
		const approval = { type: 'approval', toolName: 'mcp_notion_notion-search', args: {} };
		expect(resolveConfirmation(suspension('mcp_notion_notion-search', approval), policy)).toEqual({
			approved: false,
		});
		expect(resolveConfirmation(suspension('mcp_linear_list_issues', approval), policy)).toEqual({
			approved: true,
		});
	});

	it('falls back to the tool name the approval gate echoes into the payload', () => {
		const policy = buildConfirmationPolicy(
			scenario({ confirmations: { 'mcp_notion_notion-search': 'deny' } }),
		);
		const gated: SuspensionInfo = {
			toolCallId: 'call-1',
			requestId: 'req-1',
			suspendPayload: { type: 'approval', toolName: 'mcp_notion_notion-search', args: {} },
		};
		expect(resolveConfirmation(gated, policy)).toEqual({ approved: false });
	});

	it('takes the first responder that recognises the payload', () => {
		const { responders } = mcpResponders();
		const all = [credentialAutoSetupResponder, ...responders];
		expect(resolveConfirmation(suspension('mcp-servers', connectPayload), empty, all)).toEqual({
			approved: true,
			connectedSlugs: ['notion', 'linear'],
		});
		expect(resolveConfirmation(suspension('credentials', credentialPayload), empty, all)).toEqual({
			approved: true,
			autoSetup: { credentialType: 'slackOAuth2Api' },
		});
	});

	it('lets the scenario override responder fields without losing their side effects', async () => {
		const { registry, responders } = mcpResponders();
		const policy = buildConfirmationPolicy(
			scenario({
				confirmations: {
					'mcp-servers': { decision: 'approve', resumeWith: { connectedSlugs: ['notion'] } },
				},
			}),
		);
		expect(
			resolveConfirmation(suspension('mcp-servers', connectPayload), policy, responders),
		).toEqual({ approved: true, connectedSlugs: ['notion'] });
		await expect(registry.service.listConnections()).resolves.toEqual([
			{ slug: 'notion' },
			{ slug: 'linear' },
		]);
	});

	it('keeps a deny denied even when resumeWith claims approval', () => {
		const policy = buildConfirmationPolicy(
			scenario({
				confirmations: { 'mcp-servers': { decision: 'deny', resumeWith: { approved: true } } },
			}),
		);
		const { responders } = mcpResponders();
		expect(
			resolveConfirmation(suspension('mcp-servers', connectPayload), policy, responders),
		).toEqual({ approved: false });
	});

	it('keeps an approve approved even when resumeWith claims refusal', () => {
		const policy = buildConfirmationPolicy(
			scenario({
				confirmations: { 'ask-user': { decision: 'approve', resumeWith: { approved: false } } },
			}),
		);
		expect(resolveConfirmation(suspension('ask-user'), policy)).toEqual({ approved: true });
	});

	it('carries resumeWith when no responder recognises the payload', () => {
		const policy = buildConfirmationPolicy(
			scenario({
				confirmations: { 'ask-user': { decision: 'approve', resumeWith: { answer: 'yes' } } },
			}),
		);
		expect(resolveConfirmation(suspension('ask-user'), policy)).toEqual({
			approved: true,
			answer: 'yes',
		});
	});
});

describe('unmatchedConfirmations', () => {
	const policy = buildConfirmationPolicy(
		scenario({
			confirmations: {
				'mcp_notion_notion-search': 'deny',
				credentials: { decision: 'approve', resumeWith: { autoSetup: { credentialType: 'x' } } },
			},
		}),
	);

	it('reports every behaviour-changing answer no suspension asked for', () => {
		expect(unmatchedConfirmations(policy, [])).toEqual(['mcp_notion_notion-search', 'credentials']);
	});

	it('reports nothing once each declared tool has suspended', () => {
		const asked = [suspension('mcp_notion_notion-search'), suspension('credentials')];
		expect(unmatchedConfirmations(policy, asked)).toEqual([]);
	});

	it('exempts a bare approve, which only asks for the default', () => {
		const approveOnly = buildConfirmationPolicy(
			scenario({ confirmations: { 'ask-user': 'approve' } }),
		);
		expect(unmatchedConfirmations(approveOnly, [])).toEqual([]);
	});

	it('matches the tool name echoed into the suspend payload', () => {
		const gated: SuspensionInfo = {
			toolCallId: 'call-1',
			requestId: 'req-1',
			suspendPayload: { type: 'approval', toolName: 'mcp_notion_notion-search' },
		};
		expect(unmatchedConfirmations(policy, [gated, suspension('credentials')])).toEqual([]);
	});

	it('ignores suspensions the scenario never declared', () => {
		expect(
			unmatchedConfirmations(buildConfirmationPolicy(scenario()), [suspension('nodes')]),
		).toEqual([]);
	});
});

describe('credentialAutoSetupResponder', () => {
	it('requests browser auto-setup for the first credential', () => {
		expect(credentialAutoSetupResponder(credentialPayload)).toEqual({
			autoSetup: { credentialType: 'slackOAuth2Api' },
		});
	});

	it.each([
		['a payload with no credential requests', {}],
		['an empty request list', { credentialRequests: [] }],
		['a request with no credential type', { credentialRequests: [{}] }],
	])('passes on %s', (_label, payload) => {
		expect(credentialAutoSetupResponder(payload)).toBeUndefined();
	});
});

describe('createMcpConnectResponder', () => {
	it('marks the offered slugs live on the registry', async () => {
		const { registry, responders } = mcpResponders();
		expect(responders[0](connectPayload)).toEqual({ connectedSlugs: ['notion', 'linear'] });
		await expect(registry.service.listConnections()).resolves.toEqual([
			{ slug: 'notion' },
			{ slug: 'linear' },
		]);
	});

	it('passes on a payload carrying no connect request', () => {
		const { responders } = mcpResponders();
		expect(responders[0]({ credentialRequests: [] })).toBeUndefined();
	});
});

describe('discoveryTestCaseSchema', () => {
	const base = { id: 'x', userMessage: 'y', expectedToolInvocations: { anyOf: ['a'] } };

	it.each([
		['a bare decision', { 'mcp-servers': 'deny' }],
		['an answer object', { 'mcp-servers': { decision: 'approve' } }],
		['an answer with resume data', { credentials: { decision: 'approve', resumeWith: { a: 1 } } }],
	])('accepts %s', (_label, confirmations) => {
		expect(discoveryTestCaseSchema.safeParse({ ...base, confirmations }).success).toBe(true);
	});

	it.each([
		['an unknown decision', { confirmations: { 'mcp-servers': 'maybe' } }],
		['an empty map', { confirmations: {} }],
		['a missing decision', { confirmations: { 'mcp-servers': { resumeWith: { a: 1 } } } }],
		[
			'an empty resumeWith',
			{ confirmations: { 'mcp-servers': { decision: 'approve', resumeWith: {} } } },
		],
		['a misspelled key', { confirmation: { 'mcp-servers': 'deny' } }],
		[
			'a resumeWith setting the reserved `approved` field',
			{ confirmations: { 'mcp-servers': { decision: 'deny', resumeWith: { approved: true } } } },
		],
	])('rejects %s', (_label, invalid) => {
		expect(discoveryTestCaseSchema.safeParse({ ...base, ...invalid }).success).toBe(false);
	});
});
