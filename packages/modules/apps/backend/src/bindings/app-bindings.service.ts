import {
	appSchema,
	type AppBinding,
	type AppBindingWarning,
	type AppBindingsResponse,
	type AppDescribedBinding,
	type AppRuntimeBinding,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';

import { AppAgentPort, AppDataTablePort, AppWorkflowPort } from './app-binding-ports';
import { renderBindingTypes } from './app-binding-types';
import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { AppVersionRepository } from '../versions/app-version.repository';

const WRITE_TABLE_PERMISSIONS = new Set(['insert', 'update', 'delete']);

/** Bindings that let any visitor change data or start work. */
function grantsPublicWriteAccess(binding: AppBinding): boolean {
	if (binding.kind === 'workflow') return true;
	if (binding.kind === 'agent') return binding.permissions.includes('chat');
	return binding.permissions.some((permission) => WRITE_TABLE_PERMISSIONS.has(permission));
}

export function toRuntimeBinding(binding: AppBinding): AppRuntimeBinding {
	if (binding.kind === 'workflow') return { key: binding.key, kind: binding.kind };
	if (binding.kind === 'dataTable') {
		return { key: binding.key, kind: binding.kind, permissions: binding.permissions };
	}
	return { key: binding.key, kind: binding.kind, permissions: binding.permissions };
}

/**
 * Bindings belong to an app version, like its code. The editor reads and
 * changes the bindings of the draft version. A published version keeps its
 * bindings, so a change reaches the live app only when a version is published.
 */
@Service()
export class AppBindingsService {
	constructor(
		private readonly apps: AppRepository,
		private readonly versions: AppVersionRepository,
		private readonly dataTables: AppDataTablePort,
		private readonly workflows: AppWorkflowPort,
		private readonly agents: AppAgentPort,
		private readonly logger: Logger,
	) {}

	async getBindings(projectId: string, appId: string): Promise<AppBindingsResponse> {
		const app = await this.requireApp(projectId, appId);
		const draft = app.draftVersionId
			? await this.versions.findVersionById(app.draftVersionId)
			: null;
		return await this.describe(app, draft?.id ?? null, draft?.bindings ?? []);
	}

	/**
	 * Replaces the whole binding list of the draft version. The acting user must
	 * be able to use each resource now, because the app later acts as its
	 * project without a user check.
	 */
	async setBindings(
		user: User,
		projectId: string,
		appId: string,
		bindings: AppBinding[],
	): Promise<AppBindingsResponse> {
		const app = await this.requireApp(projectId, appId);
		const versionId = app.draftVersionId;
		if (!versionId) {
			throw new ConflictError('Save the app source before you set its bindings.');
		}
		if (versionId === app.publishedVersionId) {
			throw new ConflictError(
				'The draft version is published. Save a new version before you change its bindings.',
			);
		}
		for (const binding of bindings) {
			await this.assertCanBind(user, projectId, binding);
		}
		const updated = await this.versions.setDraftBindings(appId, versionId, bindings);
		if (!updated) {
			throw new ConflictError('The app draft changed. Reload the app before you set its bindings.');
		}
		this.logger.debug('Updated app bindings.', {
			projectId,
			appId,
			versionId,
			count: bindings.length,
		});
		return await this.describe(app, versionId, updated.bindings);
	}

	async getTypes(projectId: string, appId: string): Promise<string> {
		const { bindings } = await this.getBindings(projectId, appId);
		return renderBindingTypes(bindings);
	}

	async describe(
		app: Pick<App, 'projectId' | 'visibility'>,
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
			if (app.visibility === 'public' && grantsPublicWriteAccess(binding)) {
				warnings.push({
					key: binding.key,
					code: 'public_write_access',
					message: `The app is public. Anyone with the app URL can use binding "${binding.key}" without signing in.`,
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
