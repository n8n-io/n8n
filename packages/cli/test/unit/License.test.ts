import { LicenseManager } from '@n8n_io/license-sdk';
import config from '@/config';
import { License } from '@/License';

jest.mock('@n8n_io/license-sdk');

const MOCK_SERVER_URL = 'https://server.com/v1';
const MOCK_RENEW_OFFSET = 259200;
const MOCK_INSTANCE_ID = 'instance-id';
const MOCK_N8N_VERSION = '0.27.0';

describe('License', () => {
	beforeAll(() => {
		config.set('license.serverUrl', MOCK_SERVER_URL);
		config.set('license.autoRenewEnabled', true);
		config.set('license.autoRenewOffset', MOCK_RENEW_OFFSET);
	});

	test('initializes license manager', async () => {
		const license = new License();
		await license.init(MOCK_INSTANCE_ID, MOCK_N8N_VERSION);
		expect(LicenseManager).toHaveBeenCalledWith({
			autoRenewEnabled: true,
			autoRenewOffset: MOCK_RENEW_OFFSET,
			deviceFingerprint: expect.any(Function),
			productIdentifier: `n8n-${MOCK_N8N_VERSION}`,
			logger: expect.anything(),
			loadCertStr: expect.any(Function),
			saveCertStr: expect.any(Function),
			server: MOCK_SERVER_URL,
			tenantId: 1,
		});
	});
});
