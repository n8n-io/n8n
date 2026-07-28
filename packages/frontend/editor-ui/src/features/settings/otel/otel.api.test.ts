import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { getOtelSettings, updateOtelSettings, sendOtelTestTrace } from './otel.api';
import type { OtelSettingsResponse, OtelTestConnection } from './otel.api';

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
	envManagedFields: [],
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

	describe('sendOtelTestTrace', () => {
		const connection: OtelTestConnection = {
			exporterEndpoint: 'https://collector.io',
			exporterTracingPath: '/v1/traces',
			exporterServiceName: 'n8n',
			exporterHeaders: 'auth=token',
			startupConnectivityTimeoutMs: 2000,
		};

		it('makes a POST request to /otel/test-trace with the connection payload', async () => {
			requestMock.mockResolvedValueOnce({ success: true });

			const result = await sendOtelTestTrace(context, connection);

			expect(requestMock).toHaveBeenCalledWith(context, 'POST', '/otel/test-trace', connection);
			expect(result).toEqual({ success: true });
		});

		it('returns the failure result from the response', async () => {
			requestMock.mockResolvedValueOnce({ success: false, error: '401 Unauthorized' });

			const result = await sendOtelTestTrace(context, connection);

			expect(result).toEqual({ success: false, error: '401 Unauthorized' });
		});
	});
});
