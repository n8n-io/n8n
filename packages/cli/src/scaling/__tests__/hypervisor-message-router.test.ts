import { mock } from 'vitest-mock-extended';

import {
	HypervisorMessageRouter,
	type HypervisorMessageHandler,
	type HypervisorWorker,
} from '../hypervisor-message-router';

const makeHandler = (prefix: string): HypervisorMessageHandler => ({
	prefix,
	onMessage: vi.fn(),
	onExit: vi.fn(),
	onTick: vi.fn(),
});

describe('HypervisorMessageRouter', () => {
	const worker = mock<HypervisorWorker>({ id: 1 });

	it('routes a message only to the handler whose prefix matches', () => {
		const router = new HypervisorMessageRouter();
		const leader = makeHandler('leader:');
		const registry = makeHandler('registry:');
		router.register(leader);
		router.register(registry);

		router.handleMessage(worker, { type: 'registry:query', requestId: 3 });

		expect(registry.onMessage).toHaveBeenCalledWith(
			worker,
			{ type: 'registry:query', requestId: 3 },
			expect.any(Number),
		);
		expect(leader.onMessage).not.toHaveBeenCalled();
	});

	it('ignores messages without a string type', () => {
		const router = new HypervisorMessageRouter();
		const handler = makeHandler('leader:');
		router.register(handler);

		router.handleMessage(worker, undefined);
		router.handleMessage(worker, { notType: 1 });

		expect(handler.onMessage).not.toHaveBeenCalled();
	});

	it('forwards exits and ticks to every handler', () => {
		const router = new HypervisorMessageRouter();
		const a = makeHandler('a:');
		const b = makeHandler('b:');
		router.register(a);
		router.register(b);

		router.handleExit(worker);
		router.tick(1000);

		expect(a.onExit).toHaveBeenCalledWith(worker);
		expect(b.onExit).toHaveBeenCalledWith(worker);
		expect(a.onTick).toHaveBeenCalledWith(1000);
		expect(b.onTick).toHaveBeenCalledWith(1000);
	});
});
