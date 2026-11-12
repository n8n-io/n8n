import {
	appSchema,
	appVersionSchema,
	type AppBinding,
	type AppBindingWarning,
	type AppBindingsResponse,
	type AppDescribedBinding,
	type AppPublishPreviewResource,
	type AppPublishPreviewResponse,
	type AppRuntimeBinding,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError, UnprocessableRequestError } from '@n8n/errors';

import { AppAgentPort, AppDataTablePort, AppWorkflowPort } from './app-binding-ports';
import { renderBindingTypes } from './app-binding-types';
import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import type { AppVersion } from '../versions/app-version.entity';
import { AppVersionRepository } from '../versions/app-version.repository';
import { AppChangeService } from '../versions/app-change.service';

type AppPublishBinding = Extract<AppBinding, { kind: 'workflow' | 'agent' }>;

type PublishEntry = { binding: AppPublishBinding; resource: AppPublishPreviewResource };

const PUBLISH_KIND_ORDER: Record<AppPublishBinding['kind'], number> = { workflow: 0, agent: 1 };

/** Workflows come first, because a published agent needs the workflows it uses to be published. */
function compareByKindAndName(a: PublishEntry, b: PublishEntry) {
	return (
		PUBLISH_KIND_ORDER[a.resource.kind] - PUBLISH_KIND_ORDER[b.resource.kind] ||
		a.resource.name.localeCompare(b.resource.name)
	);
}

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

	/**
	 * Restores a version as a new version on top of `baseVersionId`. The restored
	 * bindings follow the same check as `setBindings`.
	 */
	async restoreVersion(
		user: User,
		projectId: string,
		appId: string,
		versionId: string,
		baseVersionId: string | null,
	): Promise<AppVersion> {
		const app = await this.requireApp(projectId, appId);
		if (versionId.toLowerCase() === app.draftVersionId?.toLowerCase()) {
			throw new ConflictError('The current app draft cannot be restored.');
		}
		const source = await this.requireVersion(appId, versionId);
		for (const binding of source.bindings) {
			await this.assertCanBind(user, projectId, binding);
		}
		const version = await this.changes.startRestore(projectId, appId, versionId, baseVersionId, {
			userId: user.id,
		});
		this.logger.debug('Restored an app version as a new version.', {
			projectId,
			appId,
			sourceVersionId: versionId,
			versionId: version.id,
		});
		return version;
	}

	async getPublishPreview(
		user: User,
		projectId: string,
		appId: string,
		versionId: string,
	): Promise<AppPublishPreviewResponse> {
		const entries = await this.listPublishResources(user, projectId, appId, versionId);
		return { resources: entries.map(({ resource }) => resource) };
	}

	/**
	 * Publishes the workflows and agents of a version that are unpublished or
	 * changed since their last publish, one by one, and stops at the first failure.
	 * It skips resources that the user cannot publish. It does not roll back resources that it already
	 * published, because a published workflow or agent is valid on its own.
	 */
	async publishResources(
		user: User,
		projectId: string,
		appId: string,
		versionId: string,
	): Promise<void> {
		const entries = await this.listPublishResources(user, projectId, appId, versionId);
		const pending = entries.filter(
			({ resource }) => resource.canPublish && (!resource.published || resource.hasChanges),
		);
		for (const { binding, resource } of pending) {
			try {
				await this.publishResource(user, projectId, binding);
			} catch (error) {
				const reason = error instanceof Error ? error.message : 'Unknown error';
				throw new UnprocessableRequestError(`Could not publish "${resource.name}": ${reason}`);
			}
		}
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

	private async listPublishResources(
		user: User,
		projectId: string,
		appId: string,
		versionId: string,
	): Promise<PublishEntry[]> {
		await this.requireApp(projectId, appId);
		const version = await this.requireVersion(appId, versionId);
		const entries: PublishEntry[] = [];
		for (const binding of version.bindings) {
			if (binding.kind === 'dataTable') continue;
			const described = await this.describeOne(projectId, binding);
			if (!described || described.missing || !('published' in described)) continue;
			entries.push({
				binding,
				resource: {
					key: binding.key,
					kind: binding.kind,
					resourceId: binding.kind === 'workflow' ? binding.workflowId : binding.agentId,
					name: described.name,
					published: described.published,
					hasChanges: described.published && (await this.hasResourceChanges(projectId, binding)),
					canPublish: await this.canPublishResource(user, projectId, binding),
				},
			});
		}
		return entries.sort(compareByKindAndName);
	}

	private async canPublishResource(
		user: User,
		projectId: string,
		binding: AppPublishBinding,
	): Promise<boolean> {
		switch (binding.kind) {
			case 'workflow':
				return await this.workflows.canPublish(user, projectId, binding);
			case 'agent':
				return await this.agents.canPublish(user, projectId, binding);
		}
	}

	private async hasResourceChanges(
		projectId: string,
		binding: AppPublishBinding,
	): Promise<boolean> {
		switch (binding.kind) {
			case 'workflow':
				return await this.workflows.hasUnpublishedChanges(projectId, binding);
			case 'agent':
				return await this.agents.hasUnpublishedChanges(projectId, binding);
		}
	}

	private async publishResource(
		user: User,
		projectId: string,
		binding: AppPublishBinding,
	): Promise<void> {
		switch (binding.kind) {
			case 'workflow':
				return await this.workflows.publish(user, projectId, binding);
			case 'agent':
				return await this.agents.publish(user, projectId, binding);
		}
	}

	private async requireVersion(appId: string, versionId: string): Promise<AppVersion> {
		const version = appVersionSchema.shape.id.safeParse(versionId).success
			? await this.versions.findVersionById(versionId)
			: null;
		if (version?.appId !== appId) throw new NotFoundError('App version not found');
		return version;
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
