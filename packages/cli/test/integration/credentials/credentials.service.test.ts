import type { User } from '@/databases/entities/User';
import type { CredentialsEntity } from '@/databases/entities/CredentialsEntity';
import { saveCredential, shareCredentialWithUsers } from '../shared/db/credentials';
import { createMember } from '../shared/db/users';
import { randomCredentialPayload } from '../shared/random';
import { SharedCredentialsRepository } from '@/databases/repositories/sharedCredentials.repository';
import Container from 'typedi';
import { CredentialsService } from '@/credentials/credentials.service';
import * as testDb from '../shared/testDb';

const credentialPayload = randomCredentialPayload();
let memberWhoOwnsCredential: User;
let memberWhoDoesNotOwnCredential: User;
let credential: CredentialsEntity;

beforeAll(async () => {
	await testDb.init();

	memberWhoOwnsCredential = await createMember();
	memberWhoDoesNotOwnCredential = await createMember();
	credential = await saveCredential(credentialPayload, {
		user: memberWhoOwnsCredential,
		role: 'credential:owner',
	});

	await shareCredentialWithUsers(credential, [memberWhoDoesNotOwnCredential]);
});

describe('credentials service', () => {
	describe('replaceCredentialContentsForSharee', () => {
		it('should replace the contents of the credential for sharee', async () => {
			const storedCredential = await Container.get(
				SharedCredentialsRepository,
			).findCredentialForUser(credential.id, memberWhoDoesNotOwnCredential, ['credential:read']);

			const decryptedData = Container.get(CredentialsService).decrypt(storedCredential!);

			const mergedCredentials = {
				id: credential.id,
				name: credential.name,
				type: credential.type,
				data: { accessToken: '' },
			};

			Container.get(CredentialsService).replaceCredentialContentsForSharee(
				memberWhoDoesNotOwnCredential,
				storedCredential!,
				decryptedData,
				mergedCredentials,
			);

			expect(mergedCredentials.data).toEqual({ accessToken: credentialPayload.data.accessToken });
		});
	});
});
