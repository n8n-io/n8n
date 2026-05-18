import { testDb, testModules } from '@n8n/backend-test-utils';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { ChatAuthIdentity } from '@/modules/sso-chat/entities/chat-auth-identity';
import { ChatClientCode } from '@/modules/sso-chat/entities/chat-client-code';
import { ChatAuthIdentityRepository } from '@/modules/sso-chat/repositories/chat-auth-identity.repository';
import { ChatClientCodeRepository } from '@/modules/sso-chat/repositories/chat-client-code.repository';

import { createUser } from '../shared/db/users';

describe('sso-chat repositories', () => {
	let authIdentityRepo: ChatAuthIdentityRepository;
	let clientCodeRepo: ChatClientCodeRepository;

	beforeAll(async () => {
		await testModules.loadModules(['sso-chat']);
		await testDb.init();
		authIdentityRepo = Container.get(ChatAuthIdentityRepository);
		clientCodeRepo = Container.get(ChatClientCodeRepository);
	});

	afterEach(async () => {
		await authIdentityRepo.delete({});
		await clientCodeRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('ChatAuthIdentityRepository', () => {
		it('persists and retrieves an identity by its composite key', async () => {
			const user = await createUser();

			await authIdentityRepo.save(
				authIdentityRepo.create({
					userId: user.id,
					providerId: 'tg-12345',
					providerType: 'telegram',
				}),
			);

			const found = await authIdentityRepo.findOneBy({
				providerId: 'tg-12345',
				providerType: 'telegram',
			});

			expect(found).not.toBeNull();
			expect(found!.userId).toBe(user.id);
			expect(found!.providerId).toBe('tg-12345');
			expect(found!.providerType).toBe('telegram');
			expect(found!.createdAt).toBeInstanceOf(Date);
			expect(found!.updatedAt).toBeInstanceOf(Date);
		});

		it('allows the same user to link multiple providers', async () => {
			const user = await createUser();

			await authIdentityRepo.save([
				authIdentityRepo.create({
					userId: user.id,
					providerId: 'tg-1',
					providerType: 'telegram',
				}),
				authIdentityRepo.create({
					userId: user.id,
					providerId: 'sl-1',
					providerType: 'slack',
				}),
			]);

			const identities = await authIdentityRepo.findBy({ userId: user.id });
			expect(identities).toHaveLength(2);
			expect(identities.map((i) => i.providerType).sort()).toEqual(['slack', 'telegram']);
		});

		it('allows the same providerId across different providerTypes', async () => {
			const user = await createUser();

			await authIdentityRepo.save([
				authIdentityRepo.create({
					userId: user.id,
					providerId: 'shared-id',
					providerType: 'telegram',
				}),
				authIdentityRepo.create({
					userId: user.id,
					providerId: 'shared-id',
					providerType: 'slack',
				}),
			]);

			const all = await authIdentityRepo.findBy({ providerId: 'shared-id' });
			expect(all).toHaveLength(2);
		});

		it('rejects duplicate (providerId, providerType) pairs', async () => {
			const userA = await createUser();
			const userB = await createUser();

			await authIdentityRepo.save(
				authIdentityRepo.create({
					userId: userA.id,
					providerId: 'tg-conflict',
					providerType: 'telegram',
				}),
			);

			await expect(
				authIdentityRepo.insert({
					userId: userB.id,
					providerId: 'tg-conflict',
					providerType: 'telegram',
				}),
			).rejects.toThrow();
		});

		it('rejects identities referencing a non-existent user', async () => {
			await expect(
				authIdentityRepo.insert({
					userId: uuid(),
					providerId: 'tg-orphan',
					providerType: 'telegram',
				}),
			).rejects.toThrow();
		});

		it('cascades deletes when the linked user is removed', async () => {
			const user = await createUser();

			await authIdentityRepo.save(
				authIdentityRepo.create({
					userId: user.id,
					providerId: 'tg-cascade',
					providerType: 'telegram',
				}),
			);

			await Container.get(UserRepository).delete({ id: user.id });

			const remaining = await authIdentityRepo.findOneBy({
				providerId: 'tg-cascade',
				providerType: 'telegram',
			});
			expect(remaining).toBeNull();
		});

		it('looks up by userId and providerType', async () => {
			const user = await createUser();

			await authIdentityRepo.save(
				authIdentityRepo.create({
					userId: user.id,
					providerId: 'tg-lookup',
					providerType: 'telegram',
				}),
			);

			const found = await authIdentityRepo.findOneBy({
				userId: user.id,
				providerType: 'telegram',
			});

			expect(found).not.toBeNull();
			expect(found).toBeInstanceOf(ChatAuthIdentity);
			expect(found!.providerId).toBe('tg-lookup');
		});
	});

	describe('ChatClientCodeRepository', () => {
		const futureDate = () => new Date(Date.now() + 60 * 60 * 1000);

		it('persists and retrieves a client code by its composite key', async () => {
			const expiresAt = futureDate();
			await clientCodeRepo.save(
				clientCodeRepo.create({
					providerId: 'tg-12345',
					providerType: 'telegram',
					codeHash: 'hashed-code-1',
					expiresAt,
				}),
			);

			const found = await clientCodeRepo.findOneBy({
				providerId: 'tg-12345',
				providerType: 'telegram',
			});

			expect(found).not.toBeNull();
			expect(found).toBeInstanceOf(ChatClientCode);
			expect(found!.codeHash).toBe('hashed-code-1');
			expect(found!.expiresAt.getTime()).toBe(expiresAt.getTime());
			expect(found!.createdAt).toBeInstanceOf(Date);
			expect(found!.updatedAt).toBeInstanceOf(Date);
		});

		it('allows the same providerId across different providerTypes', async () => {
			const expiresAt = futureDate();
			await clientCodeRepo.save([
				clientCodeRepo.create({
					providerId: 'shared-id',
					providerType: 'telegram',
					codeHash: 'hash-tg',
					expiresAt,
				}),
				clientCodeRepo.create({
					providerId: 'shared-id',
					providerType: 'slack',
					codeHash: 'hash-sl',
					expiresAt,
				}),
			]);

			const all = await clientCodeRepo.findBy({ providerId: 'shared-id' });
			expect(all).toHaveLength(2);
		});

		it('rejects duplicate (providerId, providerType) pairs', async () => {
			const expiresAt = futureDate();
			await clientCodeRepo.save(
				clientCodeRepo.create({
					providerId: 'tg-dup',
					providerType: 'telegram',
					codeHash: 'hash-1',
					expiresAt,
				}),
			);

			await expect(
				clientCodeRepo.insert({
					providerId: 'tg-dup',
					providerType: 'telegram',
					codeHash: 'hash-2',
					expiresAt,
				}),
			).rejects.toThrow();
		});

		it('updates codeHash and expiresAt on an existing row', async () => {
			const initialExpiry = futureDate();
			await clientCodeRepo.save(
				clientCodeRepo.create({
					providerId: 'tg-update',
					providerType: 'telegram',
					codeHash: 'original-hash',
					expiresAt: initialExpiry,
				}),
			);

			const newExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000);
			await clientCodeRepo.update(
				{ providerId: 'tg-update', providerType: 'telegram' },
				{ codeHash: 'rotated-hash', expiresAt: newExpiry },
			);

			const found = await clientCodeRepo.findOneBy({
				providerId: 'tg-update',
				providerType: 'telegram',
			});
			expect(found!.codeHash).toBe('rotated-hash');
			expect(found!.expiresAt.getTime()).toBe(newExpiry.getTime());
		});

		it('deletes by composite key', async () => {
			const expiresAt = futureDate();
			await clientCodeRepo.save(
				clientCodeRepo.create({
					providerId: 'tg-delete',
					providerType: 'telegram',
					codeHash: 'to-delete',
					expiresAt,
				}),
			);

			await clientCodeRepo.delete({ providerId: 'tg-delete', providerType: 'telegram' });

			const found = await clientCodeRepo.findOneBy({
				providerId: 'tg-delete',
				providerType: 'telegram',
			});
			expect(found).toBeNull();
		});
	});
});
