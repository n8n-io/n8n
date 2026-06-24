import type { UserLoginSession, UserLoginSessionRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { LoginSessionService } from '@/auth/login-session.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

describe('LoginSessionService', () => {
	const repository = mock<UserLoginSessionRepository>();
	const service = new LoginSessionService(repository);

	beforeEach(() => jest.resetAllMocks());

	describe('create', () => {
		it('should insert a session row keyed by the jti, truncating long values', async () => {
			await service.create({
				userId: 'user-1',
				jti: 'session-1',
				browserIdHash: 'hash',
				userAgent: 'a'.repeat(600),
				ipAddress: '10.0.0.1',
				expiresAt: new Date('2024-01-08T00:00:00.000Z'),
			});

			expect(repository.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'session-1',
					userId: 'user-1',
					userAgent: 'a'.repeat(512),
				}),
			);
		});
	});

	describe('refreshExpiry', () => {
		it('updates the row expiry and last-active', async () => {
			const expiresAt = new Date('2024-01-15T00:00:00.000Z');

			await service.refreshExpiry('session-1', expiresAt);

			expect(repository.update).toHaveBeenCalledWith(
				{ id: 'session-1' },
				{ expiresAt, lastActiveAt: expect.any(Date) },
			);
		});
	});

	describe('touchIfStale', () => {
		it('asks the repo to bump lastActiveAt only when stale', async () => {
			await service.touchIfStale('touch-jti');

			expect(repository.touchLastActive).toHaveBeenCalledWith('touch-jti', expect.any(Date));
		});
	});

	describe('isActive', () => {
		it('should report a session active only when its row exists', async () => {
			repository.existsBy.mockResolvedValueOnce(true);
			expect(await service.isActive('session-1')).toBe(true);

			repository.existsBy.mockResolvedValueOnce(false);
			expect(await service.isActive('missing')).toBe(false);
		});
	});

	describe('listForUser', () => {
		it('should map rows to DTOs and flag the current session', async () => {
			repository.findActiveByUser.mockResolvedValue([
				mock<UserLoginSession>({
					id: 'session-1',
					userAgent: 'Mozilla',
					ipAddress: '10.0.0.1',
					lastActiveAt: new Date('2024-01-02T00:00:00.000Z'),
					createdAt: new Date('2024-01-01T00:00:00.000Z'),
					expiresAt: new Date('2024-01-08T00:00:00.000Z'),
				}),
				mock<UserLoginSession>({
					id: 'session-2',
					userAgent: null,
					ipAddress: null,
					lastActiveAt: null,
					createdAt: new Date('2024-01-01T00:00:00.000Z'),
					expiresAt: new Date('2024-01-08T00:00:00.000Z'),
				}),
			]);

			const result = await service.listForUser('user-1', 'session-1');

			expect(result[0]).toMatchObject({
				id: 'session-1',
				current: true,
				lastActiveAt: expect.any(String),
			});
			expect(result[1]).toMatchObject({ id: 'session-2', current: false, lastActiveAt: null });
		});
	});

	describe('revokeForUser', () => {
		it('should throw NotFoundError when nothing was removed', async () => {
			repository.deleteByIdForUser.mockResolvedValue(0);

			await expect(service.revokeForUser('user-1', 'missing')).rejects.toThrow(NotFoundError);
		});

		it('should resolve when a row was removed', async () => {
			repository.deleteByIdForUser.mockResolvedValue(1);

			await expect(service.revokeForUser('user-1', 'session-1')).resolves.toBeUndefined();
		});
	});

	describe('revokeAllOthers', () => {
		it('should delete every session except the one to keep', async () => {
			repository.deleteAllForUserExcept.mockResolvedValue(2);

			const count = await service.revokeAllOthers('user-1', 'session-1');

			expect(repository.deleteAllForUserExcept).toHaveBeenCalledWith('user-1', 'session-1');
			expect(count).toBe(2);
		});
	});
});
