import { testDb } from '@n8n/backend-test-utils';
import {
	BinaryDataRepository,
	GLOBAL_MEMBER_ROLE,
	ServiceAccountRepository,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { UserError } from '@n8n/errors';
import { Cipher } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ExportService } from '@/services/export.service';
import { ImportService } from '@/services/import.service';
import { decompressFolder } from '@/utils/compression.util';

import { createMember, createOwner } from './shared/db/users';

const ALL_BYTE_VALUES = Buffer.from(Array.from({ length: 256 }, (_, byte) => byte));

async function storeBinaryFile(data: Buffer): Promise<string> {
	const fileId = randomUUID();
	await Container.get(BinaryDataRepository).insert({
		fileId,
		sourceType: 'execution',
		sourceId: '1',
		data,
		mimeType: null,
		fileName: null,
		fileSize: data.length,
	});
	return fileId;
}

async function unzipArchive(outputDir: string): Promise<string> {
	const unzipped = join(outputDir, 'unzipped');
	await decompressFolder(join(outputDir, 'entities.zip'), unzipped);
	return unzipped;
}

function binaryDataFiles(files: string[]): string[] {
	return files.filter((file) => /^binarydatafile(\.\d+)?\.jsonl$/.test(file));
}

async function binaryDataRowsInArchive(unzipped: string): Promise<Array<Record<string, unknown>>> {
	const cipher = Container.get(Cipher);
	const rows: Array<Record<string, unknown>> = [];
	for (const file of binaryDataFiles(await readdir(unzipped))) {
		const content = await readFile(join(unzipped, file), 'utf8');
		for (const line of content.split('\n').filter(Boolean)) {
			const decrypted = await cipher.decryptV2(line);
			rows.push(...decrypted.split('\n').map((row) => jsonParse<Record<string, unknown>>(row)));
		}
	}
	return rows;
}

describe('export:entities and import:entities', () => {
	let outputDir: string;

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['User', 'BinaryDataFile']);
		outputDir = await mkdtemp(join(tmpdir(), 'n8n-export-entities-test-'));
	});

	afterEach(async () => {
		await rm(outputDir, { recursive: true, force: true });
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('exports the user table once and imports people and service accounts back', async () => {
		const owner = await createOwner();
		const member = await createMember();
		const serviceAccount = await Container.get(ServiceAccountRepository).create({
			name: 'Deploy bot',
			role: GLOBAL_MEMBER_ROLE,
		});

		await Container.get(ExportService).exportEntities(outputDir, new Set(), undefined, {
			includeDataTableRows: false,
		});

		// The archive keeps the name of the table, as before service accounts.
		const unzipped = join(outputDir, 'unzipped');
		await decompressFolder(join(outputDir, 'entities.zip'), unzipped);
		const userTableFiles = (await readdir(unzipped)).filter((file) =>
			/^(user|person|serviceaccount)\./.test(file),
		);
		expect(userTableFiles).toEqual(['user.jsonl']);
		// Rows exported more than once would fail the import on a duplicate key.
		await Container.get(ImportService).importEntities(outputDir, true, undefined, true);

		const users = await Container.get(UserRepository).find();
		const kinds = Object.fromEntries(users.map((user) => [user.id, user.kind]));
		expect(kinds).toEqual({
			[owner.id]: 'person',
			[member.id]: 'person',
			[serviceAccount.id]: 'service',
		});
	});

	it('exports and imports the details of service accounts', async () => {
		const serviceAccountRepository = Container.get(ServiceAccountRepository);
		const { id } = await serviceAccountRepository.create({
			name: 'Deploy bot',
			role: GLOBAL_MEMBER_ROLE,
		});

		await Container.get(ExportService).exportEntities(outputDir, new Set(), undefined, {
			includeDataTableRows: false,
		});
		const unzipped = join(outputDir, 'unzipped');
		await decompressFolder(join(outputDir, 'entities.zip'), unzipped);
		expect(await readdir(unzipped)).toContain('serviceaccountdetails.jsonl');

		await Container.get(ImportService).importEntities(outputDir, true, undefined, true);

		const loaded = await serviceAccountRepository.findById(id);
		expect(loaded?.details.name).toBe('Deploy bot');
	});

	it('restores the bytes of a binary_data row', async () => {
		const fileId = await storeBinaryFile(ALL_BYTE_VALUES);

		await Container.get(ExportService).exportEntities(outputDir, new Set(), undefined, {
			includeDataTableRows: false,
		});
		await Container.get(ImportService).importEntities(outputDir, true, undefined, true);

		const restored = await Container.get(BinaryDataRepository).findContentByFileId(fileId);
		expect(restored).toEqual(ALL_BYTE_VALUES);
	});

	it('writes binary columns as base64 strings when binaryEncoding is base64', async () => {
		const fileId = await storeBinaryFile(ALL_BYTE_VALUES);

		await Container.get(ExportService).exportEntities(outputDir, new Set(), undefined, {
			includeDataTableRows: false,
			binaryEncoding: 'base64',
		});

		const rows = await binaryDataRowsInArchive(await unzipArchive(outputDir));
		const exported = rows.find((row) => row.fileId === fileId);
		expect(exported?.data).toBe(ALL_BYTE_VALUES.toString('base64'));
	});

	it('restores the bytes of a binary_data row from a base64 archive', async () => {
		const fileId = await storeBinaryFile(ALL_BYTE_VALUES);

		await Container.get(ExportService).exportEntities(outputDir, new Set(), undefined, {
			includeDataTableRows: false,
			binaryEncoding: 'base64',
		});
		await Container.get(ImportService).importEntities(outputDir, true, undefined, true);

		const restored = await Container.get(BinaryDataRepository).findContentByFileId(fileId);
		expect(restored).toEqual(ALL_BYTE_VALUES);
	});

	it('rejects a binary value above the limit for its encoding before writing the archive', async () => {
		const BUFFER_ENCODING_LIMIT_BYTES = 64 * 1024 * 1024;
		const fileId = await storeBinaryFile(Buffer.alloc(BUFFER_ENCODING_LIMIT_BYTES + 1));

		const error = await Container.get(ExportService)
			.exportEntities(outputDir, new Set(), undefined, { includeDataTableRows: false })
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(UserError);
		expect(error).toMatchObject({
			message: expect.stringMatching(new RegExp(`binary_data.*${fileId}`)),
		});
		expect(await readdir(outputDir)).toEqual([]);
	});
});
