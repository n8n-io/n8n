import { EventEmitter } from 'events';
import { Readable } from 'stream';

import { getMessage } from './get-message';

function createMessage() {
	return new EventEmitter();
}

describe('getMessage', () => {
	it('should resolve with attributes and parts', async () => {
		const message = createMessage();
		const promise = getMessage(message as never);

		const bodyStream = Readable.from('hello');
		message.emit('body', bodyStream, { which: 'TEXT', size: 5 });
		message.emit('attributes', { uid: 42 });
		await new Promise((resolve) => bodyStream.on('end', resolve));
		message.emit('end');

		await expect(promise).resolves.toMatchObject({
			attributes: { uid: 42 },
			parts: [{ which: 'TEXT', size: 5, body: 'hello' }],
		});
	});

	it('should reject when the message emits an error', async () => {
		const message = createMessage();
		const promise = getMessage(message as never);

		message.emit('error', new Error('message error'));

		await expect(promise).rejects.toThrow('message error');
	});

	it('should reject when a body stream emits an error', async () => {
		const message = createMessage();
		const promise = getMessage(message as never);

		const bodyStream = new Readable({ read() {} });
		message.emit('body', bodyStream, { which: 'TEXT', size: 0 });
		bodyStream.emit('error', new Error('stream error'));

		await expect(promise).rejects.toThrow('stream error');
	});

	it('should not throw when a body stream emits multiple errors', async () => {
		const message = createMessage();
		const promise = getMessage(message as never);

		const bodyStream = new Readable({ read() {} });
		message.emit('body', bodyStream, { which: 'TEXT', size: 0 });
		bodyStream.emit('error', new Error('first error'));
		// Second error must not throw due to missing listener (would happen with 'once')
		expect(() => bodyStream.emit('error', new Error('second error'))).not.toThrow();

		await expect(promise).rejects.toThrow('first error');
	});
});
