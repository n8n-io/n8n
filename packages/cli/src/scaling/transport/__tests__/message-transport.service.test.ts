import { mock } from 'vitest-mock-extended';

import type { MessageTransport } from '../message-transport.interface';
import { MessageTransportService } from '../message-transport.service';
import type { NoopMessageTransport } from '../noop-message-transport';

describe('MessageTransportService', () => {
	it('should default to the given noop transport', async () => {
		const noopMessageTransport = mock<NoopMessageTransport>();
		const service = new MessageTransportService(noopMessageTransport);

		await service.publish('chan', 'hello');

		expect(noopMessageTransport.publish).toHaveBeenCalledWith('chan', 'hello');
	});

	it('should delegate publish/subscribe/shutdown to whichever provider is set', async () => {
		const noopMessageTransport = mock<NoopMessageTransport>();
		const redisTransport = mock<MessageTransport>();
		const service = new MessageTransportService(noopMessageTransport);

		service.setProvider(redisTransport);
		const handler = vi.fn();
		await service.publish('chan', 'hello');
		await service.subscribe('chan', handler);
		await service.shutdown();

		expect(redisTransport.publish).toHaveBeenCalledWith('chan', 'hello');
		expect(redisTransport.subscribe).toHaveBeenCalledWith('chan', handler);
		expect(redisTransport.shutdown).toHaveBeenCalled();
		expect(noopMessageTransport.publish).not.toHaveBeenCalled();
	});
});
