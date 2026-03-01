import { randomString } from 'n8n-workflow';
import { createPinia, setActivePinia } from 'pinia';

import { useRootStore } from '../useRootStore';

vi.mock('n8n-workflow', () => ({
	randomString: vi.fn(() => 'DEFAULTMOCK'),
	setGlobalState: vi.fn(),
}));

vi.mock('../metaTagConfig', () => ({
	getConfigFromMetaTag: vi.fn(() => null),
}));

function mockNavigationType(type: 'navigate' | 'reload' | 'back_forward' | 'prerender') {
	vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
		{ type } as unknown as PerformanceEntry,
	]);
}

describe('useRootStore - pushRef', () => {
	beforeEach(() => {
		sessionStorage.clear();
		vi.mocked(randomString).mockReturnValue('NEWRANDOMID');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should generate a new pushRef on initial navigation', () => {
		mockNavigationType('navigate');
		setActivePinia(createPinia());

		const store = useRootStore();

		expect(store.pushRef).toBe('newrandomid');
		expect(randomString).toHaveBeenCalledWith(10);
	});

	it('should store the generated pushRef in sessionStorage', () => {
		mockNavigationType('navigate');
		setActivePinia(createPinia());

		useRootStore();

		expect(sessionStorage.getItem('n8n-client-id')).toBe('newrandomid');
	});

	it('should reuse the existing pushRef from sessionStorage on page reload', () => {
		sessionStorage.setItem('n8n-client-id', 'existing-push-ref');
		mockNavigationType('reload');
		setActivePinia(createPinia());

		const store = useRootStore();

		expect(store.pushRef).toBe('existing-push-ref');
		expect(randomString).not.toHaveBeenCalled();
	});

	it('should generate a new pushRef when tab is duplicated (cloned sessionStorage)', () => {
		sessionStorage.setItem('n8n-client-id', 'original-tab-id');
		mockNavigationType('navigate');
		setActivePinia(createPinia());

		const store = useRootStore();

		expect(store.pushRef).toBe('newrandomid');
		expect(store.pushRef).not.toBe('original-tab-id');
		expect(randomString).toHaveBeenCalledWith(10);
	});

	it('should generate a new pushRef on reload if sessionStorage is empty', () => {
		mockNavigationType('reload');
		setActivePinia(createPinia());

		const store = useRootStore();

		expect(store.pushRef).toBe('newrandomid');
		expect(randomString).toHaveBeenCalledWith(10);
	});

	it('should produce a lowercase pushRef', () => {
		vi.mocked(randomString).mockReturnValue('UPPER_Case_123');
		mockNavigationType('navigate');
		setActivePinia(createPinia());

		const store = useRootStore();

		expect(store.pushRef).toBe('upper_case_123');
	});

	it('should overwrite sessionStorage when generating a new pushRef on tab duplication', () => {
		sessionStorage.setItem('n8n-client-id', 'old-cloned-id');
		mockNavigationType('navigate');
		setActivePinia(createPinia());

		useRootStore();

		expect(sessionStorage.getItem('n8n-client-id')).toBe('newrandomid');
	});

	it('should generate different pushRefs for duplicated tabs', () => {
		let callCount = 0;
		vi.mocked(randomString).mockImplementation(() => {
			callCount++;
			return `RANDOM${callCount}`;
		});

		mockNavigationType('navigate');

		setActivePinia(createPinia());
		const firstPushRef = useRootStore().pushRef;

		// Simulates a duplicated tab: same sessionStorage, fresh JS context, 'navigate' type
		setActivePinia(createPinia());
		const secondPushRef = useRootStore().pushRef;

		expect(firstPushRef).toBe('random1');
		expect(secondPushRef).toBe('random2');
		expect(firstPushRef).not.toBe(secondPushRef);
	});

	it('should handle missing navigation timing entry gracefully', () => {
		vi.spyOn(performance, 'getEntriesByType').mockReturnValue([]);
		sessionStorage.setItem('n8n-client-id', 'stale-id');
		setActivePinia(createPinia());

		const store = useRootStore();

		expect(store.pushRef).toBe('newrandomid');
		expect(randomString).toHaveBeenCalledWith(10);
	});
});
