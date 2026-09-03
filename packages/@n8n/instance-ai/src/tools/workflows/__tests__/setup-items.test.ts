import { instanceAiEventSchema, type InstanceAiEvent } from '@n8n/api-types';

import {
	buildSetupItemsFromAnnouncement,
	buildSetupItemsFromCredentialRequests,
	buildSetupItemsFromSetupRequests,
	createSetupItemsEmitter,
} from '../setup-items';
import type { SetupRequest } from '../setup-workflow.schema';

function makeEmitter() {
	const published: Array<{ threadId: string; event: InstanceAiEvent }> = [];
	const emitter = createSetupItemsEmitter({
		eventBus: { publish: (threadId, event) => published.push({ threadId, event }) },
		threadId: 'thread-1',
		runId: 'run-1',
		agentId: 'orchestrator-run-1',
	});
	return { emitter, published };
}

function setupRequest(overrides: {
	nodeName: string;
	credentialType?: string;
	boundCredential?: { id: string | null; name: string; __aiGatewayManaged?: true };
	credentialNeedsAction?: boolean;
	parameterIssues?: Record<string, string[]>;
	setupHint?: SetupRequest['setupHint'];
}): SetupRequest {
	const credentials =
		overrides.credentialType && overrides.boundCredential
			? {
					[overrides.credentialType]:
						overrides.boundCredential.id === null
							? {
									id: null,
									name: overrides.boundCredential.name,
									__aiGatewayManaged: true as const,
								}
							: { id: overrides.boundCredential.id, name: overrides.boundCredential.name },
				}
			: undefined;
	return {
		node: {
			id: `${overrides.nodeName}-id`,
			name: overrides.nodeName,
			type: 'n8n-nodes-base.slack',
			typeVersion: 2,
			parameters: {},
			position: [0, 0],
			...(credentials ? { credentials } : {}),
		},
		...(overrides.credentialType ? { credentialType: overrides.credentialType } : {}),
		...(overrides.setupHint ? { setupHint: overrides.setupHint } : {}),
		isTrigger: false,
		needsAction:
			overrides.credentialNeedsAction === true || overrides.parameterIssues !== undefined,
		...(overrides.credentialNeedsAction !== undefined
			? { credentialNeedsAction: overrides.credentialNeedsAction }
			: {}),
		...(overrides.parameterIssues ? { parameterIssues: overrides.parameterIssues } : {}),
	};
}

describe('createSetupItemsEmitter', () => {
	it('publishes a durable setup-items snapshot for the workflow', () => {
		const { emitter, published } = makeEmitter();

		const emitted = emitter.emit('wf-1', [
			{ id: 'wf-1:credential:slackApi', kind: 'credential', credentialType: 'slackApi' },
		]);

		expect(emitted).toBe(true);
		expect(published).toHaveLength(1);
		expect(published[0].threadId).toBe('thread-1');
		expect(instanceAiEventSchema.parse(published[0].event)).toEqual({
			type: 'setup-items',
			runId: 'run-1',
			agentId: 'orchestrator-run-1',
			payload: {
				workflowId: 'wf-1',
				items: [{ id: 'wf-1:credential:slackApi', kind: 'credential', credentialType: 'slackApi' }],
			},
		});
	});

	it('skips a snapshot that only reorders the previous one', () => {
		const { emitter, published } = makeEmitter();
		const slack = {
			id: 'wf-1:credential:slackApi',
			kind: 'credential' as const,
			credentialType: 'slackApi',
		};
		const gmail = {
			id: 'wf-1:credential:gmailOAuth2',
			kind: 'credential' as const,
			credentialType: 'gmailOAuth2',
		};

		emitter.emit('wf-1', [slack, gmail]);
		const emitted = emitter.emit('wf-1', [gmail, slack]);

		expect(emitted).toBe(false);
		expect(published).toHaveLength(1);
	});

	it('re-emits when the needed set changes and tracks workflows independently', () => {
		const { emitter, published } = makeEmitter();
		const slack = {
			id: 'wf-1:credential:slackApi',
			kind: 'credential' as const,
			credentialType: 'slackApi',
		};

		emitter.emit('wf-1', [slack]);
		emitter.emit('wf-2', [{ ...slack, id: 'wf-2:credential:slackApi' }]);
		emitter.emit('wf-1', []);

		expect(published.map((entry) => entry.event.payload)).toEqual([
			{ workflowId: 'wf-1', items: [slack] },
			{ workflowId: 'wf-2', items: [{ ...slack, id: 'wf-2:credential:slackApi' }] },
			{ workflowId: 'wf-1', items: [] },
		]);
	});

	it('retries an identical snapshot after a failed publish', () => {
		const published: InstanceAiEvent[] = [];
		let failNext = true;
		const emitter = createSetupItemsEmitter({
			eventBus: {
				publish: (_threadId, event) => {
					if (failNext) {
						failNext = false;
						throw new Error('bus down');
					}
					published.push(event);
				},
			},
			threadId: 'thread-1',
			runId: 'run-1',
			agentId: 'orchestrator-run-1',
		});
		const items = [
			{ id: 'wf-1:credential:slackApi', kind: 'credential' as const, credentialType: 'slackApi' },
		];

		expect(() => emitter.emit('wf-1', items)).toThrow('bus down');
		expect(emitter.emit('wf-1', items)).toBe(true);
		expect(published).toHaveLength(1);
	});

	it('remembers the workflow of the latest emission, even when the snapshot did not change', () => {
		const { emitter } = makeEmitter();
		const slack = {
			id: 'wf-1:credential:slackApi',
			kind: 'credential' as const,
			credentialType: 'slackApi',
		};

		expect(emitter.lastWorkflowId()).toBeUndefined();
		emitter.emit('wf-1', [slack]);
		emitter.emit('wf-2', []);
		expect(emitter.lastWorkflowId()).toBe('wf-2');
		expect(emitter.emit('wf-1', [slack])).toBe(false);
		expect(emitter.lastWorkflowId()).toBe('wf-1');
	});

	it('merges partial announcements into the last snapshot instead of replacing it', () => {
		const { emitter, published } = makeEmitter();
		emitter.emit('wf-1', [
			{
				id: 'wf-1:credential:slackApi',
				kind: 'credential',
				credentialType: 'slackApi',
				nodeBindings: [{ nodeName: 'Send message' }],
			},
			{
				id: 'wf-1:parameters:Send message',
				kind: 'parameters',
				nodeName: 'Send message',
				parameterNames: ['channelId'],
			},
		]);

		emitter.merge('wf-1', [
			{ id: 'wf-1:credential:gmailOAuth2', kind: 'credential', credentialType: 'gmailOAuth2' },
			{
				id: 'wf-1:credential:slackApi',
				kind: 'credential',
				credentialType: 'slackApi',
				reason: 'to post',
			},
		]);

		expect(published).toHaveLength(2);
		const last = published[1].event;
		if (last.type !== 'setup-items') throw new Error('expected a setup-items event');
		expect(last.payload.items.map((item) => item.id)).toEqual([
			'wf-1:credential:slackApi',
			'wf-1:parameters:Send message',
			'wf-1:credential:gmailOAuth2',
		]);
		expect(last.payload.items[0]).toMatchObject({ reason: 'to post' });
	});

	it('keeps node bindings and setupHint from the build snapshot when an announcement lacks them', () => {
		const { emitter, published } = makeEmitter();
		const setupHint = {
			template: { headers: { 'X-Key': '{{api_key}}' } },
			placeholders: [{ name: 'api_key', title: 'API key' }],
		};
		emitter.emit('wf-1', [
			{
				id: 'wf-1:credential:httpTemplatedCustomAuth',
				kind: 'credential',
				credentialType: 'httpTemplatedCustomAuth',
				nodeBindings: [{ nodeName: 'Fetch' }],
				setupHint,
			},
		]);

		emitter.merge('wf-1', [
			{
				id: 'wf-1:credential:httpTemplatedCustomAuth',
				kind: 'credential',
				credentialType: 'httpTemplatedCustomAuth',
				reason: 'to fetch orders',
			},
		]);

		const last = published[1].event;
		if (last.type !== 'setup-items') throw new Error('expected a setup-items event');
		expect(last.payload.items).toEqual([
			{
				id: 'wf-1:credential:httpTemplatedCustomAuth',
				kind: 'credential',
				credentialType: 'httpTemplatedCustomAuth',
				nodeBindings: [{ nodeName: 'Fetch' }],
				setupHint,
				reason: 'to fetch orders',
			},
		]);
	});
});

const templatedAuthHint = {
	template: { headers: { Authorization: 'Bearer {{api_key}}' } },
	placeholders: [{ name: 'api_key', title: 'API key' }],
};

describe('buildSetupItemsFromCredentialRequests', () => {
	it('builds one service-keyed credential item per type, carrying reason and setupHint', () => {
		const items = buildSetupItemsFromCredentialRequests('wf-1', [
			{ credentialType: 'slackApi', reason: 'to post alerts' },
			{ credentialType: 'slackApi' },
			{ credentialType: 'gmailOAuth2', setupHint: templatedAuthHint },
		]);

		expect(items).toEqual([
			{
				id: 'wf-1:credential:slackApi',
				kind: 'credential',
				credentialType: 'slackApi',
				reason: 'to post alerts',
			},
			{
				id: 'wf-1:credential:gmailOAuth2',
				kind: 'credential',
				credentialType: 'gmailOAuth2',
				setupHint: templatedAuthHint,
			},
		]);
	});

	it('skips generic auth types, whose rows are keyed per node', () => {
		const items = buildSetupItemsFromCredentialRequests('wf-1', [
			{ credentialType: 'httpHeaderAuth' },
			{ credentialType: 'httpTemplatedCustomAuth', setupHint: templatedAuthHint },
			{ credentialType: 'slackApi' },
		]);

		expect(items.map((item) => item.id)).toEqual(['wf-1:credential:slackApi']);
	});
});

describe('buildSetupItemsFromAnnouncement', () => {
	it('lands generic auth types on the per-node rows of the analysed workflow, carrying the announcement', () => {
		const items = buildSetupItemsFromAnnouncement(
			'wf-1',
			[
				{
					credentialType: 'httpTemplatedCustomAuth',
					reason: 'to call Acme',
					setupHint: templatedAuthHint,
				},
			],
			[
				setupRequest({
					nodeName: 'Fetch Acme',
					credentialType: 'httpTemplatedCustomAuth',
					credentialNeedsAction: true,
				}),
				setupRequest({
					nodeName: 'Post to Slack',
					credentialType: 'slackApi',
					boundCredential: { id: 'c1', name: 'Team Slack' },
					credentialNeedsAction: false,
				}),
			],
		);

		expect(items).toEqual([
			{
				id: 'wf-1:credential:httpTemplatedCustomAuth:Fetch Acme',
				kind: 'credential',
				credentialType: 'httpTemplatedCustomAuth',
				nodeBindings: [{ nodeName: 'Fetch Acme' }],
				reason: 'to call Acme',
				setupHint: templatedAuthHint,
			},
			{
				id: 'wf-1:credential:slackApi',
				kind: 'credential',
				credentialType: 'slackApi',
				nodeBindings: [{ nodeName: 'Post to Slack' }],
			},
		]);
	});

	it('adds node-less rows for announced service types the saved workflow does not use yet', () => {
		const items = buildSetupItemsFromAnnouncement(
			'wf-1',
			[
				{ credentialType: 'gmailOAuth2', reason: 'to send the digest' },
				{ credentialType: 'httpHeaderAuth' },
			],
			[
				setupRequest({
					nodeName: 'Post to Slack',
					credentialType: 'slackApi',
					credentialNeedsAction: true,
				}),
			],
		);

		expect(items.map((item) => item.id)).toEqual([
			'wf-1:credential:slackApi',
			'wf-1:credential:gmailOAuth2',
		]);
		expect(items[1]).toMatchObject({ reason: 'to send the digest' });
	});
});

describe('buildSetupItemsFromSetupRequests', () => {
	it('fans a credential type out to every node that needs it', () => {
		const items = buildSetupItemsFromSetupRequests('wf-1', [
			setupRequest({
				nodeName: 'Post alert',
				credentialType: 'slackApi',
				credentialNeedsAction: true,
			}),
			setupRequest({
				nodeName: 'Post digest',
				credentialType: 'slackApi',
				credentialNeedsAction: true,
			}),
		]);

		expect(items).toEqual([
			{
				id: 'wf-1:credential:slackApi',
				kind: 'credential',
				credentialType: 'slackApi',
				nodeBindings: [{ nodeName: 'Post alert' }, { nodeName: 'Post digest' }],
			},
		]);
	});

	it('keeps slots bound to a stored credential (rendered as done) and drops Gateway credits slots', () => {
		const items = buildSetupItemsFromSetupRequests('wf-1', [
			setupRequest({
				nodeName: 'Post alert',
				credentialType: 'slackApi',
				boundCredential: { id: 'cred-1', name: 'Team Slack' },
				credentialNeedsAction: false,
			}),
			setupRequest({
				nodeName: 'Summarize',
				credentialType: 'openAiApi',
				boundCredential: { id: null, name: 'Gateway credits', __aiGatewayManaged: true },
				credentialNeedsAction: false,
			}),
		]);

		expect(items).toEqual([
			{
				id: 'wf-1:credential:slackApi',
				kind: 'credential',
				credentialType: 'slackApi',
				nodeBindings: [{ nodeName: 'Post alert' }],
			},
		]);
	});

	it('keys generic auth types per node, since one credential of the type does not identify a service', () => {
		const items = buildSetupItemsFromSetupRequests('wf-1', [
			setupRequest({
				nodeName: 'Fetch A',
				credentialType: 'httpHeaderAuth',
				credentialNeedsAction: true,
			}),
			setupRequest({
				nodeName: 'Fetch B',
				credentialType: 'httpHeaderAuth',
				credentialNeedsAction: true,
			}),
		]);

		expect(items.map((item) => item.id)).toEqual([
			'wf-1:credential:httpHeaderAuth:Fetch A',
			'wf-1:credential:httpHeaderAuth:Fetch B',
		]);
	});

	it('adds one parameters item per node with unresolved parameters, deduped across credential rows', () => {
		const items = buildSetupItemsFromSetupRequests('wf-1', [
			setupRequest({
				nodeName: 'Post alert',
				credentialType: 'slackApi',
				credentialNeedsAction: true,
				parameterIssues: { channelId: ['Not a valid channel'] },
			}),
			setupRequest({
				nodeName: 'Post alert',
				credentialType: 'slackOAuth2Api',
				credentialNeedsAction: true,
				parameterIssues: { channelId: ['Not a valid channel'] },
			}),
			setupRequest({ nodeName: 'Wait', parameterIssues: { amount: ['Required'] } }),
		]);

		expect(items.filter((item) => item.kind === 'parameters')).toEqual([
			{
				id: 'wf-1:parameters:Post alert',
				kind: 'parameters',
				nodeName: 'Post alert',
				parameterNames: ['channelId'],
			},
			{
				id: 'wf-1:parameters:Wait',
				kind: 'parameters',
				nodeName: 'Wait',
				parameterNames: ['amount'],
			},
		]);
	});

	it('carries a setupHint from the request onto the credential item', () => {
		const setupHint = {
			template: { headers: { 'X-Key': '{{api_key}}' } },
			placeholders: [{ name: 'api_key', title: 'API key' }],
		};
		const items = buildSetupItemsFromSetupRequests('wf-1', [
			setupRequest({
				nodeName: 'Fetch',
				credentialType: 'httpTemplatedCustomAuth',
				credentialNeedsAction: true,
				setupHint,
			}),
		]);

		expect(items[0]).toMatchObject({ credentialType: 'httpTemplatedCustomAuth', setupHint });
	});
});
