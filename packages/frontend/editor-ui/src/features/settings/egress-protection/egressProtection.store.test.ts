import { createPinia, setActivePinia } from 'pinia';

import type { EgressCalibrationResponse, EgressPolicyStateResponse } from '@n8n/api-types';
import * as egressApi from '@n8n/rest-api-client/api/egress-protection';
import { useEgressProtectionStore } from './egressProtection.store';

vi.mock('@n8n/rest-api-client/api/egress-protection', () => ({
	getEgressPolicy: vi.fn(),
	updateEgressPolicy: vi.fn(),
	getEgressCalibration: vi.fn(),
	clearEgressCalibration: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: 'http://localhost', pushRef: '' },
	})),
}));

const fetchMock = vi.mocked(egressApi.getEgressPolicy);
const saveMock = vi.mocked(egressApi.updateEgressPolicy);
const calibrationMock = vi.mocked(egressApi.getEgressCalibration);
const clearMock = vi.mocked(egressApi.clearEgressCalibration);

const makePolicy = (
	overrides: Partial<EgressPolicyStateResponse> = {},
): EgressPolicyStateResponse => ({
	mode: 'log',
	editable: true,
	managedByEnv: false,
	defaultBlockedIpRanges: ['10.0.0.0/8'],
	blockedIpRanges: [],
	allowedIpRanges: [],
	allowedHostnames: [],
	blockedHostnames: [],
	...overrides,
});

const makeCalibration = (
	overrides: Partial<EgressCalibrationResponse> = {},
): EgressCalibrationResponse => ({
	mode: 'log',
	destinations: [],
	...overrides,
});

describe('useEgressProtectionStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		fetchMock.mockReset();
		saveMock.mockReset();
		calibrationMock.mockReset();
		clearMock.mockReset();
	});

	describe('fetchPolicy', () => {
		it('populates policy and draft lists from the response', async () => {
			fetchMock.mockResolvedValueOnce(
				makePolicy({
					mode: 'enforce',
					blockedIpRanges: ['192.168.0.0/16'],
				}),
			);

			const store = useEgressProtectionStore();
			await store.fetchPolicy();

			expect(store.draft?.mode).toBe('enforce');
			expect(store.draft?.blockedIpRanges).toEqual(['192.168.0.0/16']);
			expect(store.editable).toBe(true);
		});

		it('resets loading even when the API throws', async () => {
			fetchMock.mockRejectedValueOnce(new Error('network error'));

			const store = useEgressProtectionStore();
			await expect(store.fetchPolicy()).rejects.toThrow('network error');

			expect(store.loading).toBe(false);
		});

		it('exposes editable=false when not editable', async () => {
			fetchMock.mockResolvedValueOnce(makePolicy({ editable: false }));

			const store = useEgressProtectionStore();
			await store.fetchPolicy();

			expect(store.editable).toBe(false);
		});
	});

	describe('addEntry (auto-save)', () => {
		it('persists the new entry immediately and refreshes from the response', async () => {
			fetchMock.mockResolvedValueOnce(makePolicy());
			saveMock.mockResolvedValueOnce(makePolicy({ allowedHostnames: ['api.example.com'] }));

			const store = useEgressProtectionStore();
			await store.fetchPolicy();
			await store.addEntry('allowedHostnames', '  api.example.com  ');

			expect(saveMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ allowedHostnames: ['api.example.com'] }),
			);
			expect(store.draft?.allowedHostnames).toEqual(['api.example.com']);
			expect(store.saveState).toBe('saved');
		});

		it('ignores a duplicate entry without calling the API', async () => {
			fetchMock.mockResolvedValueOnce(makePolicy({ allowedHostnames: ['api.example.com'] }));

			const store = useEgressProtectionStore();
			await store.fetchPolicy();
			await store.addEntry('allowedHostnames', 'api.example.com');

			expect(saveMock).not.toHaveBeenCalled();
		});

		it('rolls back the optimistic add and reports error when the API throws', async () => {
			fetchMock.mockResolvedValueOnce(makePolicy());
			saveMock.mockRejectedValueOnce(new Error('save failed'));

			const store = useEgressProtectionStore();
			await store.fetchPolicy();

			await expect(store.addEntry('allowedHostnames', 'api.example.com')).rejects.toThrow(
				'save failed',
			);
			expect(store.draft?.allowedHostnames).toEqual([]);
			expect(store.saveState).toBe('error');
		});
	});

	describe('removeEntry (auto-save)', () => {
		it('persists the removal immediately', async () => {
			fetchMock.mockResolvedValueOnce(makePolicy({ allowedHostnames: ['api.example.com'] }));
			saveMock.mockResolvedValueOnce(makePolicy());

			const store = useEgressProtectionStore();
			await store.fetchPolicy();
			await store.removeEntry('allowedHostnames', 0);

			expect(saveMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ allowedHostnames: [] }),
			);
		});

		it('restores the removed entry when the API throws', async () => {
			fetchMock.mockResolvedValueOnce(makePolicy({ allowedHostnames: ['api.example.com'] }));
			saveMock.mockRejectedValueOnce(new Error('save failed'));

			const store = useEgressProtectionStore();
			await store.fetchPolicy();

			await expect(store.removeEntry('allowedHostnames', 0)).rejects.toThrow('save failed');
			expect(store.draft?.allowedHostnames).toEqual(['api.example.com']);
		});
	});

	describe('updateMode (auto-save)', () => {
		it('persists a mode change, sending the full policy', async () => {
			fetchMock.mockResolvedValueOnce(makePolicy({ mode: 'log' }));
			saveMock.mockResolvedValueOnce(makePolicy({ mode: 'enforce' }));

			const store = useEgressProtectionStore();
			await store.fetchPolicy();
			await store.updateMode('enforce');

			expect(saveMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ mode: 'enforce' }),
			);
			expect(store.draft?.mode).toBe('enforce');
		});

		it('rolls back the mode when the API throws', async () => {
			fetchMock.mockResolvedValueOnce(makePolicy({ mode: 'log' }));
			saveMock.mockRejectedValueOnce(new Error('save failed'));

			const store = useEgressProtectionStore();
			await store.fetchPolicy();

			await expect(store.updateMode('enforce')).rejects.toThrow('save failed');
			expect(store.draft?.mode).toBe('log');
			expect(store.saveState).toBe('error');
		});
	});

	describe('calibration', () => {
		it('fetches calibration destinations', async () => {
			calibrationMock.mockResolvedValueOnce(
				makeCalibration({
					mode: 'enforce',
					destinations: [
						{
							hostname: 'evil.example.com',
							resolvedIp: '10.0.0.1',
							feature: 'httpRequest',
							count: 3,
							decision: 'would-block',
							lastSeen: '2026-01-01T00:00:00.000Z',
						},
					],
				}),
			);

			const store = useEgressProtectionStore();
			await store.fetchCalibration();

			expect(store.calibration?.destinations).toHaveLength(1);
			expect(store.calibration?.mode).toBe('enforce');
		});

		it('clears calibration destinations locally', async () => {
			calibrationMock.mockResolvedValueOnce(
				makeCalibration({
					destinations: [
						{
							hostname: 'evil.example.com',
							resolvedIp: '10.0.0.1',
							feature: 'httpRequest',
							count: 1,
							decision: 'blocked',
							lastSeen: '2026-01-01T00:00:00.000Z',
						},
					],
				}),
			);
			clearMock.mockResolvedValueOnce({ success: true });

			const store = useEgressProtectionStore();
			await store.fetchCalibration();
			await store.clearCalibration();

			expect(clearMock).toHaveBeenCalled();
			expect(store.calibration?.destinations).toEqual([]);
		});
	});
});
