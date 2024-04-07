import fsp from 'node:fs/promises';
import Container from 'typedi';
import { mock } from 'jest-mock-extended';
import * as utils from 'n8n-workflow';
import { Cipher } from 'n8n-core';
import { nanoid } from 'nanoid';
import type { InstanceSettings } from 'n8n-core';

import * as testDb from '../shared/testDb';
import { SourceControlImportService } from '@/environments/sourceControl/sourceControlImport.service.ee';
import { createMember, getGlobalOwner } from '../shared/db/users';
import { SharedCredentialsRepository } from '@/databases/repositories/sharedCredentials.repository';
import { mockInstance } from '../../shared/mocking';
import type { SourceControlledFile } from '@/environments/sourceControl/types/sourceControlledFile';
import type { ExportableCredential } from '@/environments/sourceControl/types/exportableCredential';

describe('SourceControlImportService', () => {
	let service: SourceControlImportService;
	const cipher = mockInstance(Cipher);

	beforeAll(async () => {
		service = new SourceControlImportService(
			mock(),
			mock(),
			mock(),
			mock(),
			mock<InstanceSettings>({ n8nFolder: '/some-path' }),
		);

		await testDb.init();
	});

	afterEach(async () => {
		await testDb.truncate(['Credentials', 'SharedCredentials']);

		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('importCredentialsFromWorkFolder()', () => {
		describe('if user email specified by `ownedBy` exists at target instance', () => {
			it('should assign credential ownership to original user', async () => {
				const [importingUser, member] = await Promise.all([getGlobalOwner(), createMember()]);

				fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

				const CREDENTIAL_ID = nanoid();

				const stub: ExportableCredential = {
					id: CREDENTIAL_ID,
					name: 'My Credential',
					type: 'someCredentialType',
					data: {},
					ownedBy: member.email, // user at source instance owns credential
				};

				jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

				cipher.encrypt.mockReturnValue('some-encrypted-data');

				await service.importCredentialsFromWorkFolder(
					[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
					importingUser.id,
				);

				const sharing = await Container.get(SharedCredentialsRepository).findOneBy({
					credentialsId: CREDENTIAL_ID,
					userId: member.id,
					role: 'credential:owner',
				});

				expect(sharing).toBeTruthy(); // same user at target instance owns credential
			});
		});

		describe('if user email specified by `ownedBy` is `null`', () => {
			it('should assign credential ownership to importing user', async () => {
				const importingUser = await getGlobalOwner();

				fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

				const CREDENTIAL_ID = nanoid();

				const stub: ExportableCredential = {
					id: CREDENTIAL_ID,
					name: 'My Credential',
					type: 'someCredentialType',
					data: {},
					ownedBy: null,
				};

				jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

				cipher.encrypt.mockReturnValue('some-encrypted-data');

				await service.importCredentialsFromWorkFolder(
					[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
					importingUser.id,
				);

				const sharing = await Container.get(SharedCredentialsRepository).findOneBy({
					credentialsId: CREDENTIAL_ID,
					userId: importingUser.id,
					role: 'credential:owner',
				});

				expect(sharing).toBeTruthy(); // original user has no email, so importing user owns credential
			});
		});

		describe('if user email specified by `ownedBy` does not exist at target instance', () => {
			it('should assign credential ownership to importing user', async () => {
				const importingUser = await getGlobalOwner();

				fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

				const CREDENTIAL_ID = nanoid();

				const stub: ExportableCredential = {
					id: CREDENTIAL_ID,
					name: 'My Credential',
					type: 'someCredentialType',
					data: {},
					ownedBy: 'user@test.com', // user at source instance owns credential
				};

				jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

				cipher.encrypt.mockReturnValue('some-encrypted-data');

				await service.importCredentialsFromWorkFolder(
					[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
					importingUser.id,
				);

				const sharing = await Container.get(SharedCredentialsRepository).findOneBy({
					credentialsId: CREDENTIAL_ID,
					userId: importingUser.id,
					role: 'credential:owner',
				});

				expect(sharing).toBeTruthy(); // original user missing, so importing user owns credential
			});
		});
	});
});
