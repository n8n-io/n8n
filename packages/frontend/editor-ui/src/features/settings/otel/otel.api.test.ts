import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { getOtelSettings, updateOtelSettings } from './otel.api';
import type { OtelSettingsResponse } from './otel.api';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const requestMock = vi.mocked(makeRestApiRequest);

const context: IRestApiContext = { baseUrl: 'http://localhost:5678', pushRef: '' };

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
	...overrides,
});

describe('otel.api', () => {
	beforeEach(() => {
		requestMock.mockReset();
	});

	describe('getOtelSettings', () => {
		it('makes a GET request to /otel/settings and returns the response', async () => {
			const response = makeSettings({ enabled: true });
			requestMock.mockResolvedValueOnce(response);

			const result = await getOtelSettings(context);

			expect(requestMock).toHaveBeenCalledWith(context, 'GET', '/otel/settings');
			expect(result).toEqual(response);
		});
	});

	describe('updateOtelSettings', () => {
		it('makes a PUT request to /otel/settings with the settings payload', async () => {
			const payload = makeSettings({ enabled: true, exporterEndpoint: 'https://collector.io' });
			const response = makeSettings({ ...payload });
			requestMock.mockResolvedValueOnce(response);

			const result = await updateOtelSettings(context, payload);

			expect(requestMock).toHaveBeenCalledWith(context, 'PUT', '/otel/settings', payload);
			expect(result).toEqual(response);
		});
	});
});
