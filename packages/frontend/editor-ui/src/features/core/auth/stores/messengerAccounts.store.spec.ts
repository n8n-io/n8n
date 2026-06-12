import { createPinia, setActivePinia } from 'pinia';

import * as messengerApi from '@/app/api/messenger-accounts';
import { useMessengerAccountsStore } from './messengerAccounts.store';

vi.mock('@/app/api/messenger-accounts', () => ({
	getMessengerAccounts: vi.fn(),
	verifyMessengerCode: vi.fn(),
	unlinkMessengerAccount: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: '', sessionId: '', pushRef: '' },
	})),
}));

const getMock = vi.mocked(messengerApi.getMessengerAccounts);
const verifyMock = vi.mocked(messengerApi.verifyMessengerCode);
const unlinkMock = vi.mocked(messengerApi.unlinkMessengerAccount);

const telegramAccount = {
	platform: 'telegram' as const,
	platformUserId: 'tg_abc123',
	linkedAt: '2026-05-13T10:00:00.000Z',
};

describe('messengerAccounts.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		getMock.mockReset();
		verifyMock.mockReset();
		unlinkMock.mockReset();
	});

	describe('fetchAccounts', () => {
		it('indexes returned accounts by platform', async () => {
			getMock.mockResolvedValueOnce([telegramAccount]);
			const store = useMessengerAccountsStore();

			await store.fetchAccounts();

			expect(store.accountsByPlatform).toEqual({ telegram: telegramAccount });
			expect(store.isConnected('telegram')).toBe(true);
			expect(store.getAccount('telegram')).toEqual(telegramAccount);
		});

		it('clears state when no accounts are returned', async () => {
			getMock.mockResolvedValueOnce([telegramAccount]).mockResolvedValueOnce([]);
			const store = useMessengerAccountsStore();

			await store.fetchAccounts();
			await store.fetchAccounts();

			expect(store.accountsByPlatform).toEqual({});
			expect(store.isConnected('telegram')).toBe(false);
		});
	});

	describe('linkByCode', () => {
		it('stores the returned account and returns it', async () => {
			verifyMock.mockResolvedValueOnce(telegramAccount);
			const store = useMessengerAccountsStore();

			const result = await store.linkByCode('any-code');

			expect(verifyMock).toHaveBeenCalledWith(expect.anything(), 'any-code');
			expect(result).toEqual(telegramAccount);
			expect(store.getAccount('telegram')).toEqual(telegramAccount);
		});

		it('rethrows on failure and leaves state unchanged', async () => {
			verifyMock.mockRejectedValueOnce(new Error('Invalid code'));
			const store = useMessengerAccountsStore();

			await expect(store.linkByCode('bad')).rejects.toThrow('Invalid code');
			expect(store.getAccount('telegram')).toBeUndefined();
		});
	});

	describe('unlink', () => {
		it('removes the account for the given platform on success', async () => {
			verifyMock.mockResolvedValueOnce(telegramAccount);
			unlinkMock.mockResolvedValueOnce({ success: true });
			const store = useMessengerAccountsStore();
			await store.linkByCode('any-code');

			await store.unlink('telegram');

			expect(unlinkMock).toHaveBeenCalledWith(expect.anything(), 'telegram');
			expect(store.getAccount('telegram')).toBeUndefined();
			expect(store.isConnected('telegram')).toBe(false);
		});

		it('rethrows on failure and leaves state unchanged', async () => {
			verifyMock.mockResolvedValueOnce(telegramAccount);
			unlinkMock.mockRejectedValueOnce(new Error('Network error'));
			const store = useMessengerAccountsStore();
			await store.linkByCode('any-code');

			await expect(store.unlink('telegram')).rejects.toThrow('Network error');
			expect(store.getAccount('telegram')).toEqual(telegramAccount);
		});
	});
});
