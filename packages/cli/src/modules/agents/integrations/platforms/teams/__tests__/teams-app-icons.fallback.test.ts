import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { EventEmitter } from 'node:events';

import { renderTeamsAppIcons } from '../teams-app-icons';

// A separate file, so the stand-in icon set does not reach the tests that read the real one.
vi.mock('@iconify-json/lucide', () => ({
	icons: {
		width: 24,
		height: 24,
		icons: {
			line: { body: '<path stroke="currentColor" stroke-width="2" d="M2 2L22 22"/>' },
			unclosed: { body: '<g stroke="currentColor"' },
		},
	},
}));

const fake = vi.hoisted(() => ({
	behave: undefined as ((worker: EventEmitter) => void) | undefined,
}));

vi.mock('node:worker_threads', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:worker_threads')>();
	const { EventEmitter: Emitter } = await import('node:events');
	function Worker(...args: ConstructorParameters<typeof actual.Worker>) {
		const behave = fake.behave;
		if (!behave) return new actual.Worker(...args);
		const worker = Object.assign(new Emitter(), { terminate: async () => 0 });
		setImmediate(() => {
			worker.emit('online');
			behave(worker);
		});
		return worker;
	}
	return { ...actual, Worker };
});

const logger = mockInstance(Logger);

const gradient = { from: '#FF0000', to: '#0000FF', angle: 90, fromStop: 0, toStop: 100 };

const expectFallbackWithWarning = async (icon: string) => {
	await expect(renderTeamsAppIcons({ icon, gradient })).resolves.toBeUndefined();
	expect(logger.warn).toHaveBeenCalledWith(
		'Could not draw the agent icon for the Teams app',
		expect.objectContaining({ icon }),
	);
};

describe('renderTeamsAppIcons when the icon cannot be drawn', () => {
	beforeEach(() => {
		logger.warn.mockClear();
		fake.behave = undefined;
	});

	afterEach(() => vi.useRealTimers());

	it('keeps the bundled icons when resvg cannot read the SVG', async () => {
		await expectFallbackWithWarning('unclosed');
	});

	it('keeps the bundled icons when the worker exits with an error', async () => {
		fake.behave = (worker) => worker.emit('exit', 1);

		await expectFallbackWithWarning('line');
	});

	it('keeps the bundled icons when the worker replies without images', async () => {
		fake.behave = (worker) => worker.emit('message', { color: 'not an image' });

		await expectFallbackWithWarning('line');
	});

	it('keeps the bundled icons when the worker does not answer in time', async () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		fake.behave = () => {};

		const result = renderTeamsAppIcons({ icon: 'line', gradient });
		await vi.waitFor(() => expect(vi.getTimerCount()).toBe(1));
		await vi.advanceTimersByTimeAsync(5_000);

		await expect(result).resolves.toBeUndefined();
		expect(logger.warn).toHaveBeenCalled();
	});

	it('does not log an icon name Lucide does not have', async () => {
		await expect(
			renderTeamsAppIcons({ icon: 'not-a-lucide-icon', gradient }),
		).resolves.toBeUndefined();
		expect(logger.warn).not.toHaveBeenCalled();
	});
});
