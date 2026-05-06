import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

jest.mock('../instance-ai.service', () => ({
	InstanceAiService: jest.fn(),
}));

import type { EventService } from '@/events/event.service';

import { InstanceAiEventRelay } from '../instance-ai-event-relay.service';
import type { InstanceAiService } from '../instance-ai.service';

describe('InstanceAiEventRelay', () => {
	const makeRelay = () => {
		const scopedLogger = {
			debug: jest.fn(),
			error: jest.fn(),
		};
		const logger = {
			scoped: jest.fn().mockReturnValue(scopedLogger),
		} as unknown as Logger;
		const handlers = new Map<string, (payload: { targetUserId?: string }) => void>();
		const eventService = {
			on: jest.fn((eventName: string, handler: (payload: { targetUserId?: string }) => void) => {
				handlers.set(eventName, handler);
			}),
		} as unknown as EventService;
		const instanceAiService = mock<InstanceAiService>();

		new InstanceAiEventRelay(logger, eventService, instanceAiService);

		return { handlers, instanceAiService, scopedLogger };
	};

	it('revokes local gateway state when a user is deleted', () => {
		const { handlers, instanceAiService, scopedLogger } = makeRelay();
		instanceAiService.revokeGatewaySession.mockReturnValue(true);

		handlers.get('user-deleted')?.({ targetUserId: 'user-1' });

		expect(instanceAiService.revokeGatewaySession).toHaveBeenCalledWith('user-1');
		expect(scopedLogger.debug).toHaveBeenCalledWith(
			'Revoked local gateway session for deleted user',
			{ userId: 'user-1' },
		);
	});

	it('ignores deleted-user events without a target user id', () => {
		const { handlers, instanceAiService } = makeRelay();

		handlers.get('user-deleted')?.({});

		expect(instanceAiService.revokeGatewaySession).not.toHaveBeenCalled();
	});

	it('logs revocation failures', () => {
		const { handlers, instanceAiService, scopedLogger } = makeRelay();
		const error = new Error('boom');
		instanceAiService.revokeGatewaySession.mockImplementation(() => {
			throw error;
		});

		handlers.get('user-deleted')?.({ targetUserId: 'user-1' });

		expect(scopedLogger.error).toHaveBeenCalledWith(
			'Failed to revoke local gateway session for deleted user',
			{ userId: 'user-1', error },
		);
	});
});
