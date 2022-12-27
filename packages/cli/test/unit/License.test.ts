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
const MOCK_MAIN_PLAN_ID = 1234;

describe('License', () => {
	beforeAll(() => {
		config.set('license.serverUrl', MOCK_SERVER_URL);
		config.set('license.autoRenewEnabled', true);
		config.set('license.autoRenewOffset', MOCK_RENEW_OFFSET);
	});

	let license: License;

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

	test('attempts to activate license with provided key', async () => {
		await license.activate(MOCK_ACTIVATION_KEY);

		expect(LicenseManager.prototype.activate).toHaveBeenCalledWith(MOCK_ACTIVATION_KEY);
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

	test('check fetching entitlements', async () => {
		await license.getCurrentEntitlements();

		expect(LicenseManager.prototype.getCurrentEntitlements).toHaveBeenCalled();
	});

	test('check fetching feature values', async () => {
		await license.getFeatureValue(MOCK_FEATURE_FLAG, false);

		expect(LicenseManager.prototype.getFeatureValue).toHaveBeenCalledWith(MOCK_FEATURE_FLAG, false);
	});

	test('check management jwt', async () => {
		await license.getManagementJwt();

		expect(LicenseManager.prototype.getManagementJwt).toHaveBeenCalled();
	});

	test('check main plan', async () => {
		// mock entitlements response
		License.prototype.getCurrentEntitlements = jest.fn().mockReturnValue([
			{
				id: MOCK_MAIN_PLAN_ID,
				productId: '',
				productMetadata: {
					terms: {
						isMainPlan: true,
					},
				},
				features: {},
				featureOverrides: {},
				validFrom: new Date(),
				validTo: new Date(),
			},
		]);
		jest.fn(license.getMainPlan).mockReset();

		const mainPlan = license.getMainPlan();
		expect(mainPlan?.id).toBe(MOCK_MAIN_PLAN_ID);
	});
});
