import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { resolveCredentials, type CredentialMap } from '../resolve-credentials';

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
	describe('credential map resolution', () => {
		it('resolves credentials from the credential map', async () => {
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

			const credMap: CredentialMap = new Map([['slackApi', { id: 'cred-1', name: 'My Slack' }]]);

			const result = await resolveCredentials(json, undefined, createMockContext(), credMap);

			expect(result.mockedNodeNames).toEqual([]);
			expect(result.mockedCredentialTypes).toEqual([]);
			expect(json.nodes[0].credentials).toEqual({
				slackApi: { id: 'cred-1', name: 'My Slack' },
			});
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
			const result = await resolveCredentials(json, 'wf-123', ctx, new Map());

			expect(result.mockedNodeNames).toEqual([]);
			expect(json.nodes[0].credentials).toEqual({
				slackApi: { id: 'existing-id', name: 'Existing Slack' },
			});
		});
	});

	describe('credential mocking with sidecar verification data', () => {
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

			const result = await resolveCredentials(json, undefined, createMockContext(), new Map());

			expect(result.mockedNodeNames).toEqual(['Slack']);
			expect(result.mockedCredentialTypes).toEqual(['slackApi']);
			expect(result.mockedCredentialsByNode).toEqual({ Slack: ['slackApi'] });
			// Credential key should be removed
			expect(json.nodes[0].credentials).toEqual({});
			// Existing pinData preserved, no mock pinData injected
			expect(json.pinData).toEqual({
				Slack: [{ ok: true, channel: 'C123', message: { text: 'Hello' } }],
			});
			// No verification pin data needed — existing pinData suffices
			expect(result.verificationPinData).toEqual({});
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

			const result = await resolveCredentials(json, undefined, createMockContext(), new Map());

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

			const result = await resolveCredentials(json, undefined, createMockContext(), new Map());

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

			const result = await resolveCredentials(json, undefined, createMockContext(), new Map());

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

	describe('credential map takes priority over mocking', () => {
		it('uses credential map even when pinData exists', async () => {
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

			const credMap: CredentialMap = new Map([['slackApi', { id: 'real-id', name: 'Real Slack' }]]);

			const result = await resolveCredentials(json, undefined, createMockContext(), credMap);

			// Should use credential map, not mock
			expect(result.mockedNodeNames).toEqual([]);
			expect(json.nodes[0].credentials).toEqual({
				slackApi: { id: 'real-id', name: 'Real Slack' },
			});
		});
	});

	describe('mock pinData cleanup', () => {
		it('removes mock pinData when credential is resolved from credential map', async () => {
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
					Slack: [{ _mockedCredential: 'slackApi' }],
				},
			});

			const credMap: CredentialMap = new Map([['slackApi', { id: 'real-id', name: 'Real Slack' }]]);
			await resolveCredentials(json, undefined, createMockContext(), credMap);

			// Mock pinData should be cleaned up since real credential was found
			expect(json.pinData).toEqual({});
		});

		it('preserves user-defined pinData when credential is resolved', async () => {
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
					Slack: [{ ok: true, channel: 'C123' }],
				},
			});

			const credMap: CredentialMap = new Map([['slackApi', { id: 'real-id', name: 'Real Slack' }]]);
			await resolveCredentials(json, undefined, createMockContext(), credMap);

			// User-defined pinData (no _mockedCredential marker) should be preserved
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

			const result = await resolveCredentials(json, undefined, createMockContext(), new Map());

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
