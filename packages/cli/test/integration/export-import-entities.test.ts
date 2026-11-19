import { testDb } from '@n8n/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, ServiceAccountRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ExportService } from '@/services/export.service';
import { ImportService } from '@/services/import.service';
import { decompressFolder } from '@/utils/compression.util';

import { createMember, createOwner } from './shared/db/users';

describe('export:entities and import:entities', () => {
	let outputDir: string;

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
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
});
