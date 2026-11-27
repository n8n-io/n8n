import { OwnershipTransferHandlerRegistry, ProjectMutationHooksProxy } from '@n8n/backend-services';
import { OAuth2FlowProxy } from '@n8n/backend-services/auth';
import type { OperationContext } from '@n8n/db';
import { Container, Service } from '@n8n/di';

import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { AppHostService } from '../serving/app-host.service';

type AppHost = Pick<App, 'id' | 'namespace'>;

@Service()
export class AppGrantRevocation {
	constructor(
		private readonly apps: AppRepository,
		private readonly hosts: AppHostService,
		private readonly flow: OAuth2FlowProxy,
	) {}

	async revokeApps(apps: AppHost[], ctx: OperationContext): Promise<void> {
		await this.flow.revokeClients(
			apps.flatMap((app) => this.hosts.callbackUrls(app)),
			ctx,
		);
	}

	/** Runs before the project delete cascades to its apps. */
	async revokeProject(projectId: string, ctx: OperationContext): Promise<void> {
		await this.revokeApps(await this.apps.findHostsInProject(projectId, ctx), ctx);
	}
}

/** Project and user deletion remove apps by a database cascade, so no app code runs then. */
export function registerAppGrantRevocation() {
	const grants = Container.get(AppGrantRevocation);
	Container.get(ProjectMutationHooksProxy).registerProvider({
		beforeProjectDeleted: async ({ projectId }, ctx) => {
			await grants.revokeProject(projectId, ctx);
			return undefined;
		},
	});
	Container.get(OwnershipTransferHandlerRegistry).register({
		resource: 'app-grants',
		// Apps do not move to the transferee. The account delete removes them in both cases.
		transferAll: async () => {},
		deleteAll: async () => {},
		finalizeUserDeletion: async (_userId, personalProjectId, ctx) => {
			await grants.revokeProject(personalProjectId, ctx);
		},
	});
}
