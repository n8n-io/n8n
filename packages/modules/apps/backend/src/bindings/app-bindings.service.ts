import {
	appSchema,
	type AppBinding,
	type AppBindingWarning,
	type AppBindingsResponse,
	type AppDescribedBinding,
	type AppRuntimeBinding,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';

import { AppAgentPort, AppDataTablePort, AppWorkflowPort } from './app-binding-ports';
import { renderBindingTypes } from './app-binding-types';
import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { AppVersionRepository } from '../versions/app-version.repository';
import { AppChangeService } from '../versions/app-change.service';

export function toRuntimeBinding(binding: AppBinding): AppRuntimeBinding {
	if (binding.kind === 'workflow') return { key: binding.key, kind: binding.kind };
	if (binding.kind === 'dataTable') {
		return { key: binding.key, kind: binding.kind, permissions: binding.permissions };
	}
	return { key: binding.key, kind: binding.kind, permissions: binding.permissions };
}

/**
 * Bindings belong to an app version, like its code. The editor reads the
 * bindings of the draft version, and a change saves a new version. A change
 * reaches the live app only when a version is published.
 */
@Service()
export class AppBindingsService {
	constructor(
		private readonly apps: AppRepository,
		private readonly versions: AppVersionRepository,
		private readonly changes: AppChangeService,
		private readonly dataTables: AppDataTablePort,
		private readonly workflows: AppWorkflowPort,
		private readonly agents: AppAgentPort,
		private readonly logger: Logger,
		private readonly events: EventService,
	) {}

	async getBindings(projectId: string, appId: string): Promise<AppBindingsResponse> {
		const app = await this.requireApp(projectId, appId);
		const draft = app.draftVersionId
			? await this.versions.findVersionById(app.draftVersionId)
			: null;
		return await this.describe(app, draft?.id ?? null, draft?.bindings ?? []);
	}

	/**
	 * Saves the source of the draft with a new binding list as a new version, as a
	 * source change does. The acting user must be able to use each resource now,
	 * because the app later acts as its project without a user check.
	 */
	async setBindings(
		user: User,
		projectId: string,
		appId: string,
		baseVersionId: string | null,
		bindings: AppBinding[],
	): Promise<AppBindingsResponse> {
		const app = await this.requireApp(projectId, appId);
		if (app.draftVersionId !== baseVersionId) {
			throw new ConflictError('The app draft changed. Reload the app before you set its bindings.');
		}
		for (const binding of bindings) {
			await this.assertCanBind(user, projectId, binding);
		}
		const { version, previousBindings } = await this.changes.saveBindings(
			projectId,
			appId,
			baseVersionId,
			bindings,
			{
				userId: user.id,
			},
		);
		// Counts compare binding keys: a key that points to another resource is neither added nor removed.
		const previousKeys = new Set(previousBindings.map(({ key }) => key));
		const nextKeys = new Set(bindings.map(({ key }) => key));
		const count = (kind: AppBinding['kind']) => bindings.filter((b) => b.kind === kind).length;
		this.events.emit('app-bindings-changed', {
			appId,
			projectId,
			versionId: version.id,
			userId: user.id,
			workflowCount: count('workflow'),
			dataTableCount: count('dataTable'),
			agentCount: count('agent'),
			addedCount: [...nextKeys].filter((key) => !previousKeys.has(key)).length,
			removedCount: [...previousKeys].filter((key) => !nextKeys.has(key)).length,
		});
		this.logger.debug('Saved app bindings as a new version.', {
			projectId,
			appId,
			baseVersionId,
			versionId: version.id,
			count: bindings.length,
		});
		return await this.describe(app, version.id, version.bindings);
	}

	async getTypes(projectId: string, appId: string): Promise<string> {
		const { bindings } = await this.getBindings(projectId, appId);
		return renderBindingTypes(bindings);
	}

	async describe(
		app: Pick<App, 'projectId'>,
		versionId: string | null,
		versionBindings: AppBinding[],
	): Promise<AppBindingsResponse> {
		const bindings: AppDescribedBinding[] = [];
		const warnings: AppBindingWarning[] = [];

		for (const binding of versionBindings) {
			const described = await this.describeOne(app.projectId, binding);
			if (!described) {
				bindings.push({ ...binding, name: binding.key, missing: true });
				warnings.push({
					key: binding.key,
					code: 'resource_missing',
					message: `The resource of binding "${binding.key}" is not in the app project, or it cannot run from an app.`,
				});
				continue;
			}
			bindings.push(described);
			if ('published' in described && !described.published) {
				warnings.push({
					key: binding.key,
					code: 'resource_unpublished',
					message: `"${described.name}" is not published. The app gets an error until you publish it.`,
				});
			}
		}

		return { versionId, bindings, warnings };
	}

	private async describeOne(
		projectId: string,
		binding: AppBinding,
	): Promise<AppDescribedBinding | null> {
		switch (binding.kind) {
			case 'workflow':
				return await this.workflows.describe(projectId, binding);
			case 'dataTable':
				return await this.dataTables.describe(projectId, binding);
			case 'agent':
				return await this.agents.describe(projectId, binding);
		}
	}

	private async assertCanBind(user: User, projectId: string, binding: AppBinding) {
		switch (binding.kind) {
			case 'workflow':
				return await this.workflows.assertCanBind(user, projectId, binding);
			case 'dataTable':
				return await this.dataTables.assertCanBind(user, projectId, binding);
			case 'agent':
				return await this.agents.assertCanBind(user, projectId, binding);
		}
	}

	private async requireApp(projectId: string, appId: string): Promise<App> {
		const app = appSchema.shape.id.safeParse(appId).success
			? await this.apps.findInProject(projectId, appId)
			: null;
		if (!app) throw new NotFoundError('App not found');
		return app;
	}
}
