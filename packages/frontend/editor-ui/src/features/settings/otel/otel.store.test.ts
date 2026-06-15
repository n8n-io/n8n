import { createPinia, setActivePinia } from 'pinia';

import * as otelApi from './otel.api';
import { useOtelStore, headersStringToPairs, headersPairsToString } from './otel.store';
import type { OtelSettingsResponse } from './otel.api';

vi.mock('./otel.api', () => ({
	getOtelSettings: vi.fn(),
	updateOtelSettings: vi.fn(),
	sendOtelTestTrace: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: 'http://localhost', pushRef: '' },
	})),
}));

const fetchMock = vi.mocked(otelApi.getOtelSettings);
const saveMock = vi.mocked(otelApi.updateOtelSettings);
const testTraceMock = vi.mocked(otelApi.sendOtelTestTrace);

const makeSettings = (overrides: Partial<OtelSettingsResponse> = {}): OtelSettingsResponse => ({
	enabled: false,
	exporterEndpoint: 'http://localhost:4318',
	exporterTracingPath: '/v1/traces',
	exporterServiceName: 'n8n',
	exporterHeaders: '',
	tracesSampleRate: 1.0,
	startupConnectivityTimeoutMs: 2000,
	includeNodeSpans: true,
	injectOutbound: true,
	productionExecutionsOnly: true,
	envManagedFields: [],
	...overrides,
});

function extractSettings(r: OtelSettingsResponse) {
	const { envManagedFields: _, ...settings } = r;
	return settings;
}

describe('headersStringToPairs', () => {
	it('returns empty array for empty string', () => {
		expect(headersStringToPairs('')).toEqual([]);
	});

	it('returns empty array for whitespace-only string', () => {
		expect(headersStringToPairs('   ')).toEqual([]);
	});

	it('parses a single key=value pair', () => {
		expect(headersStringToPairs('auth=token')).toEqual([{ key: 'auth', value: 'token' }]);
	});

	it('parses multiple comma-separated pairs', () => {
		expect(headersStringToPairs('a=1,b=2')).toEqual([
			{ key: 'a', value: '1' },
			{ key: 'b', value: '2' },
		]);
	});

	it('trims whitespace around keys and values', () => {
		expect(headersStringToPairs(' key = val ')).toEqual([{ key: 'key', value: 'val' }]);
	});

	it('treats missing = as key with empty value', () => {
		expect(headersStringToPairs('noequals')).toEqual([{ key: 'noequals', value: '' }]);
	});

	it('allows = in value (splits on first = only)', () => {
		expect(headersStringToPairs('sig=a=b')).toEqual([{ key: 'sig', value: 'a=b' }]);
	});

	it('filters out pairs with empty key', () => {
		expect(headersStringToPairs(',a=1')).toEqual([{ key: 'a', value: '1' }]);
	});
});

describe('headersPairsToString', () => {
	it('returns empty string for empty array', () => {
		expect(headersPairsToString([])).toBe('');
	});

	it('serialises a single pair', () => {
		expect(headersPairsToString([{ key: 'auth', value: 'token' }])).toBe('auth=token');
	});

	it('joins multiple pairs with comma', () => {
		expect(
			headersPairsToString([
				{ key: 'a', value: '1' },
				{ key: 'b', value: '2' },
			]),
		).toBe('a=1,b=2');
	});

	it('filters out pairs where key is blank', () => {
		expect(
			headersPairsToString([
				{ key: '', value: 'x' },
				{ key: 'k', value: 'v' },
			]),
		).toBe('k=v');
	});

	it('filters out whitespace-only keys', () => {
		expect(headersPairsToString([{ key: '  ', value: 'x' }])).toBe('');
	});
});

describe('useOtelStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		fetchMock.mockReset();
		saveMock.mockReset();
		testTraceMock.mockReset();
	});

	describe('fetchSettings', () => {
		it('populates settings and savedSettings from API response', async () => {
			const remote = makeSettings({ enabled: true, exporterEndpoint: 'https://collector.io' });
			fetchMock.mockResolvedValueOnce(remote);

			const store = useOtelStore();
			await store.fetchSettings();

			expect(store.settings).toEqual(extractSettings(remote));
			expect(store.savedSettings).toEqual(extractSettings(remote));
		});

		it('stores independent copies so mutations do not affect savedSettings', async () => {
			const remote = makeSettings({ exporterEndpoint: 'https://original.io' });
			fetchMock.mockResolvedValueOnce(remote);

			const store = useOtelStore();
			await store.fetchSettings();

			store.settings.exporterEndpoint = 'https://changed.io';

			expect(store.savedSettings!.exporterEndpoint).toBe('https://original.io');
		});

		it('sets loading to true during the call and resets it after', async () => {
			let resolve!: (v: OtelSettingsResponse) => void;
			fetchMock.mockImplementationOnce(async () => await new Promise((r) => (resolve = r)));

			const store = useOtelStore();
			const pending = store.fetchSettings();

			expect(store.loading).toBe(true);

			resolve(makeSettings());
			await pending;

			expect(store.loading).toBe(false);
		});

		it('resets loading even when the API throws', async () => {
			fetchMock.mockRejectedValueOnce(new Error('network error'));

			const store = useOtelStore();
			await expect(store.fetchSettings()).rejects.toThrow('network error');

			expect(store.loading).toBe(false);
		});
	});

	describe('saveSettings', () => {
		it('calls updateOtelSettings with current settings and updates store from response', async () => {
			const current = makeSettings({ enabled: true });
			const updated = makeSettings({ enabled: true, exporterEndpoint: 'https://updated.io' });
			fetchMock.mockResolvedValueOnce(current);
			saveMock.mockResolvedValueOnce(updated);

			const store = useOtelStore();
			await store.fetchSettings();
			await store.saveSettings();

			expect(saveMock).toHaveBeenCalledWith(expect.anything(), extractSettings(current));
			expect(store.settings).toEqual(extractSettings(updated));
			expect(store.savedSettings).toEqual(extractSettings(updated));
		});

		it('sets saving to true during the call and resets it after', async () => {
			const settings = makeSettings();
			fetchMock.mockResolvedValueOnce(settings);
			let resolve!: (v: OtelSettingsResponse) => void;
			saveMock.mockImplementationOnce(async () => await new Promise((r) => (resolve = r)));

			const store = useOtelStore();
			await store.fetchSettings();
			const pending = store.saveSettings();

			expect(store.saving).toBe(true);

			resolve(settings);
			await pending;

			expect(store.saving).toBe(false);
		});

		it('resets saving even when the API throws', async () => {
			fetchMock.mockResolvedValueOnce(makeSettings());
			saveMock.mockRejectedValueOnce(new Error('save failed'));

			const store = useOtelStore();
			await store.fetchSettings();

			await expect(store.saveSettings()).rejects.toThrow('save failed');
			expect(store.saving).toBe(false);
		});
	});

	describe('discardChanges', () => {
		it('resets settings to savedSettings', async () => {
			const original = makeSettings({ exporterEndpoint: 'https://original.io' });
			fetchMock.mockResolvedValueOnce(original);

			const store = useOtelStore();
			await store.fetchSettings();

			store.settings.exporterEndpoint = 'https://changed.io';
			store.discardChanges();

			expect(store.settings.exporterEndpoint).toBe('https://original.io');
		});
	});

	describe('isDirty', () => {
		it('is false before fetch (settings equal default savedSettings)', () => {
			const store = useOtelStore();
			expect(store.isDirty).toBe(false);
		});

		it('is false immediately after fetch (settings equal savedSettings)', async () => {
			fetchMock.mockResolvedValueOnce(makeSettings());
			const store = useOtelStore();
			await store.fetchSettings();

			expect(store.isDirty).toBe(false);
		});

		it('is true after a field is changed', async () => {
			fetchMock.mockResolvedValueOnce(makeSettings({ enabled: false }));
			const store = useOtelStore();
			await store.fetchSettings();

			store.settings.enabled = true;

			expect(store.isDirty).toBe(true);
		});

		it('returns to false after discardChanges', async () => {
			fetchMock.mockResolvedValueOnce(makeSettings({ enabled: false }));
			const store = useOtelStore();
			await store.fetchSettings();

			store.settings.enabled = true;
			expect(store.isDirty).toBe(true);

			store.discardChanges();
			expect(store.isDirty).toBe(false);
		});

		it('returns to false after a successful save', async () => {
			const settings = makeSettings({ enabled: false });
			fetchMock.mockResolvedValueOnce(settings);
			saveMock.mockResolvedValueOnce(makeSettings({ enabled: true }));

			const store = useOtelStore();
			await store.fetchSettings();
			store.settings.enabled = true;
			expect(store.isDirty).toBe(true);

			await store.saveSettings();
			expect(store.isDirty).toBe(false);
		});
	});

	describe('sendTestTrace', () => {
		it('starts in the idle state', () => {
			const store = useOtelStore();
			expect(store.testState).toBe('idle');
		});

		it('sends only the connection fields from the current settings', async () => {
			fetchMock.mockResolvedValueOnce(
				makeSettings({
					exporterEndpoint: 'https://collector.io',
					exporterTracingPath: '/custom',
					exporterServiceName: 'n8n-prod',
					exporterHeaders: 'auth=token',
					startupConnectivityTimeoutMs: 3000,
				}),
			);
			testTraceMock.mockResolvedValueOnce({ success: true });

			const store = useOtelStore();
			await store.fetchSettings();
			await store.sendTestTrace();

			expect(testTraceMock).toHaveBeenCalledWith(expect.anything(), {
				exporterEndpoint: 'https://collector.io',
				exporterTracingPath: '/custom',
				exporterServiceName: 'n8n-prod',
				exporterHeaders: 'auth=token',
				startupConnectivityTimeoutMs: 3000,
			});
		});

		it('transitions to sent and records a timestamp on success', async () => {
			testTraceMock.mockResolvedValueOnce({ success: true });

			const store = useOtelStore();
			await store.sendTestTrace();

			expect(store.testState).toBe('sent');
			expect(store.testTimestamp).not.toBe('');
			expect(store.testError).toBe('');
		});

		it('transitions to error with the collector message on failure', async () => {
			testTraceMock.mockResolvedValueOnce({ success: false, error: '401 Unauthorized' });

			const store = useOtelStore();
			await store.sendTestTrace();

			expect(store.testState).toBe('error');
			expect(store.testError).toBe('401 Unauthorized');
		});

		it('transitions to error when the request itself throws', async () => {
			testTraceMock.mockRejectedValueOnce(new Error('network error'));

			const store = useOtelStore();
			await store.sendTestTrace();

			expect(store.testState).toBe('error');
			expect(store.testError).toBe('network error');
		});

		it('is in the sending state while the request is in flight', async () => {
			let resolve!: (v: { success: true }) => void;
			testTraceMock.mockImplementationOnce(async () => await new Promise((r) => (resolve = r)));

			const store = useOtelStore();
			const pending = store.sendTestTrace();

			expect(store.testState).toBe('sending');

			resolve({ success: true });
			await pending;

			expect(store.testState).toBe('sent');
		});

		it('discards an in-flight result when reset before it resolves', async () => {
			let resolve!: (v: { success: true }) => void;
			testTraceMock.mockImplementationOnce(async () => await new Promise((r) => (resolve = r)));

			const store = useOtelStore();
			const pending = store.sendTestTrace();
			expect(store.testState).toBe('sending');

			// User edits a connection field mid-flight.
			store.resetTestState();
			expect(store.testState).toBe('idle');

			resolve({ success: true });
			await pending;

			// The stale success must not flip the badge back to 'sent'.
			expect(store.testState).toBe('idle');
		});

		it('resetTestState clears the result', async () => {
			testTraceMock.mockResolvedValueOnce({ success: false, error: 'boom' });

			const store = useOtelStore();
			await store.sendTestTrace();
			expect(store.testState).toBe('error');

			store.resetTestState();

			expect(store.testState).toBe('idle');
			expect(store.testError).toBe('');
			expect(store.testTimestamp).toBe('');
		});
	});
});
