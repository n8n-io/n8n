import { mockInstance } from '@n8n/backend-test-utils';
import type { User, WorkflowEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { INode, INodeCredentialsDetails } from 'n8n-workflow';

import type { CreatedCredential } from '../crud-adapter';
import { crudAdapter } from '../crud-adapter';
import type { ParsedCredential, ParsedWorkflow } from '../parse';

import { saveCredential as publicApiSaveCredential } from '@/public-api/v1/handlers/credentials/credentials.service';
import { createWorkflow as publicApiCreateWorkflow } from '@/public-api/v1/handlers/workflows/workflows.service';
import { WorkflowService } from '@/workflows/workflow.service';

jest.mock('@/public-api/v1/handlers/workflows/workflows.service', () => ({
	createWorkflow: jest.fn(),
}));

jest.mock('@/public-api/v1/handlers/credentials/credentials.service', () => ({
	saveCredential: jest.fn(),
}));

const workflowService = mockInstance(WorkflowService);
const owner = mock<User>({ id: 'owner-123' });

const minimalParsed = (name: string): ParsedWorkflow => ({
	name,
	nodes: [
		{
			id: 'node-1',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {},
});

const parsedWithCredentials = (
	name: string,
	nodeType: string,
	credentials: Record<string, INodeCredentialsDetails>,
): ParsedWorkflow => ({
	name,
	nodes: [
		{
			id: 'node-1',
			name: 'HTTP Request',
			type: nodeType,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials,
		},
	],
	connections: {},
});

const parsedCred = (name: string, type: string): ParsedCredential => ({
	name,
	type,
	data: { apiKey: 'secret' },
});

beforeEach(() => {
	jest.clearAllMocks();
});

describe('crudAdapter.createWorkflows', () => {
	it('persists each ParsedWorkflow via the public-API createWorkflow and returns the imported set', async () => {
		const parsed = minimalParsed('Test Workflow');
		jest
			.mocked(publicApiCreateWorkflow)
			.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow' }));

		const result = await crudAdapter.createWorkflows(owner, [parsed]);

		expect(result).toEqual([{ id: 'wf-1', name: 'Test Workflow', parsed }]);
		expect(publicApiCreateWorkflow).toHaveBeenCalledTimes(1);
		expect(publicApiCreateWorkflow).toHaveBeenCalledWith(
			owner,
			expect.objectContaining({
				name: 'Test Workflow',
				nodes: parsed.nodes,
				connections: parsed.connections,
			}),
		);
	});

	it('handles multiple workflows in input order', async () => {
		const a = minimalParsed('A');
		const b = minimalParsed('B');

		jest
			.mocked(publicApiCreateWorkflow)
			.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-a', name: 'A' }))
			.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-b', name: 'B' }));

		const result = await crudAdapter.createWorkflows(owner, [a, b]);

		expect(result.map((r) => r.id)).toEqual(['wf-a', 'wf-b']);
		expect(publicApiCreateWorkflow).toHaveBeenNthCalledWith(
			1,
			owner,
			expect.objectContaining({ name: 'A' }),
		);
		expect(publicApiCreateWorkflow).toHaveBeenNthCalledWith(
			2,
			owner,
			expect.objectContaining({ name: 'B' }),
		);
	});

	it('coerces a missing settings field to an empty object before passing to createWorkflow', async () => {
		const parsed = minimalParsed('No Settings');
		jest
			.mocked(publicApiCreateWorkflow)
			.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'No Settings' }));

		await crudAdapter.createWorkflows(owner, [parsed]);

		expect(publicApiCreateWorkflow).toHaveBeenCalledWith(
			owner,
			expect.objectContaining({ settings: {} }),
		);
	});

	describe('credential reference resolution', () => {
		const captureNodes = (): INode[] => {
			const call = jest.mocked(publicApiCreateWorkflow).mock.calls[0];
			const entity = call[1] as WorkflowEntity;
			return entity.nodes;
		};

		it('keeps id and rewrites name when a freshly-imported credential has a matching id', async () => {
			const parsed = parsedWithCredentials('WF', 'httpBasicAuth', {
				httpBasicAuth: { id: 'cred-1', name: 'Stale Name' },
			});
			const created: CreatedCredential[] = [
				{ id: 'cred-1', name: 'Real Name', type: 'httpBasicAuth' },
			];
			jest
				.mocked(publicApiCreateWorkflow)
				.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'WF' }));

			await crudAdapter.createWorkflows(owner, [parsed], created);

			expect(captureNodes()[0].credentials).toEqual({
				httpBasicAuth: { id: 'cred-1', name: 'Real Name' },
			});
		});

		it('rewrites id when a freshly-imported credential has a matching name', async () => {
			const parsed = parsedWithCredentials('WF', 'httpBasicAuth', {
				httpBasicAuth: { id: 'stale-id', name: 'My Creds' },
			});
			const created: CreatedCredential[] = [
				{ id: 'cred-new', name: 'My Creds', type: 'httpBasicAuth' },
			];
			jest
				.mocked(publicApiCreateWorkflow)
				.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'WF' }));

			await crudAdapter.createWorkflows(owner, [parsed], created);

			expect(captureNodes()[0].credentials).toEqual({
				httpBasicAuth: { id: 'cred-new', name: 'My Creds' },
			});
		});

		it('leaves the reference untouched when neither id nor name matches', async () => {
			const parsed = parsedWithCredentials('WF', 'httpBasicAuth', {
				httpBasicAuth: { id: 'unknown-id', name: 'Unknown' },
			});
			const created: CreatedCredential[] = [
				{ id: 'cred-1', name: 'Other Name', type: 'httpBasicAuth' },
			];
			jest
				.mocked(publicApiCreateWorkflow)
				.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'WF' }));

			await crudAdapter.createWorkflows(owner, [parsed], created);

			expect(captureNodes()[0].credentials).toEqual({
				httpBasicAuth: { id: 'unknown-id', name: 'Unknown' },
			});
		});

		it('leaves the reference untouched when the imported credential is a different type', async () => {
			const parsed = parsedWithCredentials('WF', 'httpBasicAuth', {
				httpBasicAuth: { id: 'cred-1', name: 'My Creds' },
			});
			const created: CreatedCredential[] = [{ id: 'cred-1', name: 'My Creds', type: 'notionApi' }];
			jest
				.mocked(publicApiCreateWorkflow)
				.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'WF' }));

			await crudAdapter.createWorkflows(owner, [parsed], created);

			expect(captureNodes()[0].credentials).toEqual({
				httpBasicAuth: { id: 'cred-1', name: 'My Creds' },
			});
		});

		it('is a no-op when the createdCredentials list is empty', async () => {
			const parsed = parsedWithCredentials('WF', 'httpBasicAuth', {
				httpBasicAuth: { id: 'cred-1', name: 'My Creds' },
			});
			jest
				.mocked(publicApiCreateWorkflow)
				.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'WF' }));

			await crudAdapter.createWorkflows(owner, [parsed], []);

			expect(captureNodes()[0].credentials).toEqual({
				httpBasicAuth: { id: 'cred-1', name: 'My Creds' },
			});
		});

		it('omitting the credentials argument is equivalent to passing an empty list', async () => {
			const parsed = parsedWithCredentials('WF', 'httpBasicAuth', {
				httpBasicAuth: { id: 'cred-1', name: 'My Creds' },
			});
			jest
				.mocked(publicApiCreateWorkflow)
				.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'WF' }));

			await crudAdapter.createWorkflows(owner, [parsed]);

			expect(captureNodes()[0].credentials).toEqual({
				httpBasicAuth: { id: 'cred-1', name: 'My Creds' },
			});
		});

		it('resolves multiple credentials of the same type by name when the node id does not match', async () => {
			const parsed = parsedWithCredentials('WF', 'httpBasicAuth', {
				httpBasicAuth: { id: 'stale', name: 'Creds B' },
			});
			const created: CreatedCredential[] = [
				{ id: 'cred-a', name: 'Creds A', type: 'httpBasicAuth' },
				{ id: 'cred-b', name: 'Creds B', type: 'httpBasicAuth' },
			];
			jest
				.mocked(publicApiCreateWorkflow)
				.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'WF' }));

			await crudAdapter.createWorkflows(owner, [parsed], created);

			expect(captureNodes()[0].credentials).toEqual({
				httpBasicAuth: { id: 'cred-b', name: 'Creds B' },
			});
		});

		it('id match wins over name match when both are present', async () => {
			const parsed = parsedWithCredentials('WF', 'httpBasicAuth', {
				httpBasicAuth: { id: 'cred-a', name: 'Creds B' },
			});
			const created: CreatedCredential[] = [
				{ id: 'cred-a', name: 'Creds A', type: 'httpBasicAuth' },
				{ id: 'cred-b', name: 'Creds B', type: 'httpBasicAuth' },
			];
			jest
				.mocked(publicApiCreateWorkflow)
				.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'WF' }));

			await crudAdapter.createWorkflows(owner, [parsed], created);

			expect(captureNodes()[0].credentials).toEqual({
				httpBasicAuth: { id: 'cred-a', name: 'Creds A' },
			});
		});

		it('matches by name when the node references a null id', async () => {
			const parsed = parsedWithCredentials('WF', 'httpBasicAuth', {
				httpBasicAuth: { id: null, name: 'My Creds' },
			});
			const created: CreatedCredential[] = [
				{ id: 'cred-1', name: 'My Creds', type: 'httpBasicAuth' },
			];
			jest
				.mocked(publicApiCreateWorkflow)
				.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'WF' }));

			await crudAdapter.createWorkflows(owner, [parsed], created);

			expect(captureNodes()[0].credentials).toEqual({
				httpBasicAuth: { id: 'cred-1', name: 'My Creds' },
			});
		});

		it('does not mutate the input ParsedWorkflow', async () => {
			const parsed = parsedWithCredentials('WF', 'httpBasicAuth', {
				httpBasicAuth: { id: 'stale-id', name: 'My Creds' },
			});
			const created: CreatedCredential[] = [
				{ id: 'cred-new', name: 'My Creds', type: 'httpBasicAuth' },
			];
			jest
				.mocked(publicApiCreateWorkflow)
				.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'WF' }));

			await crudAdapter.createWorkflows(owner, [parsed], created);

			expect(parsed.nodes[0].credentials).toEqual({
				httpBasicAuth: { id: 'stale-id', name: 'My Creds' },
			});
		});

		it('skips nodes without a credentials field', async () => {
			const parsed = minimalParsed('No Creds');
			const created: CreatedCredential[] = [{ id: 'cred-1', name: 'Any', type: 'httpBasicAuth' }];
			jest
				.mocked(publicApiCreateWorkflow)
				.mockResolvedValueOnce(mock<WorkflowEntity>({ id: 'wf-1', name: 'No Creds' }));

			await crudAdapter.createWorkflows(owner, [parsed], created);

			expect(captureNodes()[0].credentials).toBeUndefined();
		});
	});
});

describe('crudAdapter.createCredentials', () => {
	it('persists each ParsedCredential via the public-API saveCredential and returns {id, name, type}', async () => {
		const cred = parsedCred('My Creds', 'httpBasicAuth');
		jest.mocked(publicApiSaveCredential).mockResolvedValueOnce(
			mock<Awaited<ReturnType<typeof publicApiSaveCredential>>>({
				id: 'cred-1',
				name: 'My Creds',
				type: 'httpBasicAuth',
			}),
		);

		const result = await crudAdapter.createCredentials(owner, [cred]);

		expect(result).toEqual([{ id: 'cred-1', name: 'My Creds', type: 'httpBasicAuth' }]);
		expect(publicApiSaveCredential).toHaveBeenCalledTimes(1);
		expect(publicApiSaveCredential).toHaveBeenCalledWith(
			{ name: 'My Creds', type: 'httpBasicAuth', data: { apiKey: 'secret' } },
			owner,
		);
	});

	it('handles multiple credentials in input order', async () => {
		const a = parsedCred('A', 'httpBasicAuth');
		const b = parsedCred('B', 'notionApi');

		jest
			.mocked(publicApiSaveCredential)
			.mockResolvedValueOnce(
				mock<Awaited<ReturnType<typeof publicApiSaveCredential>>>({
					id: 'cred-a',
					name: 'A',
					type: 'httpBasicAuth',
				}),
			)
			.mockResolvedValueOnce(
				mock<Awaited<ReturnType<typeof publicApiSaveCredential>>>({
					id: 'cred-b',
					name: 'B',
					type: 'notionApi',
				}),
			);

		const result = await crudAdapter.createCredentials(owner, [a, b]);

		expect(result).toEqual([
			{ id: 'cred-a', name: 'A', type: 'httpBasicAuth' },
			{ id: 'cred-b', name: 'B', type: 'notionApi' },
		]);
	});

	it('returns an empty array when no credentials are passed', async () => {
		const result = await crudAdapter.createCredentials(owner, []);

		expect(result).toEqual([]);
		expect(publicApiSaveCredential).not.toHaveBeenCalled();
	});

	it('rejects a credential whose "data" field is not an object', async () => {
		const invalid: ParsedCredential = {
			name: 'Bad',
			type: 'httpBasicAuth',
			data: 'not-an-object',
		};

		await expect(crudAdapter.createCredentials(owner, [invalid])).rejects.toThrow(
			/has invalid "data" field/,
		);
		expect(publicApiSaveCredential).not.toHaveBeenCalled();
	});
});

describe('crudAdapter.activateWorkflow', () => {
	it('delegates to WorkflowService.activateWorkflow with source="api"', async () => {
		workflowService.activateWorkflow.mockResolvedValue(
			mock<WorkflowEntity>({ id: 'wf-1', active: true }),
		);

		await crudAdapter.activateWorkflow(owner, 'wf-1');

		expect(workflowService.activateWorkflow).toHaveBeenCalledTimes(1);
		expect(workflowService.activateWorkflow).toHaveBeenCalledWith(owner, 'wf-1', { source: 'api' });
	});
});
