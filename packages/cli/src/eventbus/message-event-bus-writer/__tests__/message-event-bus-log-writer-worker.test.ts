import path from 'node:path';
import { Worker } from 'node:worker_threads';

describe('Message event log worker prototype policy', () => {
	it.each([true, false])('uses the prototype policy when enabled=%s', async (enabled) => {
		const worker = new Worker(
			`const { parentPort, workerData } = require('node:worker_threads');
require(workerData.workerPath);
parentPort.postMessage({
	object: Object.isExtensible(Object.prototype),
	array: Object.isExtensible(Array.prototype),
	function: Object.isExtensible(Function.prototype),
	number: Object.isExtensible(Number.prototype),
	boolean: Object.isExtensible(Boolean.prototype),
	string: Object.isExtensible(String.prototype),
});`,
			{
				eval: true,
				workerData: {
					prototypeHardeningEnabled: enabled,
					workerPath: path.resolve(
						__dirname,
						'../../../../dist/eventbus/message-event-bus-writer/message-event-bus-log-writer-worker.js',
					),
				},
			},
		);
		let timer: NodeJS.Timeout | undefined;
		try {
			const state = await new Promise<unknown>((resolve, reject) => {
				timer = setTimeout(
					() => reject(new Error('The log worker did not report its state')),
					5_000,
				);
				worker.once('message', resolve);
				worker.once('error', reject);
			});

			expect(state).toEqual({
				object: !enabled,
				array: !enabled,
				function: !enabled,
				number: !enabled,
				boolean: !enabled,
				string: true,
			});
		} finally {
			clearTimeout(timer);
			await worker.terminate();
		}
	});
});
