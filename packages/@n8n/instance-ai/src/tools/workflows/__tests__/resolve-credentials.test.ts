import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { resolveCredentials, type CredentialEntry } from '../resolve-credentials';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(existingWorkflow?: WorkflowJSON): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {
			getAsWorkflowJSON: jest
				.fn()
				.mockResolvedValue(existingWorkflow ?? { name: 'existing', nodes: [], connections: {} }),
		} as unknown as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		credentialService: {
			list: jest.fn(),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
		},
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
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
			expect(result.verificationPinData).toEqual({
				Slack: [{ _mockedCredential: 'slackApi' }],
			});
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
	});

	describe('credential mocking with sidecar verification data', () => {
		it('mocks unresolved credentials and marks existing pinData as verification-ready', async () => {
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
			// No sidecar pin data needed — existing workflow pinData suffices
			expect(result.verificationPinData).toEqual({});
			expect(result.usesWorkflowPinDataForVerification).toBe(true);
		});

		it('produces sidecar verification pinData when no existing pinData', async () => {
			const json = makeWorkflow({
				nodes: [
					{
						id: '1',
						name: 'Gmail',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2,
						position: [0, 0],
						credentials: { gmailOAuth2Api: undefined as unknown as { id: string; name: string } },
					},
				],
			});

			const result = await resolveCredentials(json, undefined, createMockContext());

			expect(result.mockedNodeNames).toEqual(['Gmail']);
			expect(result.mockedCredentialTypes).toEqual(['gmailOAuth2Api']);
			expect(result.mockedCredentialsByNode).toEqual({ Gmail: ['gmailOAuth2Api'] });
			expect(json.nodes[0].credentials).toEqual({});
			// json.pinData must NOT be mutated
			expect(json.pinData).toBeUndefined();
			// Verification pin data in sidecar
			expect(result.verificationPinData).toEqual({
				Gmail: [{ _mockedCredential: 'gmailOAuth2Api' }],
			});
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
			expect(result.verificationPinData).toEqual({});
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
			// Sidecar verification data for both nodes
			expect(result.verificationPinData).toEqual({
				'Slack 1': [{ _mockedCredential: 'slackApi' }],
				'Slack 2': [{ _mockedCredential: 'slackApi' }],
			});
		});
	});

	describe('raw credential validation against snapshot', () => {
		const availableCredentials: CredentialEntry[] = [
			{ id: 'slack-1', name: 'Team Slack', type: 'slackApi' },
			{ id: 'slack-2', name: 'Backup Slack', type: 'slackApi' },
			{ id: 'gmail-1', name: 'Gmail', type: 'gmailOAuth2Api' },
		];

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
			expect(result.verificationPinData).toEqual({
				Slack: [{ _mockedCredential: 'slackApi' }],
			});
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
						credentials: { gmailOAuth2Api: { id: 'mock-gmail-oauth2', name: 'Gmail' } },
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
			expect(result.mockedCredentialTypes).toEqual(['gmailOAuth2Api']);
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

			const result = await resolveCredentials(json, 'wf-123', createMockContext(existingWorkflow), [
				{ id: 'existing-slack', name: 'Existing Slack', type: 'slackApi' },
			]);

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
			expect(result.verificationPinData).toEqual({});
			expect(result.usesWorkflowPinDataForVerification).toBe(true);
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

			await resolveCredentials(json, undefined, createMockContext(), [
				{ id: 'real-id', name: 'Real Slack', type: 'slackApi' },
			]);

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

			await resolveCredentials(json, undefined, createMockContext(), [
				{ id: 'real-id', name: 'Real Slack', type: 'slackApi' },
			]);

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
						credentials: { gmailOAuth2Api: undefined as unknown as { id: string; name: string } },
					},
				],
				pinData: {
					Gmail: [{ id: 'msg-1', subject: 'Test' }],
				},
			});

			const result = await resolveCredentials(json, undefined, createMockContext());

			expect(result.mockedNodeNames).toEqual(['Gmail']);
			expect(result.mockedCredentialTypes).toEqual(['gmailOAuth2Api']);
			// Slack should be untouched
			expect(json.nodes[0].credentials).toEqual({
				slackApi: { id: 'real-id', name: 'Real Slack' },
			});
			// Gmail credential should be removed
			expect(json.nodes[1].credentials).toEqual({});
		});
	});
});
