import { mock } from 'jest-mock-extended';
import config from '@/config';
import { N8N_VERSION } from '@/constants';
import { InternalHooks } from '@/InternalHooks';
import type { License } from '@/License';
import type { Telemetry } from '@/telemetry';

jest.mock('node:os', () => ({
	tmpdir: () => '',
	cpus: () => [{ model: 'MIPS R3000', speed: 40_000_000 }],
	type: () => 'TempleOS',
	version: () => '5.03',
	totalmem: () => 1024 * 1024,
}));

describe('InternalHooks', () => {
	const telemetry = mock<Telemetry>();
	const license = mock<License>();
	const internalHooks = new InternalHooks(
		telemetry,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		license,
		mock(),
		mock(),
	);

	beforeEach(() => jest.clearAllMocks());

	it('Should be defined', () => {
		expect(internalHooks).toBeDefined();
	});

	it('Should forward license plan name and tenant id to identify when provided', async () => {
		license.getPlanName.mockReturnValue('Best Plan');

		await internalHooks.onServerStarted();

		expect(telemetry.identify).toHaveBeenCalledWith({
			version_cli: N8N_VERSION,
			db_type: config.get('database.type'),
			n8n_version_notifications_enabled: true,
			n8n_disable_production_main_process: false,
			system_info: {
				memory: 1024,
				os: {
					type: 'TempleOS',
					version: '5.03',
				},
				cpus: {
					count: 1,
					model: 'MIPS R3000',
					speed: 40000000,
				},
			},
			execution_variables: {
				executions_data_max_age: 336,
				executions_data_prune: true,
				executions_data_save_manual_executions: true,
				executions_data_save_on_error: 'all',
				executions_data_save_on_progress: false,
				executions_data_save_on_success: 'all',
				executions_mode: 'regular',
				executions_timeout: -1,
				executions_timeout_max: 3600,
			},
			n8n_deployment_type: 'default',
			n8n_binary_data_mode: 'default',
			smtp_set_up: true,
			ldap_allowed: false,
			saml_enabled: false,
			license_plan_name: 'Best Plan',
			license_tenant_id: 1,
			binary_data_s3: false,
			multi_main_setup_enabled: false,
		});
	});
});
