import { FsByteStore } from '@n8n/blob-storage';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import { BinaryDataBlobManager } from '@/binary-data/blob.manager';
import { FileLocation } from '@/binary-data/utils';
import type { ErrorReporter } from '@/errors';
import { FileNotFoundError } from '@/errors/file-not-found.error';
import { toStream } from '@test/utils';

const errorReporter = mock<ErrorReporter>();

let storagePath: string;
let manager: BinaryDataBlobManager;

const workflowId = 'ObogjVbqpNOQpiyV';
const executionId = '999';
const executionLocation = { type: 'execution', workflowId, executionId } as const;
const body = Buffer.from('Test data', 'utf-8');

beforeAll(async () => {
	storagePath = await fs.mkdtemp(join(tmpdir(), 'n8n-blob-manager-test-'));
	manager = new BinaryDataBlobManager(
		new FsByteStore({ storagePath, reportError: (error) => errorReporter.error(error) }),
		errorReporter,
	);
	await manager.init();
});

beforeEach(async () => {
	vi.clearAllMocks();
	for (const entry of await fs.readdir(storagePath)) {
		await fs.rm(join(storagePath, entry), { recursive: true, force: true });
	}
});

afterAll(async () => {
	await fs.rm(storagePath, { recursive: true, force: true });
});

describe('store', () => {
	it('stores a buffer under a binary_data prefix and writes a metadata file', async () => {
		const metadata = { mimeType: 'text/plain', fileName: 'file.txt' };

		const { fileId, fileSize } = await manager.store(executionLocation, body, metadata);

		expect(fileId).toMatch(
			new RegExp(`^workflows/${workflowId}/executions/${executionId}/binary_data/[0-9a-f-]{36}$`),
		);
		expect(fileSize).toBe(body.length);
		expect((await fs.readFile(join(storagePath, fileId))).equals(body)).toBe(true);
		expect(await manager.getMetadata(fileId)).toEqual({ ...metadata, fileSize: body.length });
	});

	it('stores a stream and reports its byte size', async () => {
		const { fileId, fileSize } = await manager.store(executionLocation, toStream(body), {});

		expect(fileSize).toBe(body.length);
		expect((await manager.getAsBuffer(fileId)).equals(body)).toBe(true);
	});

	it('falls back to a temp dir when the execution id is missing', async () => {
		const { fileId } = await manager.store(
			{ type: 'execution', workflowId, executionId: '' },
			body,
			{},
		);

		expect(fileId.startsWith(`workflows/${workflowId}/executions/temp/binary_data/`)).toBe(true);
	});

	it('stores under custom path segments', async () => {
		const location = FileLocation.ofCustom({
			pathSegments: ['chat-hub', 'sessions', 'abc', 'messages', 'def'],
		});

		const { fileId } = await manager.store(location, body, {});

		expect(fileId.startsWith('chat-hub/sessions/abc/messages/def/binary_data/')).toBe(true);
	});

	it.each([[[]], [['a', '']]])('rejects empty custom path segments %j', async (pathSegments) => {
		const location = FileLocation.ofCustom({ pathSegments });

		await expect(manager.store(location, body, {})).rejects.toThrow(
			'requires non-empty path segments',
		);
	});
});

describe('getPath', () => {
	it('returns the absolute filesystem path', async () => {
		const { fileId } = await manager.store(executionLocation, body, {});

		expect(manager.getPath(fileId)).toBe(join(storagePath, fileId));
	});
});

describe('getAsBuffer / getAsStream', () => {
	it('returns the stored bytes', async () => {
		const { fileId } = await manager.store(executionLocation, body, {});

		expect((await manager.getAsBuffer(fileId)).equals(body)).toBe(true);

		const stream = await manager.getAsStream(fileId);
		const chunks: Buffer[] = [];
		for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
		expect(Buffer.concat(chunks).equals(body)).toBe(true);
	});

	it('throws FileNotFoundError for a missing file', async () => {
		const missing = `workflows/${workflowId}/executions/${executionId}/binary_data/missing`;

		await expect(manager.getAsBuffer(missing)).rejects.toThrow(FileNotFoundError);
		await expect(manager.getAsStream(missing)).rejects.toThrow(FileNotFoundError);
	});
});

describe('getMetadata', () => {
	it('throws FileNotFoundError when the metadata file is missing', async () => {
		const missing = `workflows/${workflowId}/executions/${executionId}/binary_data/missing`;

		await expect(manager.getMetadata(missing)).rejects.toThrow(FileNotFoundError);
	});
});

describe('copyByFileId', () => {
	it('copies the file and its metadata file to the target location', async () => {
		const metadata = { mimeType: 'text/plain', fileName: 'file.txt' };
		const { fileId: sourceFileId } = await manager.store(executionLocation, body, metadata);
		const targetLocation = { type: 'execution', workflowId, executionId: '1000' } as const;

		const targetFileId = await manager.copyByFileId(targetLocation, sourceFileId);

		expect(targetFileId.startsWith(`workflows/${workflowId}/executions/1000/binary_data/`)).toBe(
			true,
		);
		expect((await manager.getAsBuffer(targetFileId)).equals(body)).toBe(true);
		expect(await manager.getMetadata(targetFileId)).toEqual({ ...metadata, fileSize: body.length });
		expect((await manager.getAsBuffer(sourceFileId)).equals(body)).toBe(true);
	});

	it('aborts without creating a target when the source metadata file is missing', async () => {
		const { fileId: sourceFileId } = await manager.store(executionLocation, body, {});
		await fs.rm(join(storagePath, `${sourceFileId}.metadata`));
		const before = await fs.readdir(join(storagePath, `workflows/${workflowId}`), {
			recursive: true,
		});

		await expect(manager.copyByFileId(executionLocation, sourceFileId)).rejects.toThrow(
			FileNotFoundError,
		);

		const after = await fs.readdir(join(storagePath, `workflows/${workflowId}`), {
			recursive: true,
		});
		expect(after).toEqual(before);
	});
});

describe('copyByFilePath', () => {
	it('copies a file from an arbitrary path and writes a metadata file', async () => {
		const sourcePath = join(tmpdir(), `n8n-blob-manager-source-${process.pid}`);
		await fs.writeFile(sourcePath, body);

		try {
			const { fileId, fileSize } = await manager.copyByFilePath(executionLocation, sourcePath, {
				mimeType: 'text/plain',
			});

			expect(fileSize).toBe(body.length);
			expect((await manager.getAsBuffer(fileId)).equals(body)).toBe(true);
			expect(await manager.getMetadata(fileId)).toEqual({
				mimeType: 'text/plain',
				fileSize: body.length,
			});
		} finally {
			await fs.rm(sourcePath, { force: true });
		}
	});
});

describe('rename', () => {
	it('moves the file and its metadata file to the new file id', async () => {
		const metadata = { mimeType: 'text/plain' };
		const { fileId: oldFileId } = await manager.store(
			{ type: 'execution', workflowId, executionId: '' },
			body,
			metadata,
		);
		const newFileId = oldFileId.replace('/executions/temp/', `/executions/${executionId}/`);

		await manager.rename(oldFileId, newFileId);

		expect((await manager.getAsBuffer(newFileId)).equals(body)).toBe(true);
		expect(await manager.getMetadata(newFileId)).toEqual({ ...metadata, fileSize: body.length });
		await expect(manager.getAsBuffer(oldFileId)).rejects.toThrow(FileNotFoundError);
	});
});

describe('deleteMany', () => {
	it('deletes the binary_data dir and prunes empty ancestors', async () => {
		const { fileId } = await manager.store(executionLocation, body, {});

		await manager.deleteMany([executionLocation]);

		await expect(manager.getAsBuffer(fileId)).rejects.toThrow(FileNotFoundError);
		await expect(fs.stat(join(storagePath, `workflows/${workflowId}`))).rejects.toThrow();
	});

	it('leaves execution_data siblings intact', async () => {
		await manager.store(executionLocation, body, {});
		const bundlePath = join(
			storagePath,
			`workflows/${workflowId}/executions/${executionId}/execution_data`,
		);
		await fs.mkdir(bundlePath, { recursive: true });
		await fs.writeFile(join(bundlePath, 'bundle.json'), '{}');

		await manager.deleteMany([executionLocation]);

		expect(await fs.readFile(join(bundlePath, 'bundle.json'), 'utf-8')).toBe('{}');
	});
});

describe('deleteManyByFileId', () => {
	it('deletes the binary_data dirs of execution and custom file ids', async () => {
		const { fileId: executionFileId } = await manager.store(executionLocation, body, {});
		const customLocation = FileLocation.ofCustom({
			pathSegments: ['agents', 'a1', 'knowledge-files', 'f1'],
		});
		const { fileId: customFileId } = await manager.store(customLocation, body, {});

		await manager.deleteManyByFileId([executionFileId, customFileId]);

		await expect(manager.getAsBuffer(executionFileId)).rejects.toThrow(FileNotFoundError);
		await expect(manager.getAsBuffer(customFileId)).rejects.toThrow(FileNotFoundError);
	});

	it('deletes a custom file nested under an execution-like prefix, not that execution', async () => {
		const nestedLocation = FileLocation.ofCustom({
			pathSegments: ['workflows', workflowId, 'executions', executionId, 'nested'],
		});
		const { fileId: nestedFileId } = await manager.store(nestedLocation, body, {});
		const { fileId: executionFileId } = await manager.store(executionLocation, body, {});

		await manager.deleteManyByFileId([nestedFileId]);

		await expect(manager.getAsBuffer(nestedFileId)).rejects.toThrow(FileNotFoundError);
		expect((await manager.getAsBuffer(executionFileId)).equals(body)).toBe(true);
	});

	it('deletes a custom file whose path contains a binary_data segment, not its ancestor', async () => {
		const nestedLocation = FileLocation.ofCustom({
			pathSegments: ['foo', 'binary_data', 'bar'],
		});
		const { fileId: nestedFileId } = await manager.store(nestedLocation, body, {});
		const siblingLocation = FileLocation.ofCustom({ pathSegments: ['foo'] });
		const { fileId: siblingFileId } = await manager.store(siblingLocation, body, {});

		await manager.deleteManyByFileId([nestedFileId]);

		await expect(manager.getAsBuffer(nestedFileId)).rejects.toThrow(FileNotFoundError);
		expect((await manager.getAsBuffer(siblingFileId)).equals(body)).toBe(true);
	});

	it.each(['legacy-flat-id', 'foo//binary_data/some-id'])(
		'warns and skips malformed file id %s without aborting the batch',
		async (malformedId) => {
			const { fileId } = await manager.store(executionLocation, body, {});

			await manager.deleteManyByFileId([malformedId, fileId]);

			expect(errorReporter.warn).toHaveBeenCalledWith(
				`Could not parse file ID ${malformedId}. Skip deletion`,
			);
			await expect(manager.getAsBuffer(fileId)).rejects.toThrow(FileNotFoundError);
		},
	);
});
