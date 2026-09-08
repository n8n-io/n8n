import {
	createWorkflow,
	mockInstance,
	shareWorkflowWithUsers,
	testDb,
} from '@n8n/backend-test-utils';
import { BinaryDataRepository, ExecutionRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { BinaryDataService, FileNotFoundError } from 'n8n-core';
import fsp from 'node:fs/promises';
import { Readable } from 'node:stream';

import { createSuccessfulExecution } from './shared/db/executions';
import { createMember, createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import { setupTestServer } from './shared/utils';

vi.mock('fs/promises');

const throwFileNotFound = () => {
	throw new FileNotFoundError('non/existing/path');
};

const binaryDataService = mockInstance(BinaryDataService);
const testServer = setupTestServer({ endpointGroups: ['binaryData'] });

afterEach(() => {
	vi.restoreAllMocks();
});

describe('GET /binary-data', () => {
	const binaryFilePath = '/Users/john/.n8n/binaryData/599c5f84007-7d14-4b63-8f1e-d726098d0cc0';
	const mimeType = 'text/plain';
	const fileName = 'test.txt';
	const buffer = Buffer.from('content');
	const mockStream = new Readable();
	mockStream.push(buffer);
	mockStream.push(null);

	let authOwnerAgent: SuperAgentTest;
	// Path-format ids backed by an execution the owner can read (authorization gate).
	let fsBinaryDataId: string;
	let s3BinaryDataId: string;

	beforeAll(async () => {
		const owner = await createOwner();
		authOwnerAgent = testServer.authAgentFor(owner);

		const workflow = await createWorkflow({}, owner);
		const execution = await createSuccessfulExecution(workflow);
		const fileId = `workflows/${workflow.id}/executions/${execution.id}/binary_data/599c5f84007-7d14-4b63-8f1e-d726098d0cc0`;
		fsBinaryDataId = `filesystem:${fileId}`;
		s3BinaryDataId = `s3:${fileId}`;
	});

	describe('should reject on missing or invalid binary data ID', () => {
		test.each([['view'], ['download']])('on request to %s', async (action) => {
			binaryDataService.getPath.mockReturnValue(binaryFilePath);
			fsp.readFile = vi.fn().mockResolvedValue(buffer);

			await authOwnerAgent
				.get('/binary-data')
				.query({
					fileName,
					mimeType,
					action,
				})
				.expect(400);

			await authOwnerAgent
				.get('/binary-data')
				.query({
					id: 'invalid',
					fileName,
					mimeType,
					action,
				})
				.expect(400);
		});
	});

	describe('should return binary data [filesystem]', () => {
		test.each([['view'], ['download']])('on request to %s', async (action) => {
			binaryDataService.getAsStream.mockResolvedValue(mockStream);

			const res = await authOwnerAgent
				.get('/binary-data')
				.query({
					id: fsBinaryDataId,
					fileName,
					mimeType,
					action,
				})
				.expect(200);

			const contentDisposition =
				action === 'download' ? `attachment; filename="${fileName}"` : undefined;

			expect(binaryDataService.getAsStream).toHaveBeenCalledWith(fsBinaryDataId);
			expect(res.headers['content-type']).toBe(mimeType);
			expect(res.headers['content-disposition']).toBe(contentDisposition);
		});
	});

	describe('should handle non-ASCII filename [filesystem]', () => {
		test('on request to download', async () => {
			const nonAsciiFileName = 'äöüß.png';

			const res = await authOwnerAgent
				.get('/binary-data')
				.query({
					id: fsBinaryDataId,
					fileName: nonAsciiFileName,
					mimeType,
					action: 'download',
				})
				.expect(200);

			expect(res.headers['content-disposition']).toBe(
				`attachment; filename="${encodeURIComponent(nonAsciiFileName)}"`,
			);
		});
	});

	describe('should return 404 on file not found [filesystem]', () => {
		test.each(['view', 'download'])('on request to %s', async (action) => {
			binaryDataService.getAsStream.mockImplementation(throwFileNotFound);

			await authOwnerAgent
				.get('/binary-data')
				.query({
					id: fsBinaryDataId,
					fileName,
					mimeType,
					action,
				})
				.expect(404);
		});
	});

	describe('should return binary data [s3]', () => {
		test.each([['view'], ['download']])('on request to %s', async (action) => {
			binaryDataService.getAsStream.mockResolvedValue(mockStream);

			const res = await authOwnerAgent
				.get('/binary-data')
				.query({
					id: s3BinaryDataId,
					fileName,
					mimeType,
					action,
				})
				.expect(200);

			expect(binaryDataService.getAsStream).toHaveBeenCalledWith(s3BinaryDataId);

			const contentDisposition =
				action === 'download' ? `attachment; filename="${fileName}"` : undefined;

			expect(res.headers['content-type']).toBe(mimeType);
			expect(res.headers['content-disposition']).toBe(contentDisposition);
		});
	});

	describe('should return 404 on file not found [s3]', () => {
		test.each(['view', 'download'])('on request to %s', async (action) => {
			binaryDataService.getAsStream.mockImplementation(throwFileNotFound);

			await authOwnerAgent
				.get('/binary-data')
				.query({
					id: s3BinaryDataId,
					fileName,
					mimeType,
					action,
				})
				.expect(404);
		});
	});
});

describe('GET /binary-data (execution ownership)', () => {
	const uuid = '2c3f1e5a-0b6d-4c8e-9f11-abc123def456';
	const mimeType = 'text/plain';
	const fileName = 'test.txt';
	const buffer = Buffer.from('secret');

	let victim: User;
	let attacker: User;

	const executionBinaryId = (workflowId: string, executionId: string) =>
		`filesystem-v2:workflows/${workflowId}/executions/${executionId}/binary_data/${uuid}`;

	beforeEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'SharedWorkflow']);
		victim = await createMember();
		attacker = await createMember();

		const stream = new Readable();
		stream.push(buffer);
		stream.push(null);
		binaryDataService.getAsStream.mockResolvedValue(stream);
	});

	test('lets the owner download a binary from their own execution', async () => {
		const workflow = await createWorkflow({}, victim);
		const execution = await createSuccessfulExecution(workflow);

		await testServer
			.authAgentFor(victim)
			.get('/binary-data')
			.query({
				id: executionBinaryId(workflow.id, execution.id),
				action: 'download',
				fileName,
				mimeType,
			})
			.expect(200);
	});

	test('does not let a user download a binary from an execution they cannot access', async () => {
		const workflow = await createWorkflow({}, victim);
		const execution = await createSuccessfulExecution(workflow);

		await testServer
			.authAgentFor(attacker)
			.get('/binary-data')
			.query({
				id: executionBinaryId(workflow.id, execution.id),
				action: 'download',
				fileName,
				mimeType,
			})
			.expect(404);
	});

	test('rejects a path-traversal id that points into an execution the user cannot access', async () => {
		const attackerWorkflow = await createWorkflow({}, attacker);
		const attackerExecution = await createSuccessfulExecution(attackerWorkflow);
		const victimWorkflow = await createWorkflow({}, victim);
		const victimExecution = await createSuccessfulExecution(victimWorkflow);

		const traversalId =
			`filesystem-v2:workflows/${attackerWorkflow.id}/executions/${attackerExecution.id}/binary_data/` +
			`../../../../workflows/${victimWorkflow.id}/executions/${victimExecution.id}/binary_data/${uuid}`;

		await testServer
			.authAgentFor(attacker)
			.get('/binary-data')
			.query({ id: traversalId, action: 'download', fileName, mimeType })
			.expect(400);
	});

	test('lets the owner download a binary from their own soft-deleted execution', async () => {
		const workflow = await createWorkflow({}, victim);
		const execution = await createSuccessfulExecution(workflow);
		// Manual executions with saving off are soft-deleted but stay downloadable.
		await Container.get(ExecutionRepository).softDelete(execution.id);

		await testServer
			.authAgentFor(victim)
			.get('/binary-data')
			.query({
				id: executionBinaryId(workflow.id, execution.id),
				action: 'download',
				fileName,
				mimeType,
			})
			.expect(200);
	});

	test('lets a user download a binary from an execution shared with them', async () => {
		const workflow = await createWorkflow({}, victim);
		await shareWorkflowWithUsers(workflow, [attacker]);
		const execution = await createSuccessfulExecution(workflow);

		await testServer
			.authAgentFor(attacker)
			.get('/binary-data')
			.query({
				id: executionBinaryId(workflow.id, execution.id),
				action: 'download',
				fileName,
				mimeType,
			})
			.expect(200);
	});

	describe('database mode', () => {
		const storeExecutionBinary = async (executionId: string) => {
			await Container.get(BinaryDataRepository).insert({
				fileId: uuid,
				sourceType: 'execution',
				sourceId: executionId,
				data: buffer,
				mimeType,
				fileName,
				fileSize: buffer.length,
			});
			return `database:${uuid}`;
		};

		beforeEach(async () => {
			await testDb.truncate(['BinaryDataFile']);
		});

		test('lets the owner download a binary from their own execution', async () => {
			const workflow = await createWorkflow({}, victim);
			const execution = await createSuccessfulExecution(workflow);
			const id = await storeExecutionBinary(execution.id);

			await testServer
				.authAgentFor(victim)
				.get('/binary-data')
				.query({ id, action: 'download', fileName, mimeType })
				.expect(200);
		});

		test('does not let a user download a binary from an execution they cannot access', async () => {
			const workflow = await createWorkflow({}, victim);
			const execution = await createSuccessfulExecution(workflow);
			const id = await storeExecutionBinary(execution.id);

			await testServer
				.authAgentFor(attacker)
				.get('/binary-data')
				.query({ id, action: 'download', fileName, mimeType })
				.expect(404);
		});
	});
});
