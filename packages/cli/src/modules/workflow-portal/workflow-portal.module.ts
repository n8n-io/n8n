import { ModuleRegistry } from '@n8n/backend-common';
import { BackendModule, OnShutdown, type ModuleInterface } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';

@BackendModule({ name: 'workflow-portal', instanceTypes: ['main'] })
export class WorkflowPortalModule implements ModuleInterface {
	async init() {
		if (!Container.get(ModuleRegistry).isActive('oauth-server')) {
			throw new UserError('Enable the oauth-server module to use workflow-portal.');
		}

		const { UserRepository } = await import('@n8n/db');
		const { ProtectedResourceRegistry } = await import('@/services/protected-resource.registry.js');
		const { WorkflowPortalConfig } = await import('./workflow-portal.config.js');
		const { WorkflowPortalServer } = await import('./workflow-portal.server.js');
		const config = Container.get(WorkflowPortalConfig);
		const server = Container.get(WorkflowPortalServer);
		const userRepository = Container.get(UserRepository);

		Container.get(ProtectedResourceRegistry).register({
			id: 'workflow-portal',
			surface: 'public-api',
			isFirstParty: true,
			displayName: await server.getDisplayName(),
			uiHints: { icon: 'workflow', consentType: 'app' },
			getResourceUrl: () => config.callbackUrl,
			getAudiences: () => [config.callbackUrl],
			getAllowedRedirectUris: async () => [config.callbackUrl],
			scopes: [],
			authorize: async (user) => {
				const currentUser = await userRepository.findOneBy({ id: user.id });
				return !!currentUser && !currentUser.disabled;
			},
		});

		await server.start();
	}

	@OnShutdown()
	async shutdown() {
		const { WorkflowPortalServer } = await import('./workflow-portal.server.js');
		await Container.get(WorkflowPortalServer).stop();
	}
}
