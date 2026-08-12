import { mock } from 'vitest-mock-extended';

import type { IpcMessageTransport } from '../ipc-message-transport';
import type { MessageTransport } from '../message-transport.interface';
import { MessageTransportService } from '../message-transport.service';

describe('MessageTransportService', () => {
	it('should default to the given IPC transport', async () => {
		const ipcMessageTransport = mock<IpcMessageTransport>();
		const service = new MessageTransportService(ipcMessageTransport);

		await service.publish('chan', 'hello');

		expect(ipcMessageTransport.publish).toHaveBeenCalledWith('chan', 'hello');
	});

	it('should delegate publish/subscribe/shutdown to whichever provider is set', async () => {
		const ipcMessageTransport = mock<IpcMessageTransport>();
		const redisTransport = mock<MessageTransport>();
		const service = new MessageTransportService(ipcMessageTransport);

		service.setProvider(redisTransport);
		const handler = vi.fn();
		await service.publish('chan', 'hello');
		await service.subscribe('chan', handler);
		await service.shutdown();

		expect(redisTransport.publish).toHaveBeenCalledWith('chan', 'hello');
		expect(redisTransport.subscribe).toHaveBeenCalledWith('chan', handler);
		expect(redisTransport.shutdown).toHaveBeenCalled();
		expect(ipcMessageTransport.publish).not.toHaveBeenCalled();
	});
});
