import type { UrlService } from '@n8n/backend-services';
import type { OAuth2FlowProxy } from '@n8n/backend-services/auth';
import type { GlobalConfig } from '@n8n/config';
import type { OperationContext } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AppRepository } from '../../app.repository';
import type { AppsConfig } from '../../apps.config';
import { AppHostService } from '../../serving/app-host.service';
import { AppGrantRevocation } from '../app-grant-revocation';

const appId = '11111111-1111-4111-8111-111111111111';
const otherAppId = '22222222-2222-4222-8222-222222222222';

function createRevocation() {
	const apps = mock<AppRepository>();
	const flow = mock<OAuth2FlowProxy>();
	const hosts = new AppHostService(
		mock<AppsConfig>({ baseUrl: 'https://apps.example.com' }),
		mock<GlobalConfig>({
			host: 'n8n.example.net',
			deployment: mock<GlobalConfig['deployment']>({ type: 'default' }),
		}),
		mock<UrlService>({
			getInstanceBaseUrl: () => 'https://n8n.example.net',
			getWebhookBaseUrl: () => 'https://hooks.example.net',
		}),
	);
	return { revocation: new AppGrantRevocation(apps, hosts, flow), apps, flow, hosts };
}

describe('AppGrantRevocation', () => {
	const ctx = mock<OperationContext>();

	it('revokes the published and the preview client of each app', async () => {
		const { revocation, flow, hosts } = createRevocation();
		const app = { id: appId, namespace: 'sales' };

		await revocation.revokeApps([app], ctx);

		expect(flow.revokeClients).toHaveBeenCalledExactlyOnceWith(
			[hosts.callbackUrl(app, 'published'), hosts.callbackUrl(app, 'preview')],
			ctx,
		);
	});

	it('revokes the clients of every app in a project', async () => {
		const { revocation, apps, flow, hosts } = createRevocation();
		const projectApps = [
			{ id: appId, namespace: 'sales' },
			{ id: otherAppId, namespace: 'support' },
		];
		apps.findHostsInProject.mockResolvedValue(projectApps);

		await revocation.revokeProject('project-1', ctx);

		expect(apps.findHostsInProject).toHaveBeenCalledExactlyOnceWith('project-1', ctx);
		expect(flow.revokeClients).toHaveBeenCalledExactlyOnceWith(
			projectApps.flatMap((app) => [
				hosts.callbackUrl(app, 'published'),
				hosts.callbackUrl(app, 'preview'),
			]),
			ctx,
		);
	});
});
