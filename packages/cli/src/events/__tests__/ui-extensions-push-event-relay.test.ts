import { EventService } from '@n8n/backend-services';
import { mock } from 'vitest-mock-extended';

import { UiExtensionsPushEventRelay } from '@/events/relays/ui-extensions-push.event-relay';
import type { Push } from '@/push';

describe('UiExtensionsPushEventRelay', () => {
	const push = mock<Push>();
	const eventService = new EventService();

	beforeAll(() => {
		new UiExtensionsPushEventRelay(eventService, push).init();
	});

	beforeEach(() => vi.clearAllMocks());

	it.each(['saved', 'removed'] as const)(
		'pushes one change message to the user when a record is %s',
		(change) => {
			eventService.emit('ui-extension-changed', {
				userId: 'user-1',
				extensionId: 'v1',
				kind: 'page',
				change,
			});

			expect(push.sendToUsers).toHaveBeenCalledExactlyOnceWith(
				{ type: 'uiExtensionViewsChanged', data: {} },
				['user-1'],
			);
		},
	);

	it('pushes nothing before another event', () => {
		eventService.emit('session-started', {});

		expect(push.sendToUsers).not.toHaveBeenCalled();
	});
});
