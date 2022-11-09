import { LicenseManager } from '@n8n_io/license-sdk';
import config from '@/config';
import { License } from '@/License';

jest.mock('@n8n_io/license-sdk');

const MOCK_SERVER_URL = 'https://server.com/v1';
const MOCK_RENEW_OFFSET = 259200;
const MOCK_INSTANCE_ID = 'instance-id';
const MOCK_N8N_VERSION = '0.27.0';
const MOCK_ACTIVATION_KEY = 'activation-key';
const MOCK_FEATURE_FLAG = 'feat:mock';

describe('License', () => {
	beforeAll(() => {
		config.set('license.serverUrl', MOCK_SERVER_URL);
		config.set('license.autoRenewEnabled', true);
		config.set('license.autoRenewOffset', MOCK_RENEW_OFFSET);
	});

	let license;

	beforeEach(async () => {
		license = new License();
		await license.init(MOCK_INSTANCE_ID, MOCK_N8N_VERSION);
	});

	test('initializes license manager', async () => {
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

	test('activates license if current license is not valid', async () => {
		LicenseManager.prototype.isValid.mockReturnValue(false);

		await license.activate(MOCK_ACTIVATION_KEY);

		expect(LicenseManager.prototype.isValid).toHaveBeenCalled();
		expect(LicenseManager.prototype.activate).toHaveBeenCalledWith(MOCK_ACTIVATION_KEY);
	});

	test('does not activate license if current license is valid', async () => {
		LicenseManager.prototype.isValid.mockReturnValue(true);

		await license.activate(MOCK_ACTIVATION_KEY);

		expect(LicenseManager.prototype.isValid).toHaveBeenCalled();
		expect(LicenseManager.prototype.activate).not.toHaveBeenCalledWith();
	});

	test('renews license', async () => {
		await license.renew();

		expect(LicenseManager.prototype.renew).toHaveBeenCalled();
	});

	test('check if feature is enabled', async () => {
		await license.isFeatureEnabled(MOCK_FEATURE_FLAG);

		expect(LicenseManager.prototype.hasFeatureEnabled).toHaveBeenCalledWith(MOCK_FEATURE_FLAG);
	});

	test('check if sharing feature is enabled', async () => {
		await license.isFeatureEnabled(MOCK_FEATURE_FLAG);

		expect(LicenseManager.prototype.hasFeatureEnabled).toHaveBeenCalledWith(MOCK_FEATURE_FLAG);
	});
});
