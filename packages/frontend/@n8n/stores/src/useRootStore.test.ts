import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRootStore } from './useRootStore';

const { randomStringMock } = vi.hoisted(() => ({
	randomStringMock: vi.fn(),
}));

vi.mock('n8n-workflow', () => ({
	randomString: randomStringMock,
	setGlobalState: vi.fn(),
}));

describe('root.store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		randomStringMock.mockReset();
		sessionStorage.clear();
		setActivePinia(createPinia());
		window.BASE_PATH = '/';
	});

	it('creates a fresh pushRef for each store instance instead of reusing session storage', () => {
		randomStringMock.mockReturnValueOnce('FIRSTPUSHREF').mockReturnValueOnce('SECONDPUSHREF');
		sessionStorage.setItem('n8n-client-id', 'copied-tab-pushref');

		const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
		const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

		const firstStore = useRootStore();
		const firstPushRef = firstStore.pushRef;

		setActivePinia(createPinia());
		const secondStore = useRootStore();

		expect(firstPushRef).toBe('firstpushref');
		expect(secondStore.pushRef).toBe('secondpushref');
		expect(secondStore.pushRef).not.toBe(firstPushRef);
		expect(secondStore.pushRef).not.toBe('copied-tab-pushref');
		expect(getItemSpy).not.toHaveBeenCalledWith('n8n-client-id');
		expect(setItemSpy).not.toHaveBeenCalledWith('n8n-client-id', expect.anything());
	});
});
