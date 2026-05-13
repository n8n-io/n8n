import { testDb, testModules } from '@n8n/backend-test-utils';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';
import { createHash } from 'node:crypto';

import { ChatAuthIdentityRepository } from '@/modules/sso-chat/repositories/chat-auth-identity.repository';
import { ChatClientCodeRepository } from '@/modules/sso-chat/repositories/chat-client-code.repository';
import { ChatAuthenticationService } from '@/modules/sso-chat/services/chat-auth.service';

import { createUser } from '../shared/db/users';

const hashCode = (code: string) => createHash('sha256').update(code).digest().toString('base64');

describe('ChatAuthenticationService', () => {
	let service: ChatAuthenticationService;
	let authIdentityRepo: ChatAuthIdentityRepository;
	let clientCodeRepo: ChatClientCodeRepository;
	let userRepo: UserRepository;

	beforeAll(async () => {
		await testModules.loadModules(['sso-chat']);
		await testDb.init();
		service = Container.get(ChatAuthenticationService);
		authIdentityRepo = Container.get(ChatAuthIdentityRepository);
		clientCodeRepo = Container.get(ChatClientCodeRepository);
		userRepo = Container.get(UserRepository);
	});

	afterEach(async () => {
		await authIdentityRepo.delete({});
		await clientCodeRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('createVerificationCode', () => {
		it('returns a 9-digit numeric code and persists its hash', async () => {
			const code = await service.createVerificationCode('tg-123', 'telegram');

			expect(code).toMatch(/^\d{9}$/);

			const row = await clientCodeRepo.findOneBy({
				providerId: 'tg-123',
				providerType: 'telegram',
			});
			expect(row).not.toBeNull();
			expect(row!.codeHash).toBe(hashCode(code));
		});

		it('sets expiresAt approximately at now + validForSeconds', async () => {
			const before = Date.now();
			await service.createVerificationCode('tg-123', 'telegram', 120);
			const after = Date.now();

			const row = await clientCodeRepo.findOneBy({
				providerId: 'tg-123',
				providerType: 'telegram',
			});
			const expiresMs = row!.expiresAt.getTime();
			expect(expiresMs).toBeGreaterThanOrEqual(before + 120_000);
			expect(expiresMs).toBeLessThanOrEqual(after + 120_000);
		});

		it('defaults validForSeconds to 300 when omitted', async () => {
			const before = Date.now();
			await service.createVerificationCode('tg-default', 'telegram');
			const after = Date.now();

			const row = await clientCodeRepo.findOneBy({
				providerId: 'tg-default',
				providerType: 'telegram',
			});
			const expiresMs = row!.expiresAt.getTime();
			expect(expiresMs).toBeGreaterThanOrEqual(before + 300_000);
			expect(expiresMs).toBeLessThanOrEqual(after + 300_000);
		});

		it('throws OperationalError when the chat user is already linked', async () => {
			const user = await createUser();
			await authIdentityRepo.save({
				userId: user.id,
				providerId: 'tg-linked',
				providerType: 'telegram',
			});

			await expect(service.createVerificationCode('tg-linked', 'telegram')).rejects.toThrow(
				OperationalError,
			);

			const codeRow = await clientCodeRepo.findOneBy({
				providerId: 'tg-linked',
				providerType: 'telegram',
			});
			expect(codeRow).toBeNull();
		});

		it('replaces a previous pending code for the same (providerId, providerType)', async () => {
			const firstCode = await service.createVerificationCode('tg-reissue', 'telegram');
			const secondCode = await service.createVerificationCode('tg-reissue', 'telegram');

			expect(secondCode).not.toBe(firstCode);

			const rows = await clientCodeRepo.findBy({
				providerId: 'tg-reissue',
				providerType: 'telegram',
			});
			expect(rows).toHaveLength(1);
			expect(rows[0].codeHash).toBe(hashCode(secondCode));
			expect(rows[0].codeHash).not.toBe(hashCode(firstCode));
		});

		it('produces distinct codes across calls', async () => {
			const codes = new Set<string>();
			for (let i = 0; i < 5; i++) {
				codes.add(await service.createVerificationCode(`tg-${i}`, 'telegram'));
			}
			expect(codes.size).toBe(5);
		});

		it('scopes codes per provider — telegram and slack can have separate pending codes for the same id', async () => {
			const tgCode = await service.createVerificationCode('shared-id', 'telegram');
			const slCode = await service.createVerificationCode('shared-id', 'slack');

			expect(tgCode).not.toBe(slCode);

			const allRows = await clientCodeRepo.findBy({ providerId: 'shared-id' });
			expect(allRows).toHaveLength(2);
		});
	});

	describe('validateUserCodeAndLink', () => {
		it('links the n8n user, removes the code, and persists the identity', async () => {
			const user = await createUser();
			const code = await service.createVerificationCode('tg-happy', 'telegram');

			await service.validateUserCodeAndLink(user.id, 'telegram', code);

			const identity = await authIdentityRepo.findOneBy({
				providerId: 'tg-happy',
				providerType: 'telegram',
			});
			expect(identity).not.toBeNull();
			expect(identity!.userId).toBe(user.id);

			const codeRow = await clientCodeRepo.findOneBy({
				providerId: 'tg-happy',
				providerType: 'telegram',
			});
			expect(codeRow).toBeNull();
		});

		it('throws OperationalError when the code is unknown', async () => {
			const user = await createUser();

			await expect(
				service.validateUserCodeAndLink(user.id, 'telegram', '999999999'),
			).rejects.toThrow(OperationalError);

			const identities = await authIdentityRepo.find();
			expect(identities).toHaveLength(0);
		});

		it('rejects a code issued for a different provider', async () => {
			const user = await createUser();
			const code = await service.createVerificationCode('shared-id', 'telegram');

			await expect(service.validateUserCodeAndLink(user.id, 'slack', code)).rejects.toThrow(
				OperationalError,
			);

			const identities = await authIdentityRepo.find();
			expect(identities).toHaveLength(0);
			const codeRow = await clientCodeRepo.findOneBy({
				providerId: 'shared-id',
				providerType: 'telegram',
			});
			expect(codeRow).not.toBeNull();
		});

		// The service calls delete() then throws on expiry inside the same transaction,
		// so the throw rolls the delete back. The code row persists until an external
		// sweeper removes it. This test pins that behavior so a refactor cannot quietly
		// strip the transaction wrapper.
		it('throws on an expired code and rolls back the delete (no identity created)', async () => {
			const user = await createUser();
			await clientCodeRepo.save({
				providerId: 'tg-expired',
				providerType: 'telegram',
				codeHash: hashCode('123456789'),
				expiresAt: new Date(Date.now() - 1000),
			});

			await expect(
				service.validateUserCodeAndLink(user.id, 'telegram', '123456789'),
			).rejects.toThrow(OperationalError);

			const codeRow = await clientCodeRepo.findOneBy({
				providerId: 'tg-expired',
				providerType: 'telegram',
			});
			expect(codeRow).not.toBeNull();
			const identity = await authIdentityRepo.findOneBy({
				providerId: 'tg-expired',
				providerType: 'telegram',
			});
			expect(identity).toBeNull();
		});

		it('cannot be replayed — a consumed code is rejected on the second call', async () => {
			const user = await createUser();
			const code = await service.createVerificationCode('tg-replay', 'telegram');

			await service.validateUserCodeAndLink(user.id, 'telegram', code);
			await expect(service.validateUserCodeAndLink(user.id, 'telegram', code)).rejects.toThrow(
				OperationalError,
			);
		});
	});

	describe('getUserByChatUserId', () => {
		it('returns the linked user', async () => {
			const user = await createUser();
			const code = await service.createVerificationCode('tg-lookup', 'telegram');
			await service.validateUserCodeAndLink(user.id, 'telegram', code);

			const found = await service.getUserByChatUserId('tg-lookup', 'telegram');
			expect(found).not.toBeNull();
			expect(found!.id).toBe(user.id);
		});

		it('returns null when no identity exists', async () => {
			const found = await service.getUserByChatUserId('tg-unknown', 'telegram');
			expect(found).toBeNull();
		});

		it('returns null when the chat id is linked under a different provider', async () => {
			const user = await createUser();
			await authIdentityRepo.save({
				userId: user.id,
				providerId: 'shared-id',
				providerType: 'telegram',
			});

			const found = await service.getUserByChatUserId('shared-id', 'slack');
			expect(found).toBeNull();
		});

		it('returns null after the linked user has been deleted (FK cascade wipes the identity)', async () => {
			const user = await createUser();
			await authIdentityRepo.save({
				userId: user.id,
				providerId: 'tg-cascade',
				providerType: 'telegram',
			});

			await userRepo.delete({ id: user.id });

			const found = await service.getUserByChatUserId('tg-cascade', 'telegram');
			expect(found).toBeNull();
		});
	});

	describe('getChatProvidersForUser', () => {
		it('returns an empty array when the user has no linked chat identities', async () => {
			const user = await createUser();
			expect(await service.getChatProvidersForUser(user.id)).toEqual([]);
		});

		it('returns deduped providers for a user linked to telegram and slack', async () => {
			const user = await createUser();
			await authIdentityRepo.save([
				{ userId: user.id, providerId: 'tg-1', providerType: 'telegram' },
				{ userId: user.id, providerId: 'sl-1', providerType: 'slack' },
			]);

			const providers = await service.getChatProvidersForUser(user.id);
			expect(providers.sort()).toEqual(['slack', 'telegram']);
		});

		it('dedupes when the user has multiple identities under the same provider', async () => {
			const user = await createUser();
			await authIdentityRepo.save([
				{ userId: user.id, providerId: 'tg-a', providerType: 'telegram' },
				{ userId: user.id, providerId: 'tg-b', providerType: 'telegram' },
			]);

			expect(await service.getChatProvidersForUser(user.id)).toEqual(['telegram']);
		});

		it('only returns providers belonging to the requested user', async () => {
			const userA = await createUser();
			const userB = await createUser();
			await authIdentityRepo.save([
				{ userId: userA.id, providerId: 'tg-a', providerType: 'telegram' },
				{ userId: userB.id, providerId: 'sl-b', providerType: 'slack' },
			]);

			expect(await service.getChatProvidersForUser(userA.id)).toEqual(['telegram']);
			expect(await service.getChatProvidersForUser(userB.id)).toEqual(['slack']);
		});
	});

	describe('unlinkUserFromProvider', () => {
		it('removes the matching (userId, providerType) identity', async () => {
			const user = await createUser();
			await authIdentityRepo.save({
				userId: user.id,
				providerId: 'tg-unlink',
				providerType: 'telegram',
			});

			await service.unlinkUserFromProvider(user.id, 'telegram');

			const remaining = await authIdentityRepo.findOneBy({
				providerId: 'tg-unlink',
				providerType: 'telegram',
			});
			expect(remaining).toBeNull();
		});

		it('leaves identities for other provider types intact', async () => {
			const user = await createUser();
			await authIdentityRepo.save([
				{ userId: user.id, providerId: 'tg-keep', providerType: 'telegram' },
				{ userId: user.id, providerId: 'sl-keep', providerType: 'slack' },
			]);

			await service.unlinkUserFromProvider(user.id, 'telegram');

			expect(
				await authIdentityRepo.findOneBy({
					providerId: 'sl-keep',
					providerType: 'slack',
				}),
			).not.toBeNull();
		});

		it('is idempotent for a non-existent link', async () => {
			const user = await createUser();
			await expect(service.unlinkUserFromProvider(user.id, 'telegram')).resolves.toBeUndefined();
		});

		it('does not affect another user with the same provider type', async () => {
			const userA = await createUser();
			const userB = await createUser();
			await authIdentityRepo.save([
				{ userId: userA.id, providerId: 'tg-a', providerType: 'telegram' },
				{ userId: userB.id, providerId: 'tg-b', providerType: 'telegram' },
			]);

			await service.unlinkUserFromProvider(userA.id, 'telegram');

			expect(
				await authIdentityRepo.findOneBy({
					providerId: 'tg-b',
					providerType: 'telegram',
				}),
			).not.toBeNull();
		});
	});
});
