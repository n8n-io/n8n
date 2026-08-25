import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { Mock } from 'vitest';

import type { InstanceAiContext } from '../../../types';
import {
	buildCredentialMap,
	buildCredentialResolutionNote,
	resolveCredentials,
	type CredentialEntry,
	type CredentialMap,
} from '../resolve-credentials';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(existingWorkflow?: WorkflowJSON): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {
			getAsWorkflowJSON: vi
				.fn()
				.mockResolvedValue(existingWorkflow ?? { name: 'existing', nodes: [], connections: {} }),
		} as unknown as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		credentialService: {
			list: vi.fn(),
			get: vi.fn(),
			delete: vi.fn(),
			test: vi.fn(),
		},
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
		workflowTemplateService: {} as InstanceAiContext['workflowTemplateService'],
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as never,
	};
}

function makeWorkflow(overrides: Partial<WorkflowJSON> = {}): WorkflowJSON {
	return {
		name: 'Test Workflow',
		nodes: [],
		connections: {},
		...overrides,
	};
}

function makeCredentialMap(credentials: CredentialEntry[]): CredentialMap {
	const map: CredentialMap = new Map();
	for (const credential of credentials) {
		const entries = map.get(credential.type) ?? [];
		entries.push(credential);
		map.set(credential.type, entries);
	}
	return map;
}

function makeManagedCredential(): {
	id: null;
	name: string;
	__aiGatewayManaged: true;
} {
	return { id: null, name: 'n8n credits', __aiGatewayManaged: true };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveCredentials', () => {
	describe('missing credential mocking', () => {
		it('mocks missing credentials', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: undefined as unknown as { id: string; name: string } },
					},
				],
			});

			const result = await resolveCredentials(json, undefined, createMockContext());

			expect(result.mockedNodeNames).toEqual(['Slack']);
			expect(result.mockedCredentialTypes).toEqual(['slackApi']);
			expect(result.mockedCredentialsByNode).toEqual({ Slack: ['slackApi'] });
			expect(json.nodes[0].credentials).toEqual({});
		});

		it('mocks null credentials', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: null as unknown as { id: string; name: string } },
					},
				],
			});

			const result = await resolveCredentials(json, undefined, createMockContext());

			expect(result.mockedNodeNames).toEqual(['Slack']);
			expect(result.mockedCredentialTypes).toEqual(['slackApi']);
			expect(json.nodes[0].credentials).toEqual({});
		});
	});

	describe('n8n Connect auto-wiring', () => {
		function makeSlackNode() {
			return {
				id: '1',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2,
				position: [0, 0] as [number, number],
				credentials: { slackApi: undefined as unknown as { id: string; name: string } },
			};
		}

		it('attaches the n8n Connect managed credential when the type is gateway-supported and no stored credential exists', async () => {
			const json = makeWorkflow({ nodes: [makeSlackNode()] });
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValue([]);
			(
				ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
			).isAiGatewayCredentialType = vi.fn().mockResolvedValue(true);

			const result = await resolveCredentials(json, undefined, ctx);

			// Managed marker persisted so the saved workflow runs zero-setup.
			expect(json.nodes[0].credentials).toEqual({
				slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
			});
			// Reported as resolved (connected) — the agent must not route it to setup.
			expect(result.resolvedCredentialsByNode).toEqual({
				Slack: [{ type: 'slackApi', id: null, name: 'n8n credits', __aiGatewayManaged: true }],
			});
			// Still simulated during verification, but NOT flagged as needing a real credential.
			expect(result.mockedNodeNames).toEqual(['Slack']);
			expect(result.mockedCredentialsByNode).toEqual({});
			expect(result.mockedCredentialTypes).toEqual([]);
		});

		it('switches the node auth to the attached n8n credits credential type', async () => {
			// The LLM wrote the API-key credential slot but left auth at the OAuth2
			// default; attaching n8n credits must switch auth so the slot is active.
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'PDF.co',
						type: 'n8n-nodes-base.pdfco',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: { authentication: 'oAuth2' },
						credentials: { pdfcoApi: undefined as unknown as { id: string; name: string } },
					},
				],
			});
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValue([]);
			(
				ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
			).isAiGatewayCredentialType = vi.fn().mockResolvedValue(true);
			(ctx.nodeService as unknown as { getDescription: Mock }).getDescription = vi
				.fn()
				.mockResolvedValue({
					credentials: [
						{ name: 'pdfcoOAuth2Api', displayOptions: { show: { authentication: ['oAuth2'] } } },
						{ name: 'pdfcoApi', displayOptions: { show: { authentication: ['apiKey'] } } },
					],
				});

			await resolveCredentials(json, undefined, ctx);

			expect(json.nodes[0].credentials).toEqual({
				pdfcoApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
			});
			expect(json.nodes[0].parameters).toEqual({ authentication: 'apiKey' });
		});

		it('falls back to a supported sibling type when the written slot type is not gateway-supported', async () => {
			// The LLM wrote the slot matching the node's default auth (OAuth2), which
			// n8n credits doesn't cover — the sibling API-key type is attached instead
			// and auth is switched to it, rather than mocking the node into a setup card.
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'PDF.co',
						type: 'n8n-nodes-base.pdfco',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: { authentication: 'oAuth2' },
						credentials: { pdfcoOAuth2Api: undefined as unknown as { id: string; name: string } },
					},
				],
			});
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValue([]);
			(
				ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
			).isAiGatewayCredentialType = vi.fn(
				async (type: string) => await Promise.resolve(type === 'pdfcoApi'),
			);
			(ctx.nodeService as unknown as { getDescription: Mock }).getDescription = vi
				.fn()
				.mockResolvedValue({
					credentials: [
						{ name: 'pdfcoOAuth2Api', displayOptions: { show: { authentication: ['oAuth2'] } } },
						{ name: 'pdfcoApi', displayOptions: { show: { authentication: ['apiKey'] } } },
					],
				});

			const result = await resolveCredentials(json, undefined, ctx);

			expect(json.nodes[0].credentials).toEqual({
				pdfcoApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
			});
			expect(json.nodes[0].parameters).toEqual({ authentication: 'apiKey' });
			expect(result.resolvedCredentialsByNode).toEqual({
				'PDF.co': [{ type: 'pdfcoApi', id: null, name: 'n8n credits', __aiGatewayManaged: true }],
			});
			// Simulated during verification, but NOT flagged as needing a real credential.
			expect(result.mockedNodeNames).toEqual(['PDF.co']);
			expect(result.mockedCredentialsByNode).toEqual({});
		});

		it('attaches n8n credits to a supported sibling type for a credential-less node whose auth type is unsupported', async () => {
			// No `credentials` key at all and auth left at the unsupported OAuth2
			// default — the second pass switches auth to the supported sibling.
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'PDF.co',
						type: 'n8n-nodes-base.pdfco',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: { authentication: 'oAuth2' },
					},
				],
			});
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValue([]);
			(
				ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
			).isAiGatewayCredentialType = vi.fn(
				async (type: string) => await Promise.resolve(type === 'pdfcoApi'),
			);
			(ctx.nodeService as unknown as { getDescription: Mock }).getDescription = vi
				.fn()
				.mockResolvedValue({
					credentials: [
						{ name: 'pdfcoOAuth2Api', displayOptions: { show: { authentication: ['oAuth2'] } } },
						{ name: 'pdfcoApi', displayOptions: { show: { authentication: ['apiKey'] } } },
					],
				});

			const result = await resolveCredentials(json, undefined, ctx);

			expect(json.nodes[0].credentials).toEqual({
				pdfcoApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
			});
			expect(json.nodes[0].parameters).toEqual({ authentication: 'apiKey' });
			expect(result.resolvedCredentialsByNode).toEqual({
				'PDF.co': [{ type: 'pdfcoApi', id: null, name: 'n8n credits', __aiGatewayManaged: true }],
			});
			expect(result.mockedNodeNames).toEqual(['PDF.co']);
		});

		it('does not rewrite a parameter that already activates the attached credential type', async () => {
			// The credential is shown for several auth values and the node already
			// uses the second one — attaching n8n credits must not flip it to the first.
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'PDF.co',
						type: 'n8n-nodes-base.pdfco',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: { authentication: 'apiKeyLegacy' },
						credentials: { pdfcoApi: undefined as unknown as { id: string; name: string } },
					},
				],
			});
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValue([]);
			(
				ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
			).isAiGatewayCredentialType = vi.fn().mockResolvedValue(true);
			(ctx.nodeService as unknown as { getDescription: Mock }).getDescription = vi
				.fn()
				.mockResolvedValue({
					credentials: [
						{
							name: 'pdfcoApi',
							displayOptions: { show: { authentication: ['apiKey', 'apiKeyLegacy'] } },
						},
					],
				});

			await resolveCredentials(json, undefined, ctx);

			expect(json.nodes[0].credentials).toEqual({
				pdfcoApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
			});
			expect(json.nodes[0].parameters).toEqual({ authentication: 'apiKeyLegacy' });
		});

		it('attaches n8n credits to a credential-less node requiring a gateway-supported type', async () => {
			// The LLM omitted the credential slot entirely — no `credentials` key at all.
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'PDF.co',
						type: 'n8n-nodes-base.pdfco',
						typeVersion: 1,
						position: [0, 0],
					},
				],
			});
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValue([]);
			(
				ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
			).isAiGatewayCredentialType = vi.fn().mockResolvedValue(true);
			(ctx.nodeService as unknown as { getDescription: Mock }).getDescription = vi
				.fn()
				.mockResolvedValue({ credentials: [{ name: 'pdfcoApi' }] });

			const result = await resolveCredentials(json, undefined, ctx);

			// Silently configured with n8n credits — no setup card will surface for it.
			expect(json.nodes[0].credentials).toEqual({
				pdfcoApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
			});
			expect(result.resolvedCredentialsByNode).toEqual({
				'PDF.co': [{ type: 'pdfcoApi', id: null, name: 'n8n credits', __aiGatewayManaged: true }],
			});
			expect(result.mockedNodeNames).toEqual(['PDF.co']);
			expect(result.mockedCredentialsByNode).toEqual({});
		});

		it('auto-applies n8n credits to a credential-less default-parameter node when the type is covered', async () => {
			// LlamaParse persists no explicit operation (relies on defaults). Auto-apply
			// is gated on credential-type coverage only, so a covered type is applied
			// without a setup card regardless of parameter shape.
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Parse PDF (LlamaParse)',
						type: '@llamaindex/n8n-nodes-llamacloud.llamaParsePlatform',
						typeVersion: 1,
						position: [0, 0],
						parameters: { tier: 'agentic', inputDataFieldName: 'document' },
					},
				],
			});
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValue([]);
			(
				ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
			).isAiGatewayCredentialType = vi.fn().mockResolvedValue(true);
			(ctx.nodeService as unknown as { getDescription: Mock }).getDescription = vi
				.fn()
				.mockResolvedValue({ credentials: [{ name: 'llamaParseApi' }] });

			const result = await resolveCredentials(json, undefined, ctx);

			expect(json.nodes[0].credentials).toEqual({
				llamaParseApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
			});
			expect(result.resolvedCredentialsByNode).toEqual({
				'Parse PDF (LlamaParse)': [
					{ type: 'llamaParseApi', id: null, name: 'n8n credits', __aiGatewayManaged: true },
				],
			});
		});

		it('leaves a credential-less node alone when the required type is not gateway-supported', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'PDF.co',
						type: 'n8n-nodes-base.pdfco',
						typeVersion: 1,
						position: [0, 0],
					},
				],
			});
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValue([]);
			(
				ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
			).isAiGatewayCredentialType = vi.fn().mockResolvedValue(false);
			(ctx.nodeService as unknown as { getDescription: Mock }).getDescription = vi
				.fn()
				.mockResolvedValue({ credentials: [{ name: 'pdfcoApi' }] });

			const result = await resolveCredentials(json, undefined, ctx);

			// Left untouched so the post-build setup card can collect a real credential.
			expect(json.nodes[0].credentials).toBeUndefined();
			expect(result.resolvedCredentialsByNode).toEqual({});
			expect(result.mockedNodeNames).toEqual([]);
		});

		it('does not auto-attach n8n credits to a credential-less node when the user has a stored credential', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'PDF.co',
						type: 'n8n-nodes-base.pdfco',
						typeVersion: 1,
						position: [0, 0],
					},
				],
			});
			const ctx = createMockContext();
			(
				ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
			).isAiGatewayCredentialType = vi.fn().mockResolvedValue(true);
			(ctx.nodeService as unknown as { getDescription: Mock }).getDescription = vi
				.fn()
				.mockResolvedValue({ credentials: [{ name: 'pdfcoApi' }] });
			const credentialMap = makeCredentialMap([
				{ id: 'cred-1', name: 'My PDF.co', type: 'pdfcoApi' },
			]);

			const result = await resolveCredentials(json, undefined, ctx, credentialMap);

			// User has their own key — leave it for the setup card so they can pick it.
			expect(json.nodes[0].credentials).toBeUndefined();
			expect(result.resolvedCredentialsByNode).toEqual({});
		});

		it('prefers the sole stored credential over n8n Connect', async () => {
			const json = makeWorkflow({ nodes: [makeSlackNode()] });
			const ctx = createMockContext();
			(
				ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
			).isAiGatewayCredentialType = vi.fn().mockResolvedValue(true);
			const credentialMap = makeCredentialMap([
				{ id: 'cred-1', name: 'My Slack', type: 'slackApi' },
			]);

			const result = await resolveCredentials(json, undefined, ctx, credentialMap);

			expect(json.nodes[0].credentials).toEqual({ slackApi: { id: 'cred-1', name: 'My Slack' } });
			expect(result.resolvedCredentialsByNode).toEqual({
				Slack: [{ type: 'slackApi', id: 'cred-1', name: 'My Slack' }],
			});
			expect(result.mockedNodeNames).toEqual([]);
		});

		it('mocks when the type is not gateway-supported', async () => {
			const json = makeWorkflow({ nodes: [makeSlackNode()] });
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValue([]);
			(
				ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
			).isAiGatewayCredentialType = vi.fn().mockResolvedValue(false);

			const result = await resolveCredentials(json, undefined, ctx);

			expect(json.nodes[0].credentials).toEqual({});
			expect(result.mockedNodeNames).toEqual(['Slack']);
			expect(result.mockedCredentialsByNode).toEqual({ Slack: ['slackApi'] });
		});
	});

	describe('managed OAuth auth preference', () => {
		function makeNotionNode(withCredentialSlot = true) {
			return {
				id: '1',
				name: 'Notion',
				type: 'n8n-nodes-base.notion',
				typeVersion: 2,
				position: [0, 0] as [number, number],
				parameters: { authentication: 'apiKey' },
				...(withCredentialSlot
					? { credentials: { notionApi: undefined as unknown as { id: string; name: string } } }
					: {}),
			};
		}

		function mockNotionDescription(ctx: InstanceAiContext) {
			(ctx.nodeService as unknown as { getDescription: Mock }).getDescription = vi
				.fn()
				.mockResolvedValue({
					credentials: [
						{ name: 'notionApi', displayOptions: { show: { authentication: ['apiKey'] } } },
						{ name: 'notionOAuth2Api', displayOptions: { show: { authentication: ['oAuth2'] } } },
					],
				});
		}

		function setManagedOAuthTypes(ctx: InstanceAiContext, types: string[]) {
			(
				ctx.credentialService as unknown as { isManagedOAuthCredentialType: Mock }
			).isManagedOAuthCredentialType = vi.fn(
				async (type: string) => await Promise.resolve(types.includes(type)),
			);
		}

		it('switches the node auth to a managed-OAuth sibling instead of mocking the written API-key type', async () => {
			const json = makeWorkflow({ nodes: [makeNotionNode()] });
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValue([]);
			mockNotionDescription(ctx);
			setManagedOAuthTypes(ctx, ['notionOAuth2Api']);

			const result = await resolveCredentials(json, undefined, ctx);

			// Auth switched so every setup surface derives the OAuth type.
			expect(json.nodes[0].parameters).toEqual({ authentication: 'oAuth2' });
			// Nothing is attached — setup asks for the OAuth credential.
			expect(json.nodes[0].credentials).toEqual({});
			expect(result.resolvedCredentialsByNode).toEqual({});
			expect(result.mockedNodeNames).toEqual(['Notion']);
			expect(result.mockedCredentialTypes).toEqual(['notionOAuth2Api']);
			expect(result.mockedCredentialsByNode).toEqual({ Notion: ['notionOAuth2Api'] });
		});

		it('keeps the written type when the user has stored credentials of it', async () => {
			const json = makeWorkflow({ nodes: [makeNotionNode()] });
			const ctx = createMockContext();
			mockNotionDescription(ctx);
			setManagedOAuthTypes(ctx, ['notionOAuth2Api']);
			// Two stored credentials: the sole-credential fallback doesn't bind, and
			// the stored-credential guard must keep the node on the API-key type.
			const credentialMap = makeCredentialMap([
				{ id: 'cred-1', name: 'Notion account 1', type: 'notionApi' },
				{ id: 'cred-2', name: 'Notion account 2', type: 'notionApi' },
			]);

			const result = await resolveCredentials(json, undefined, ctx, credentialMap);

			expect(json.nodes[0].parameters).toEqual({ authentication: 'apiKey' });
			expect(result.mockedCredentialsByNode).toEqual({ Notion: ['notionApi'] });
		});

		it('prefers n8n credits over a managed-OAuth sibling', async () => {
			const json = makeWorkflow({ nodes: [makeNotionNode()] });
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValue([]);
			mockNotionDescription(ctx);
			setManagedOAuthTypes(ctx, ['notionOAuth2Api']);
			(
				ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
			).isAiGatewayCredentialType = vi.fn(
				async (type: string) => await Promise.resolve(type === 'notionApi'),
			);

			const result = await resolveCredentials(json, undefined, ctx);

			expect(json.nodes[0].credentials).toEqual({
				notionApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
			});
			expect(json.nodes[0].parameters).toEqual({ authentication: 'apiKey' });
			expect(result.mockedCredentialsByNode).toEqual({});
		});

		it('mocks the written type when no managed-OAuth sibling is available', async () => {
			// The adapter method is absent (older adapter / self-hosted) — behave as before.
			const json = makeWorkflow({ nodes: [makeNotionNode()] });
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValue([]);
			mockNotionDescription(ctx);

			const result = await resolveCredentials(json, undefined, ctx);

			expect(json.nodes[0].parameters).toEqual({ authentication: 'apiKey' });
			expect(result.mockedCredentialsByNode).toEqual({ Notion: ['notionApi'] });
		});

		it('switches auth for a credential-less node whose required type has a managed-OAuth sibling', async () => {
			// The LLM omitted the credential slot entirely — the second pass still
			// prefers the managed-OAuth auth option, without attaching anything.
			const json = makeWorkflow({ nodes: [makeNotionNode(false)] });
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValue([]);
			mockNotionDescription(ctx);
			setManagedOAuthTypes(ctx, ['notionOAuth2Api']);

			const result = await resolveCredentials(json, undefined, ctx);

			expect(json.nodes[0].parameters).toEqual({ authentication: 'oAuth2' });
			expect(json.nodes[0].credentials).toBeUndefined();
			expect(result.resolvedCredentialsByNode).toEqual({});
			expect(result.mockedNodeNames).toEqual([]);
		});
	});

	describe('existing workflow restoration', () => {
		it('restores credentials from existing workflow for updates', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: undefined as unknown as { id: string; name: string } },
					},
				],
			});

			const existingWorkflow = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: { id: 'existing-id', name: 'Existing Slack' } },
					},
				],
			});

			const ctx = createMockContext(existingWorkflow);
			const result = await resolveCredentials(json, 'wf-123', ctx);

			expect(result.mockedNodeNames).toEqual([]);
			expect(json.nodes[0].credentials).toEqual({
				slackApi: { id: 'existing-id', name: 'Existing Slack' },
			});
		});

		it('restores a saved managed credential from a null placeholder', async () => {
			const managedCredential = makeManagedCredential();
			const workflow = makeWorkflow({
				nodes: [
					{
						id: 'slack-1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.2,
						position: [0, 0],
						credentials: {
							slackApi: null as unknown as { id: string; name: string },
						},
					},
				],
			});
			const existingWorkflow = makeWorkflow({
				nodes: [
					{
						id: 'slack-1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.2,
						position: [0, 0],
						credentials: { slackApi: managedCredential },
					},
				],
			});

			const result = await resolveCredentials(
				workflow,
				'wf-123',
				createMockContext(existingWorkflow),
				makeCredentialMap([]),
			);

			expect(result.mockedNodeNames).toEqual([]);
			expect(workflow.nodes[0]?.credentials?.slackApi).toBe(managedCredential);
		});
	});

	describe('sibling node credential reuse', () => {
		function makeNotionNode(name: string, credentials: Record<string, unknown>) {
			return {
				id: name,
				name,
				type: 'n8n-nodes-base.notion',
				typeVersion: 2,
				position: [0, 0] as [number, number],
				credentials: credentials as unknown as { [key: string]: { id: string; name: string } },
			};
		}

		const twoNotionCreds = makeCredentialMap([
			{ id: 'cred-1', name: 'Notion main', type: 'notionApi' },
			{ id: 'cred-2', name: 'Notion other', type: 'notionApi' },
		]);

		it('reuses the credential bound to a sibling node of the same type', async () => {
			const json = makeWorkflow({
				nodes: [
					makeNotionNode('Notion', { notionApi: { id: 'cred-1', name: 'Notion main' } }),
					makeNotionNode('Notion 2', { notionApi: undefined }),
				],
			});

			const result = await resolveCredentials(json, undefined, createMockContext(), twoNotionCreds);

			expect(result.mockedNodeNames).toEqual([]);
			expect(json.nodes[1].credentials).toEqual({
				notionApi: { id: 'cred-1', name: 'Notion main' },
			});
			expect(result.resolvedCredentialsByNode['Notion 2']).toEqual([
				{ type: 'notionApi', id: 'cred-1', name: 'Notion main' },
			]);
		});

		it('reuses a saved-workflow binding for a node the build added', async () => {
			const json = makeWorkflow({
				nodes: [makeNotionNode('Notion 2', { notionApi: undefined })],
			});
			const existingWorkflow = makeWorkflow({
				nodes: [makeNotionNode('Notion', { notionApi: { id: 'cred-1', name: 'Notion main' } })],
			});

			const result = await resolveCredentials(
				json,
				'wf-123',
				createMockContext(existingWorkflow),
				twoNotionCreds,
			);

			expect(result.mockedNodeNames).toEqual([]);
			expect(json.nodes[0].credentials).toEqual({
				notionApi: { id: 'cred-1', name: 'Notion main' },
			});
		});

		it('rebinds an unknown raw id to the sibling credential instead of mocking', async () => {
			const json = makeWorkflow({
				nodes: [
					makeNotionNode('Notion', { notionApi: { id: 'cred-1', name: 'Notion main' } }),
					makeNotionNode('Notion 2', { notionApi: { id: 'fake-id', name: 'Made up' } }),
				],
			});

			const result = await resolveCredentials(json, undefined, createMockContext(), twoNotionCreds);

			expect(result.mockedNodeNames).toEqual([]);
			expect(json.nodes[1].credentials).toEqual({
				notionApi: { id: 'cred-1', name: 'Notion main' },
			});
		});

		it('does not reuse a sibling binding whose id is not stored', async () => {
			const json = makeWorkflow({
				nodes: [
					makeNotionNode('Notion', { notionApi: { id: 'cred-gone', name: 'Stale' } }),
					makeNotionNode('Notion 2', { notionApi: undefined }),
				],
			});

			const result = await resolveCredentials(json, undefined, createMockContext(), twoNotionCreds);

			expect(result.mockedNodeNames).toContain('Notion 2');
			expect(json.nodes[1].credentials).toEqual({});
		});

		it('does not reuse a sibling Templated Custom Auth credential across nodes', async () => {
			// One shared type serves every service — the sibling's key may belong to
			// a different service, so the slot must route to setup instead.
			const json = makeWorkflow({
				nodes: [
					makeNotionNode('Call Pexels', {
						httpTemplatedCustomAuth: { id: 'cred-pexels', name: 'Pexels API' },
					}),
					makeNotionNode('Call fal.ai', { httpTemplatedCustomAuth: undefined }),
				],
			});
			const credentials = makeCredentialMap([
				{ id: 'cred-pexels', name: 'Pexels API', type: 'httpTemplatedCustomAuth' },
				{ id: 'cred-fal', name: 'fal.ai API', type: 'httpTemplatedCustomAuth' },
			]);

			const result = await resolveCredentials(json, undefined, createMockContext(), credentials);

			expect(result.mockedNodeNames).toContain('Call fal.ai');
			expect(json.nodes[1].credentials).toEqual({});
		});

		it.each(['httpBearerAuth', 'oAuth2Api'])(
			'does not reuse a sibling %s credential across nodes',
			async (credentialType) => {
				// Same shared-type rule as Templated Custom Auth: the binding on one
				// node may belong to a different service than the new node calls.
				const json = makeWorkflow({
					nodes: [
						makeNotionNode('Call service A', {
							[credentialType]: { id: 'cred-a', name: 'Service A auth' },
						}),
						makeNotionNode('Call service B', { [credentialType]: undefined }),
					],
				});
				const credentials = makeCredentialMap([
					{ id: 'cred-a', name: 'Service A auth', type: credentialType },
					{ id: 'cred-b', name: 'Service B auth', type: credentialType },
				]);

				const result = await resolveCredentials(json, undefined, createMockContext(), credentials);

				expect(result.mockedNodeNames).toContain('Call service B');
				expect(json.nodes[1].credentials).toEqual({});
			},
		);

		it('ignores gateway-managed sibling markers', async () => {
			const json = makeWorkflow({
				nodes: [
					makeNotionNode('Notion', {
						notionApi: { id: null, name: 'n8n Connect', __aiGatewayManaged: true },
					}),
					makeNotionNode('Notion 2', { notionApi: undefined }),
				],
			});

			const result = await resolveCredentials(json, undefined, createMockContext(), twoNotionCreds);

			expect(result.mockedNodeNames).toContain('Notion 2');
			expect(json.nodes[1].credentials).toEqual({});
		});
	});

	describe('credential mocking', () => {
		it('mocks unresolved credentials and preserves existing pinData', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: undefined as unknown as { id: string; name: string } },
					},
				],
				pinData: {
					Slack: [{ ok: true, channel: 'C123', message: { text: 'Hello' } }],
				},
			});

			const result = await resolveCredentials(json, undefined, createMockContext());

			expect(result.mockedNodeNames).toEqual(['Slack']);
			expect(result.mockedCredentialTypes).toEqual(['slackApi']);
			expect(result.mockedCredentialsByNode).toEqual({ Slack: ['slackApi'] });
			// Credential key should be removed
			expect(json.nodes[0].credentials).toEqual({});
			// Existing pinData preserved, no mock pinData injected
			expect(json.pinData).toEqual({
				Slack: [{ ok: true, channel: 'C123', message: { text: 'Hello' } }],
			});
		});

		it('mocks unresolved credentials without touching json.pinData', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Gmail',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2,
						position: [0, 0],
						credentials: { gmailOAuth2: undefined as unknown as { id: string; name: string } },
					},
				],
			});

			const result = await resolveCredentials(json, undefined, createMockContext());

			expect(result.mockedNodeNames).toEqual(['Gmail']);
			expect(result.mockedCredentialTypes).toEqual(['gmailOAuth2']);
			expect(result.mockedCredentialsByNode).toEqual({ Gmail: ['gmailOAuth2'] });
			expect(json.nodes[0].credentials).toEqual({});
			// json.pinData must NOT be mutated
			expect(json.pinData).toBeUndefined();
		});

		it('does not mock credentials that are already resolved (non-null value)', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: { id: 'real-id', name: 'Real Slack' } },
					},
				],
			});

			const result = await resolveCredentials(json, undefined, createMockContext());

			expect(result.mockedNodeNames).toEqual([]);
			expect(result.mockedCredentialTypes).toEqual([]);
			expect(result.mockedCredentialsByNode).toEqual({});
			expect(json.nodes[0].credentials).toEqual({
				slackApi: { id: 'real-id', name: 'Real Slack' },
			});
		});

		it('deduplicates credential types across multiple nodes', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack 1',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: undefined as unknown as { id: string; name: string } },
					},
					{
						id: '2',
						name: 'Slack 2',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [200, 0],
						credentials: { slackApi: undefined as unknown as { id: string; name: string } },
					},
				],
			});

			const result = await resolveCredentials(json, undefined, createMockContext());

			expect(result.mockedNodeNames).toEqual(['Slack 1', 'Slack 2']);
			expect(result.mockedCredentialTypes).toEqual(['slackApi']);
			expect(result.mockedCredentialsByNode).toEqual({
				'Slack 1': ['slackApi'],
				'Slack 2': ['slackApi'],
			});
			// json.pinData must NOT be mutated
			expect(json.pinData).toBeUndefined();
		});
	});

	describe('raw credential validation against snapshot', () => {
		const availableCredentials = makeCredentialMap([
			{ id: 'slack-1', name: 'Team Slack', type: 'slackApi' },
			{ id: 'slack-2', name: 'Backup Slack', type: 'slackApi' },
			{ id: 'gmail-1', name: 'Gmail', type: 'gmailOAuth2' },
		]);

		it('keeps a raw credential id that exists in the snapshot for the same type', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: { id: 'slack-1', name: 'Team Slack' } },
					},
				],
			});

			const result = await resolveCredentials(
				json,
				undefined,
				createMockContext(),
				availableCredentials,
			);

			expect(result.mockedNodeNames).toEqual([]);
			expect(json.nodes[0].credentials).toEqual({
				slackApi: { id: 'slack-1', name: 'Team Slack' },
			});
		});

		it('keeps a raw credential id from a type with multiple available credentials', async () => {
			const ctx = createMockContext();
			(ctx.credentialService.list as Mock).mockResolvedValueOnce([
				{ id: 'slack-1', name: 'Team Slack', type: 'slackApi' },
				{ id: 'slack-2', name: 'Backup Slack', type: 'slackApi' },
			]);
			const credentialMap = await buildCredentialMap(ctx.credentialService);
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: { id: 'slack-1', name: 'Team Slack' } },
					},
				],
			});

			const result = await resolveCredentials(json, undefined, ctx, credentialMap);

			expect(result.mockedNodeNames).toEqual([]);
			expect(json.nodes[0].credentials).toEqual({
				slackApi: { id: 'slack-1', name: 'Team Slack' },
			});
		});

		it('mocks a synthesized raw credential id', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: { id: 'WHATSAPP_CREDENTIAL_ID', name: 'WhatsApp' } },
					},
				],
			});

			const result = await resolveCredentials(
				json,
				undefined,
				createMockContext(),
				availableCredentials,
			);

			expect(result.mockedNodeNames).toEqual(['Slack']);
			expect(result.mockedCredentialTypes).toEqual(['slackApi']);
			expect(result.mockedCredentialsByNode).toEqual({ Slack: ['slackApi'] });
			expect(json.nodes[0].credentials).toEqual({});
		});

		it('mocks a mock-* raw credential id that is absent from the snapshot', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Gmail',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2,
						position: [0, 0],
						credentials: { gmailOAuth2: { id: 'mock-gmail-oauth2', name: 'Gmail' } },
					},
				],
			});

			const result = await resolveCredentials(
				json,
				undefined,
				createMockContext(),
				availableCredentials,
			);

			expect(result.mockedNodeNames).toEqual(['Gmail']);
			expect(result.mockedCredentialTypes).toEqual(['gmailOAuth2']);
			expect(json.nodes[0].credentials).toEqual({});
		});

		it('mocks a real id when it belongs to a different credential type', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: { id: 'gmail-1', name: 'Gmail' } },
					},
				],
			});

			const result = await resolveCredentials(
				json,
				undefined,
				createMockContext(),
				availableCredentials,
			);

			expect(result.mockedNodeNames).toEqual(['Slack']);
			expect(result.mockedCredentialTypes).toEqual(['slackApi']);
			expect(json.nodes[0].credentials).toEqual({});
		});

		it('restores the existing workflow credential on edit when the builder emits an invalid raw id', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: { id: 'WHATSAPP_CREDENTIAL_ID', name: 'WhatsApp' } },
					},
				],
			});

			const existingWorkflow = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: { id: 'existing-slack', name: 'Existing Slack' } },
					},
				],
			});

			const result = await resolveCredentials(
				json,
				'wf-123',
				createMockContext(existingWorkflow),
				makeCredentialMap([{ id: 'existing-slack', name: 'Existing Slack', type: 'slackApi' }]),
			);

			expect(result.mockedNodeNames).toEqual([]);
			expect(json.nodes[0].credentials).toEqual({
				slackApi: { id: 'existing-slack', name: 'Existing Slack' },
			});
		});
	});

	describe('existing workflow restoration priority', () => {
		it('preserves the existing credential on an edit', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'OpenAI',
						type: '@n8n/n8n-nodes-langchain.openAi',
						typeVersion: 1,
						position: [0, 0],
						credentials: { openAiApi: undefined as unknown as { id: string; name: string } },
					},
				],
			});

			const existingWorkflow = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'OpenAI',
						type: '@n8n/n8n-nodes-langchain.openAi',
						typeVersion: 1,
						position: [0, 0],
						credentials: { openAiApi: { id: 'user-chosen-id', name: 'My OpenAI' } },
					},
				],
			});

			const ctx = createMockContext(existingWorkflow);
			const result = await resolveCredentials(json, 'wf-123', ctx);

			expect(result.mockedNodeNames).toEqual([]);
			expect(json.nodes[0].credentials).toEqual({
				openAiApi: { id: 'user-chosen-id', name: 'My OpenAI' },
			});
		});
	});

	describe('mocking with existing pinData', () => {
		it('mocks missing credentials and preserves user pinData', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: undefined as unknown as { id: string; name: string } },
					},
				],
				pinData: {
					Slack: [{ ok: true }],
				},
			});

			const result = await resolveCredentials(json, undefined, createMockContext());

			expect(result.mockedNodeNames).toEqual(['Slack']);
			expect(result.mockedCredentialTypes).toEqual(['slackApi']);
			expect(json.nodes[0].credentials).toEqual({});
			expect(json.pinData).toEqual({
				Slack: [{ ok: true }],
			});
		});
	});

	describe('mock pinData cleanup', () => {
		it('removes mock pinData when an explicit credential is valid for the type', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: { id: 'real-id', name: 'Real Slack' } },
					},
				],
				pinData: {
					Slack: [{ _mockedCredential: 'slackApi' }],
				},
			});

			await resolveCredentials(
				json,
				undefined,
				createMockContext(),
				makeCredentialMap([{ id: 'real-id', name: 'Real Slack', type: 'slackApi' }]),
			);

			expect(json.pinData).toEqual({});
		});

		it('preserves user-defined pinData when an explicit credential is valid for the type', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: { id: 'real-id', name: 'Real Slack' } },
					},
				],
				pinData: {
					Slack: [{ ok: true, channel: 'C123' }],
				},
			});

			await resolveCredentials(
				json,
				undefined,
				createMockContext(),
				makeCredentialMap([{ id: 'real-id', name: 'Real Slack', type: 'slackApi' }]),
			);

			expect(json.pinData).toEqual({
				Slack: [{ ok: true, channel: 'C123' }],
			});
		});
	});

	describe('mixed scenarios', () => {
		it('handles nodes with mixed resolved and unresolved credentials', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: { id: 'real-id', name: 'Real Slack' } },
					},
					{
						id: '2',
						name: 'Gmail',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2,
						position: [200, 0],
						credentials: { gmailOAuth2: undefined as unknown as { id: string; name: string } },
					},
				],
				pinData: {
					Gmail: [{ id: 'msg-1', subject: 'Test' }],
				},
			});

			const result = await resolveCredentials(json, undefined, createMockContext());

			expect(result.mockedNodeNames).toEqual(['Gmail']);
			expect(result.mockedCredentialTypes).toEqual(['gmailOAuth2']);
			// Slack should be untouched
			expect(json.nodes[0].credentials).toEqual({
				slackApi: { id: 'real-id', name: 'Real Slack' },
			});
			// Gmail credential should be removed
			expect(json.nodes[1].credentials).toEqual({});
		});
	});

	describe('resolved credential reporting', () => {
		it('auto-binds the sole candidate and reports it in resolvedCredentialsByNode', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'OpenAI Chat Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1.2,
						position: [0, 0],
						credentials: { openAiApi: null as unknown as { id: string; name: string } },
					},
				],
			});
			const map = makeCredentialMap([{ id: 'cred-1', name: 'OpenAI account', type: 'openAiApi' }]);

			const result = await resolveCredentials(json, undefined, createMockContext(), map);

			expect(result.mockedNodeNames).toEqual([]);
			expect(result.resolvedCredentialsByNode).toEqual({
				'OpenAI Chat Model': [{ type: 'openAiApi', id: 'cred-1', name: 'OpenAI account' }],
			});
			expect(json.nodes[0].credentials).toEqual({
				openAiApi: { id: 'cred-1', name: 'OpenAI account' },
			});
		});

		it('reports credentials restored from the existing workflow', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: undefined as unknown as { id: string; name: string } },
					},
				],
			});
			const existingWorkflow = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: { id: 'existing-id', name: 'Existing Slack' } },
					},
				],
			});

			const result = await resolveCredentials(json, 'wf-123', createMockContext(existingWorkflow));

			expect(result.resolvedCredentialsByNode).toEqual({
				Slack: [{ type: 'slackApi', id: 'existing-id', name: 'Existing Slack' }],
			});
		});

		it('does not report mocked credentials as resolved', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'OpenAI Chat Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1.2,
						position: [0, 0],
						credentials: { openAiApi: null as unknown as { id: string; name: string } },
					},
				],
			});
			// Two candidates — ambiguous, so the credential is mocked, not bound.
			const map = makeCredentialMap([
				{ id: 'cred-1', name: 'OpenAI A', type: 'openAiApi' },
				{ id: 'cred-2', name: 'OpenAI B', type: 'openAiApi' },
			]);

			const result = await resolveCredentials(json, undefined, createMockContext(), map);

			expect(result.mockedNodeNames).toEqual(['OpenAI Chat Model']);
			expect(result.resolvedCredentialsByNode).toEqual({});
		});

		it('does not report explicit valid credential ids as resolved', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
					},
				],
			});
			const map = makeCredentialMap([{ id: 'cred-1', name: 'My Slack', type: 'slackApi' }]);

			const result = await resolveCredentials(json, undefined, createMockContext(), map);

			expect(result.mockedNodeNames).toEqual([]);
			expect(result.resolvedCredentialsByNode).toEqual({});
		});
	});

	// Templated Custom Auth ids are service-agnostic at the type level, so the
	// resolver must never silently wire one the way it does dedicated types: a
	// supplied id is trusted only when it matches the node's own prior wiring,
	// and the sole-candidate fallback is skipped. Otherwise a Pexels key could
	// land on fal.ai nodes.
	describe('Templated Custom Auth', () => {
		const templatedNode = (credential: unknown) => ({
			id: '1',
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4,
			position: [0, 0] as [number, number],
			parameters: { url: 'https://fal.run/v1/models' },
			credentials: { httpTemplatedCustomAuth: credential as { id: string; name: string } },
		});

		it("keeps a supplied id that matches the node's prior wiring", async () => {
			const wired = { id: 'cred-fal', name: 'fal.ai API Key' };
			const json = makeWorkflow({ nodes: [templatedNode(wired)] });
			// Prior wiring is read from the persisted workflow, so pass its id.
			const ctx = createMockContext(makeWorkflow({ nodes: [templatedNode(wired)] }));

			await resolveCredentials(json, 'wf-1', ctx, makeCredentialMap([]));

			expect(json.nodes[0].credentials).toEqual({ httpTemplatedCustomAuth: wired });
		});

		it('routes a fresh supplied id to setup instead of trusting it', async () => {
			// The model attached a stored templated credential the node was never
			// wired to — could be another service's key, so mock and let setup ask.
			const json = makeWorkflow({
				nodes: [templatedNode({ id: 'cred-pexels', name: 'Pexels API' })],
			});
			const ctx = createMockContext();

			const result = await resolveCredentials(
				json,
				undefined,
				ctx,
				makeCredentialMap([
					{ id: 'cred-pexels', name: 'Pexels API', type: 'httpTemplatedCustomAuth' },
				]),
			);

			expect(json.nodes[0].credentials).toEqual({});
			expect(result.mockedNodeNames).toContain('HTTP Request');
		});

		it('skips the sole-candidate fallback', async () => {
			// One stored templated credential exists, but the node has no prior
			// wiring — a dedicated type would auto-attach it; the shared type must not.
			const json = makeWorkflow({ nodes: [templatedNode(null)] });
			const ctx = createMockContext();

			const result = await resolveCredentials(
				json,
				undefined,
				ctx,
				makeCredentialMap([
					{ id: 'cred-1', name: 'Some API Key', type: 'httpTemplatedCustomAuth' },
				]),
			);

			expect(json.nodes[0].credentials).toEqual({});
			expect(result.mockedNodeNames).toContain('HTTP Request');
		});
	});

	// Bearer/header/query/basic/digest/custom/OAuth all share one type across
	// every service, so the sole-candidate fallback must not wire them either —
	// otherwise a build silently sends the user's only key to the node's URL.
	describe('generic auth types', () => {
		const bearerNode = () => ({
			id: '1',
			name: 'MCP Client',
			type: '@n8n/n8n-nodes-langchain.mcpClientTool',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: { endpointUrl: 'http://localhost:5678/mcp-server/http' },
			credentials: { httpBearerAuth: null as unknown as { id: string; name: string } },
		});

		it('skips the sole-candidate fallback for a bearer auth credential', async () => {
			const json = makeWorkflow({ nodes: [bearerNode()] });

			const result = await resolveCredentials(
				json,
				undefined,
				createMockContext(),
				makeCredentialMap([
					{ id: 'cred-bearer', name: 'Bearer Auth account', type: 'httpBearerAuth' },
				]),
			);

			expect(json.nodes[0].credentials).toEqual({});
			expect(result.mockedNodeNames).toContain('MCP Client');
			expect(result.resolvedCredentialsByNode).toEqual({});
		});

		it('still auto-binds the sole candidate of a service-scoped type', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2,
						position: [0, 0],
						credentials: { slackApi: null as unknown as { id: string; name: string } },
					},
				],
			});

			await resolveCredentials(
				json,
				undefined,
				createMockContext(),
				makeCredentialMap([{ id: 'cred-slack', name: 'My Slack', type: 'slackApi' }]),
			);

			expect(json.nodes[0].credentials).toEqual({
				slackApi: { id: 'cred-slack', name: 'My Slack' },
			});
		});
	});
});

// The user asking for a new credential ("create a new Slack credential") must
// beat every automatic attachment — otherwise the build silently answers the
// request with a credential they already had and setup never opens (INS-361).
describe('resolveCredentials with preferNewCredentialTypes', () => {
	function makeSlackNode(name = 'Slack') {
		return {
			id: '1',
			name,
			type: 'n8n-nodes-base.slack',
			typeVersion: 2,
			position: [0, 0] as [number, number],
			credentials: { slackApi: undefined as unknown as { id: string; name: string } },
		};
	}

	it('leaves the sole stored credential unbound and mocks the slot instead', async () => {
		const json = makeWorkflow({ nodes: [makeSlackNode()] });
		const map = makeCredentialMap([{ id: 'cred-1', name: 'Slack account', type: 'slackApi' }]);

		const result = await resolveCredentials(json, undefined, createMockContext(), map, [
			'slackApi',
		]);

		expect(json.nodes[0].credentials).toEqual({});
		expect(result.resolvedCredentialsByNode).toEqual({});
		expect(result.mockedNodeNames).toEqual(['Slack']);
		expect(result.mockedCredentialsByNode).toEqual({ Slack: ['slackApi'] });
		expect(result.heldForNewCredentialTypes).toEqual(['slackApi']);
	});

	it('does not reuse a credential bound to a sibling node of the same type', async () => {
		const json = makeWorkflow({
			nodes: [
				{
					id: '0',
					name: 'Existing Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2,
					position: [0, 0],
					credentials: { slackApi: { id: 'cred-1', name: 'Slack account' } },
				},
				{ ...makeSlackNode('New Slack'), id: '1' },
			],
		});
		const map = makeCredentialMap([{ id: 'cred-1', name: 'Slack account', type: 'slackApi' }]);

		const result = await resolveCredentials(json, undefined, createMockContext(), map, [
			'slackApi',
		]);

		// The sibling keeps its own deliberate binding; only the fresh slot is held.
		expect(json.nodes[0].credentials).toEqual({
			slackApi: { id: 'cred-1', name: 'Slack account' },
		});
		expect(json.nodes[1].credentials).toEqual({});
		expect(result.mockedNodeNames).toEqual(['New Slack']);
	});

	it('does not restore the credential saved on the node in the existing workflow', async () => {
		const json = makeWorkflow({ nodes: [makeSlackNode()] });
		const existingWorkflow = makeWorkflow({
			nodes: [
				{
					id: '1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2,
					position: [0, 0],
					credentials: { slackApi: { id: 'cred-1', name: 'Slack account' } },
				},
			],
		});
		const map = makeCredentialMap([{ id: 'cred-1', name: 'Slack account', type: 'slackApi' }]);

		const result = await resolveCredentials(
			json,
			'wf-1',
			createMockContext(existingWorkflow),
			map,
			['slackApi'],
		);

		expect(json.nodes[0].credentials).toEqual({});
		expect(result.mockedCredentialsByNode).toEqual({ Slack: ['slackApi'] });
	});

	it('does not answer the slot with n8n credits', async () => {
		const json = makeWorkflow({ nodes: [makeSlackNode()] });
		const ctx = createMockContext();
		(
			ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
		).isAiGatewayCredentialType = vi.fn().mockResolvedValue(true);

		const result = await resolveCredentials(json, undefined, ctx, makeCredentialMap([]), [
			'slackApi',
		]);

		expect(json.nodes[0].credentials).toEqual({});
		expect(result.resolvedCredentialsByNode).toEqual({});
		expect(result.mockedCredentialsByNode).toEqual({ Slack: ['slackApi'] });
	});

	it('keeps resolving the types the user did not ask to recreate', async () => {
		const json = makeWorkflow({
			nodes: [
				makeSlackNode(),
				{
					id: '2',
					name: 'Telegram',
					type: 'n8n-nodes-base.telegram',
					typeVersion: 1,
					position: [0, 0],
					credentials: { telegramApi: undefined as unknown as { id: string; name: string } },
				},
			],
		});
		const map = makeCredentialMap([
			{ id: 'cred-1', name: 'Slack account', type: 'slackApi' },
			{ id: 'cred-2', name: 'Telegram account', type: 'telegramApi' },
		]);

		const result = await resolveCredentials(json, undefined, createMockContext(), map, [
			'slackApi',
		]);

		expect(json.nodes[0].credentials).toEqual({});
		expect(json.nodes[1].credentials).toEqual({
			telegramApi: { id: 'cred-2', name: 'Telegram account' },
		});
		expect(result.mockedNodeNames).toEqual(['Slack']);
	});

	// The source can omit the credential slot altogether; the required-type pass
	// then holds it, attaching — and so mocking — nothing. The held type still has to
	// be reported, or the build result carries no trace of the request and the setup
	// call can auto-apply an existing credential.
	it('reports a held type when the source omitted the slot and a credential is stored', async () => {
		const json = makeWorkflow({
			nodes: [
				{
					id: '1',
					name: 'Send Hello',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2,
					position: [0, 0],
				},
			],
		});
		const ctx = createMockContext();
		(ctx.nodeService as unknown as { getDescription: Mock }).getDescription = vi
			.fn()
			.mockResolvedValue({ credentials: [{ name: 'slackApi' }] });
		const map = makeCredentialMap([{ id: 'cred-1', name: 'Slack account', type: 'slackApi' }]);

		const result = await resolveCredentials(json, undefined, ctx, map, ['slackApi']);

		expect(result.heldForNewCredentialTypes).toEqual(['slackApi']);
		expect(json.nodes[0].credentials).toBeUndefined();
	});

	it('reports a held type when the omitted slot would have taken n8n credits', async () => {
		const json = makeWorkflow({
			nodes: [
				{
					id: '1',
					name: 'Send Hello',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2,
					position: [0, 0],
				},
			],
		});
		const ctx = createMockContext();
		(ctx.credentialService.list as Mock).mockResolvedValue([]);
		(
			ctx.credentialService as unknown as { isAiGatewayCredentialType: Mock }
		).isAiGatewayCredentialType = vi.fn().mockResolvedValue(true);
		(ctx.nodeService as unknown as { getDescription: Mock }).getDescription = vi
			.fn()
			.mockResolvedValue({ credentials: [{ name: 'slackApi' }] });

		const result = await resolveCredentials(json, undefined, ctx, makeCredentialMap([]), [
			'slackApi',
		]);

		expect(result.heldForNewCredentialTypes).toEqual(['slackApi']);
		expect(json.nodes[0].credentials).toBeUndefined();
	});

	it('reports nothing held for a type no node in the workflow uses', async () => {
		const json = makeWorkflow({ nodes: [makeSlackNode()] });

		const result = await resolveCredentials(json, undefined, createMockContext(), undefined, [
			'telegramApi',
		]);

		expect(result.heldForNewCredentialTypes).toEqual([]);
	});

	it('still honors a credential id the builder wrote deliberately', async () => {
		const json = makeWorkflow({
			nodes: [
				{
					...makeSlackNode(),
					credentials: { slackApi: { id: 'cred-1', name: 'Slack account' } },
				},
			],
		});
		const map = makeCredentialMap([{ id: 'cred-1', name: 'Slack account', type: 'slackApi' }]);

		const result = await resolveCredentials(json, undefined, createMockContext(), map, [
			'slackApi',
		]);

		expect(json.nodes[0].credentials).toEqual({
			slackApi: { id: 'cred-1', name: 'Slack account' },
		});
		expect(result.mockedNodeNames).toEqual([]);
	});
});

describe('buildCredentialResolutionNote', () => {
	it('returns undefined when nothing was resolved', () => {
		expect(buildCredentialResolutionNote({})).toBeUndefined();
	});

	it('names each resolved credential and instructs not to re-ask', () => {
		const note = buildCredentialResolutionNote({
			'OpenAI Chat Model': [{ type: 'openAiApi', id: 'cred-1', name: 'OpenAI account' }],
		});

		expect(note).toContain('"OpenAI account" (openAiApi) on node "OpenAI Chat Model"');
		expect(note).toContain('do not ask the user to connect or create them');
	});

	it('tells the agent to carry the fresh-credential request into setup', () => {
		const note = buildCredentialResolutionNote({}, ['slackApi']);

		expect(note).toContain('the user asked to create them fresh: slackApi');
		expect(note).toContain('preferNewCredentials: ["slackApi"]');
		// The "already set up, do not route to setup" line must not leak onto a
		// type that is deliberately still pending.
		expect(note).not.toContain('do not route them to credential setup');
	});

	it('keeps the attached-credential guidance scoped when both kinds are present', () => {
		const note = buildCredentialResolutionNote(
			{ Telegram: [{ type: 'telegramApi', id: 'cred-2', name: 'Telegram account' }] },
			['slackApi'],
		);

		expect(note).toContain('"Telegram account" (telegramApi) on node "Telegram"');
		expect(note).toContain('Those attached credentials are already set up');
		expect(note).toContain('preferNewCredentials: ["slackApi"]');
	});

	it('surfaces the n8n credits label and BYOK guidance for gateway-managed credentials', () => {
		const note = buildCredentialResolutionNote({
			Slack: [{ type: 'slackApi', id: null, name: 'n8n credits', __aiGatewayManaged: true }],
		});

		expect(note).toContain('n8n credits');
		expect(note).not.toContain('n8n Connect');
		expect(note).toContain('switch to their own key');
	});
});
