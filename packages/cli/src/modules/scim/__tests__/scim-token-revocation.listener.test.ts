import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import type { User, UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ScimTokenRevocationListener } from '../scim-token-revocation.listener';
import type { ScimTokenService } from '../scim-token.service';

type Handler = (event: Record<string, unknown>) => Promise<void>;

describe('ScimTokenRevocationListener', () => {
	const logger = mock<Logger>();
	const eventService = mock<EventService>();
	const userRepository = mock<UserRepository>();
	const scimTokenService = mock<ScimTokenService>();
	const user = mock<User>({ id: 'user-1' });

	let handlers: Map<string, Handler>;

	beforeEach(() => {
		vi.clearAllMocks();
		new ScimTokenRevocationListener(logger, eventService, userRepository, scimTokenService);

		handlers = new Map(
			eventService.on.mock.calls.map(([eventName, handler]) => [
				eventName as string,
				handler as Handler,
			]),
		);
	});

	it('listens to every event that changes a global role', () => {
		expect([...handlers.keys()]).toEqual([
			'user-changed-role',
			'sso-user-instance-role-updated',
			'token-exchange-role-updated',
		]);
	});

	describe.each([
		['user-changed-role', { targetUserId: 'user-1' }],
		['sso-user-instance-role-updated', { userId: 'user-1', role: 'global:member' }],
		[
			'token-exchange-role-updated',
			{
				userId: 'user-1',
				previousRole: 'global:admin',
				newRole: 'global:member',
				kid: 'kid',
				issuer: 'issuer',
			},
		],
	])('on %s', (eventName, event) => {
		const emit = async () => await handlers.get(eventName)!(event);

		it('deletes the token when the new role has no scim:manage', async () => {
			userRepository.findByIdWithRole.mockResolvedValue(user);
			scimTokenService.canHoldToken.mockReturnValue(false);

			await emit();

			expect(userRepository.findByIdWithRole).toHaveBeenCalledWith('user-1');
			expect(scimTokenService.deleteAllScimApiKeysForUser).toHaveBeenCalledWith(user);
		});

		it('keeps the token when the new role still has scim:manage', async () => {
			userRepository.findByIdWithRole.mockResolvedValue(user);
			scimTokenService.canHoldToken.mockReturnValue(true);

			await emit();

			expect(scimTokenService.deleteAllScimApiKeysForUser).not.toHaveBeenCalled();
		});
	});

	it('does nothing when the user no longer exists', async () => {
		userRepository.findByIdWithRole.mockResolvedValue(null);

		await handlers.get('user-changed-role')!({ targetUserId: 'user-1' });

		expect(scimTokenService.deleteAllScimApiKeysForUser).not.toHaveBeenCalled();
	});

	it('logs a failure instead of throwing', async () => {
		userRepository.findByIdWithRole.mockRejectedValue(new Error('db down'));

		await expect(
			handlers.get('sso-user-instance-role-updated')!({ userId: 'user-1', role: 'global:member' }),
		).resolves.toBeUndefined();
		expect(logger.error).toHaveBeenCalled();
	});
});
