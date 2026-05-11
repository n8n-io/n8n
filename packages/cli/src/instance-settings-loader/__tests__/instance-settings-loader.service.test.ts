import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';

import { InstanceSettingsLoaderService } from '../instance-settings-loader.service';
import type { CommunityPackagesInstanceSettingsLoader } from '../loaders/community-packages.instance-settings-loader';
import type { LogStreamingInstanceSettingsLoader } from '../loaders/log-streaming.instance-settings-loader';
import type { McpSettingsLoader } from '../loaders/mcp-settings.loader';
import type { OwnerInstanceSettingsLoader } from '../loaders/owner.instance-settings-loader';
import type { SecurityPolicyInstanceSettingsLoader } from '../loaders/security-policy.instance-settings-loader';
import type { SsoInstanceSettingsLoader } from '../loaders/sso.instance-settings-loader';

describe('InstanceSettingsLoaderService', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const ownerLoader = mock<OwnerInstanceSettingsLoader>();
	const ssoLoader = mock<SsoInstanceSettingsLoader>();
	const securityPolicyLoader = mock<SecurityPolicyInstanceSettingsLoader>();
	const logStreamingLoader = mock<LogStreamingInstanceSettingsLoader>();
	const mcpLoader = mock<McpSettingsLoader>();
	const communityPackagesLoader = mock<CommunityPackagesInstanceSettingsLoader>();

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
		ownerLoader.run.mockResolvedValue('skipped');
		ssoLoader.run.mockResolvedValue('skipped');
		securityPolicyLoader.run.mockResolvedValue('skipped');
		logStreamingLoader.run.mockResolvedValue('skipped');
		mcpLoader.run.mockResolvedValue('skipped');
		communityPackagesLoader.run.mockResolvedValue('skipped');
	});

	const createService = () =>
		new InstanceSettingsLoaderService(
			logger,
			ownerLoader,
			ssoLoader,
			securityPolicyLoader,
			logStreamingLoader,
			mcpLoader,
			communityPackagesLoader,
		);

	it('should run all loaders', async () => {
		await createService().init();

		expect(ownerLoader.run).toHaveBeenCalled();
		expect(ssoLoader.run).toHaveBeenCalled();
		expect(securityPolicyLoader.run).toHaveBeenCalled();
		expect(logStreamingLoader.run).toHaveBeenCalled();
		expect(mcpLoader.run).toHaveBeenCalled();
		expect(communityPackagesLoader.run).toHaveBeenCalled();
	});

	it('should stop execution if a loader throws', async () => {
		ssoLoader.run.mockRejectedValue(new Error('sso failure'));

		await expect(createService().init()).rejects.toThrow('sso failure');

		expect(ownerLoader.run).toHaveBeenCalled();
		expect(securityPolicyLoader.run).not.toHaveBeenCalled();
		expect(logStreamingLoader.run).not.toHaveBeenCalled();
		expect(mcpLoader.run).not.toHaveBeenCalled();
		expect(communityPackagesLoader.run).not.toHaveBeenCalled();
	});
});
