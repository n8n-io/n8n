import type { Page } from 'playwright-core';

import { PlaywrightAdapter } from './playwright';
import { ADAPTER_TEST_CONFIG, setTestContext, trackTestPage } from './test-helpers';
import { configureLogger } from '../logger';

configureLogger({ level: 'silent' });

/** A page that keeps its listeners, so a test can fire its events. */
function fakePage() {
	const listeners = new Map<string, () => void>();
	const page = {
		url: vi.fn().mockReturnValue('https://example.com/'),
		on: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
	} as unknown as Page;
	return { page, emit: (event: string) => listeners.get(event)?.() };
}

describe('PlaywrightAdapter page changes', () => {
	it('reports a page that opens', () => {
		const adapter = new PlaywrightAdapter(ADAPTER_TEST_CONFIG);
		const onPageChange = vi.fn();
		adapter.onPageChange = onPageChange;

		trackTestPage(adapter, fakePage().page, 'p1');

		expect(onPageChange).toHaveBeenCalledWith({ type: 'opened', pageId: 'p1' });
	});

	it('reports a page that closes', () => {
		const adapter = new PlaywrightAdapter(ADAPTER_TEST_CONFIG);
		const onPageChange = vi.fn();
		adapter.onPageChange = onPageChange;
		const { page, emit } = fakePage();
		trackTestPage(adapter, page, 'p1');

		emit('close');

		expect(onPageChange).toHaveBeenLastCalledWith({ type: 'closed', pageId: 'p1' });
		expect(adapter.getPageUrl('p1')).toBeUndefined();
	});

	it('tracks pages without a listener', () => {
		const adapter = new PlaywrightAdapter(ADAPTER_TEST_CONFIG);
		const { page, emit } = fakePage();

		trackTestPage(adapter, page, 'p1');
		emit('close');

		expect(adapter.getPageUrl('p1')).toBeUndefined();
	});
});

describe('PlaywrightAdapter.getTargetId', () => {
	function setup() {
		const adapter = new PlaywrightAdapter(ADAPTER_TEST_CONFIG);
		const session = {
			send: vi.fn().mockResolvedValue({ targetInfo: { targetId: 'TARGET-1' } }),
			detach: vi.fn().mockResolvedValue(undefined),
		};
		const newCDPSession = vi.fn().mockResolvedValue(session);
		setTestContext(adapter, { newCDPSession });
		return { adapter, session, newCDPSession };
	}

	it("returns the page's CDP target id", async () => {
		const { adapter, session, newCDPSession } = setup();
		const { page } = fakePage();
		trackTestPage(adapter, page, 'p1');

		expect(await adapter.getTargetId('p1')).toBe('TARGET-1');
		expect(newCDPSession).toHaveBeenCalledWith(page);
		expect(session.send).toHaveBeenCalledWith('Target.getTargetInfo');
		expect(session.detach).toHaveBeenCalled();
	});

	it('returns undefined for a page it does not track', async () => {
		const { adapter, newCDPSession } = setup();

		expect(await adapter.getTargetId('unknown')).toBeUndefined();
		expect(newCDPSession).not.toHaveBeenCalled();
	});

	it('returns undefined for a page that closed', async () => {
		const { adapter, newCDPSession } = setup();
		const { page, emit } = fakePage();
		trackTestPage(adapter, page, 'p1');
		emit('close');

		expect(await adapter.getTargetId('p1')).toBeUndefined();
		expect(newCDPSession).not.toHaveBeenCalled();
	});

	it('returns undefined when the page closes while it asks', async () => {
		const { adapter, session } = setup();
		session.send.mockRejectedValue(new Error('Target closed'));
		trackTestPage(adapter, fakePage().page, 'p1');

		expect(await adapter.getTargetId('p1')).toBeUndefined();
		expect(session.detach).toHaveBeenCalled();
	});
});
