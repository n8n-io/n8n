import { Telemetry } from '@/telemetry';
import { InternalHooks } from '@/InternalHooks';
import { mockInstance } from '../shared/mocking';
import type { IDiagnosticInfo } from '@/Interfaces';
import { mock } from 'jest-mock-extended';

jest.mock('@/telemetry');

let internalHooks: InternalHooks;
let telemetry: Telemetry;

describe('InternalHooks', () => {
	beforeAll(() => {
		telemetry = mockInstance(Telemetry);
		internalHooks = new InternalHooks(telemetry, mock(), mock(), mock(), mock());
	});

	it('Should be defined', () => {
		expect(internalHooks).toBeDefined();
	});

	it('Should forward license plan name and tenant id to identify when provided', async () => {
		const licensePlanName = 'license-plan-name';
		const licenseTenantId = 1001;

		const diagnosticInfo: IDiagnosticInfo = {
			versionCli: '1.2.3',
			databaseType: 'sqlite',
			notificationsEnabled: true,
			disableProductionWebhooksOnMainProcess: false,
			systemInfo: {
				os: {},
				cpus: {},
			},
			executionVariables: {},
			deploymentType: 'testing',
			binaryDataMode: 'default',
			smtp_set_up: false,
			ldap_allowed: true,
			saml_enabled: true,
			licensePlanName,
			licenseTenantId,
			binary_data_s3: false,
			multi_main_setup_enabled: false,
		};

		const parameters = {
			version_cli: diagnosticInfo.versionCli,
			db_type: diagnosticInfo.databaseType,
			n8n_version_notifications_enabled: diagnosticInfo.notificationsEnabled,
			n8n_disable_production_main_process: diagnosticInfo.disableProductionWebhooksOnMainProcess,
			system_info: diagnosticInfo.systemInfo,
			execution_variables: diagnosticInfo.executionVariables,
			n8n_deployment_type: diagnosticInfo.deploymentType,
			n8n_binary_data_mode: diagnosticInfo.binaryDataMode,
			smtp_set_up: diagnosticInfo.smtp_set_up,
			ldap_allowed: diagnosticInfo.ldap_allowed,
			saml_enabled: diagnosticInfo.saml_enabled,
			license_plan_name: diagnosticInfo.licensePlanName,
			license_tenant_id: diagnosticInfo.licenseTenantId,
		};

		await internalHooks.onServerStarted(diagnosticInfo);

		expect(telemetry.identify).toHaveBeenCalledWith(parameters);
	});
});
