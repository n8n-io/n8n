import type { PushMessage } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { PushProxy, type PushSender } from '../push-proxy.service';

const message: PushMessage = { type: 'nodeDescriptionUpdated', data: {} };

describe('PushProxy', () => {
	it('drops messages when no provider is registered', () => {
		const proxy = new PushProxy();

		expect(() => proxy.broadcast(message)).not.toThrow();
		expect(() => proxy.sendToUsers(message, ['user-1'])).not.toThrow();
	});

	it('delegates broadcast to the registered provider', () => {
		const proxy = new PushProxy();
		const provider = mock<PushSender>();
		proxy.registerProvider(provider);

		proxy.broadcast(message);

		expect(provider.broadcast).toHaveBeenCalledWith(message);
	});

	it('delegates sendToUsers to the registered provider', () => {
		const proxy = new PushProxy();
		const provider = mock<PushSender>();
		proxy.registerProvider(provider);

		proxy.sendToUsers(message, ['user-1', 'user-2'], { excludePushRef: 'push-ref' });

		expect(provider.sendToUsers).toHaveBeenCalledWith(message, ['user-1', 'user-2'], {
			excludePushRef: 'push-ref',
		});
	});
});
