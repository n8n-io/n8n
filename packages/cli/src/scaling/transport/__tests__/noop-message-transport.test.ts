import { NoopMessageTransport } from '../noop-message-transport';

describe('NoopMessageTransport', () => {
	it('does nothing on publish, subscribe, or shutdown', async () => {
		const transport = new NoopMessageTransport();
		const handler = vi.fn();

		await expect(transport.publish('chan', 'hello')).resolves.toBeUndefined();
		await expect(transport.subscribe('chan', handler)).resolves.toBeUndefined();
		expect(() => transport.shutdown()).not.toThrow();
		expect(handler).not.toHaveBeenCalled();
	});
});
