import { Tool, type Workspace } from '@n8n/agents';
import {
	appAgentBindingSchema,
	appBindingKeySchema,
	appBindingSchema,
	appDataTableBindingSchema,
	appNameSchema,
	appNamespaceSchema,
	type AppBinding,
	type AppBuildResponse,
	appWorkflowBindingSchema,
} from '@n8n/api-types';
import { z } from 'zod';

import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import type { InstanceAiAppService, InstanceAiContext } from '../../types';
import { APPS_TOOL_ID } from '../tool-ids';
import { addAppTarget, readPendingAppTarget } from './app-target-binding';
import {
	appFolder,
	checkOutDraft,
	installSdk,
	packAppFolder,
	readBaseVersion,
	writeBaseVersion,
} from './app-workspace';

export { APPS_TOOL_ID };

const MAX_LOG_CHARS = 4000;

const appIdSchema = z.string().uuid().describe('ID of the app');

const labelSchema = z.string().max(255).describe('Short summary of the change set');

const inputSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('create'),
		name: appNameSchema.describe('Display name of the app'),
		namespace: appNamespaceSchema.describe(
			'Subdomain label of the app URL: lowercase letters, digits and single hyphens',
		),
	}),
	z.object({
		action: z.literal('list'),
		search: z.string().max(128).optional().describe('Only apps whose name contains this text'),
	}),
	z.object({ action: z.literal('get'), appId: appIdSchema }),
	z.object({ action: z.literal('open'), appId: appIdSchema }),
	z.object({ action: z.literal('bindings'), appId: appIdSchema }),
	z.object({
		action: z.literal('bind'),
		appId: appIdSchema,
		binding: z
			.union([appWorkflowBindingSchema, appDataTableBindingSchema, appAgentBindingSchema])
			.describe(
				'The binding to add. It replaces the binding with the same key. Use the ID of a workflow, data table or agent in the app project.',
			),
	}),
	z.object({
		action: z.literal('unbind'),
		appId: appIdSchema,
		key: appBindingKeySchema.describe('Key of the binding to remove'),
	}),
	z.object({ action: z.literal('commit'), appId: appIdSchema, label: labelSchema }),
	z.object({ action: z.literal('discard'), appId: appIdSchema }),
]);

type Input = z.infer<typeof inputSchema>;

function commitResult({ versionId, status, diagnostics }: AppBuildResponse) {
	return {
		versionId,
		buildStatus: status,
		...(diagnostics && {
			diagnostics: { ...diagnostics, log: diagnostics.log.slice(-MAX_LOG_CHARS) },
		}),
	};
}

type AppSummary = { id: string; name: string; projectId: string };

async function reportChangedApp(
	context: InstanceAiContext,
	appId: string,
	loadApp: () => Promise<AppSummary>,
): Promise<AppSummary | undefined> {
	try {
		const app = await loadApp();
		await addAppTarget(context, { appId: app.id, projectId: app.projectId });
		await context.onArtifactChanged?.({
			type: 'app',
			id: app.id,
			name: app.name,
			projectId: app.projectId,
		});
		return app;
	} catch (error) {
		context.logger.warn('Failed to report the changed app', {
			appId,
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}

async function open(workspace: Workspace, apps: InstanceAiAppService, appId: string) {
	await installSdk(workspace, apps);
	const baseVersionId = await readBaseVersion(workspace, appId);
	if (baseVersionId !== undefined)
		return { path: appFolder(appId), baseVersionId, alreadyOpen: true };
	return { path: appFolder(appId), baseVersionId: await checkOutDraft(workspace, apps, appId) };
}

async function createApp(
	context: InstanceAiContext,
	workspace: Workspace,
	apps: InstanceAiAppService,
	input: Extract<Input, { action: 'create' }>,
) {
	const pending = await readPendingAppTarget(context);
	const pendingId = pending?.projectId === context.projectId ? pending?.appId : undefined;
	const existing = pendingId ? await apps.findApp(pendingId) : undefined;
	const app =
		existing ??
		(await apps.createApp({ name: input.name, namespace: input.namespace, id: pendingId }));
	const { path } = await open(workspace, apps, app.id);
	await reportChangedApp(context, app.id, async () => app);
	return existing ? { app, path, alreadyCreated: true } : { app, path };
}

async function commit(
	context: InstanceAiContext,
	workspace: Workspace,
	apps: InstanceAiAppService,
	appId: string,
	label: string,
) {
	const baseVersionId = await readBaseVersion(workspace, appId);
	if (baseVersionId === undefined) {
		throw new Error('The app is not open in the workspace. Open it with the `open` action first.');
	}
	const build = await apps.commit(
		appId,
		baseVersionId,
		await packAppFolder(workspace, appId),
		label,
	);
	await writeBaseVersion(workspace, appId, build.versionId);
	const app = await reportChangedApp(context, appId, async () => await apps.getApp(appId));
	context.trackTelemetry?.('instance_ai_app_change_committed', {
		thread_id: context.threadId,
		app_id: appId,
		version_id: build.versionId,
		build_status: build.status,
		build_stage: build.diagnostics?.stage ?? null,
	});
	return {
		app: app ? { id: app.id, name: app.name, projectId: app.projectId } : { id: appId },
		...commitResult(build),
	};
}

/**
 * Saves a changed binding list as a new version of the app. An open app folder
 * that was on the old draft moves to the new version: the source is the same,
 * so the next commit does not conflict.
 */
async function changeBindings(
	context: InstanceAiContext,
	workspace: Workspace,
	apps: InstanceAiAppService,
	appId: string,
	change: (bindings: AppBinding[]) => AppBinding[],
) {
	const current = await apps.getBindings(appId);
	// Described bindings carry names and schemas. Parsing keeps only the binding fields.
	const bindings = change(current.bindings.map((binding) => appBindingSchema.parse(binding)));
	const result = await apps.setBindings(appId, current.versionId, bindings);
	try {
		if ((await readBaseVersion(workspace, appId)) === current.versionId) {
			await writeBaseVersion(workspace, appId, result.versionId);
		}
	} catch (error) {
		context.logger.warn('Failed to move the app folder to the new bindings version', {
			appId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
	await reportChangedApp(context, appId, async () => await apps.getApp(appId));
	return result;
}

async function handle(
	context: InstanceAiContext,
	workspace: Workspace,
	apps: InstanceAiAppService,
	input: Input,
) {
	switch (input.action) {
		case 'create':
			return await createApp(context, workspace, apps, input);
		case 'list': {
			const { data, count } = await apps.listApps({ name: input.search });
			return {
				apps: data.map(({ id, name, namespace, visibility, publishedUrl }) => ({
					id,
					name,
					namespace,
					visibility,
					publishedUrl,
				})),
				count,
			};
		}
		case 'get':
			return { app: await apps.getApp(input.appId) };
		case 'open':
			return await open(workspace, apps, input.appId);
		case 'bindings':
			return await apps.getBindings(input.appId);
		case 'bind': {
			const { binding } = input;
			return await changeBindings(context, workspace, apps, input.appId, (bindings) => [
				...bindings.filter(({ key }) => key !== binding.key),
				binding,
			]);
		}
		case 'unbind':
			return await changeBindings(context, workspace, apps, input.appId, (bindings) => {
				if (!bindings.some(({ key }) => key === input.key)) {
					throw new Error(`The app has no binding with the key "${input.key}".`);
				}
				return bindings.filter(({ key }) => key !== input.key);
			});
		case 'commit':
			return await commit(context, workspace, apps, input.appId, input.label);
		case 'discard':
			return {
				path: appFolder(input.appId),
				baseVersionId: await checkOutDraft(workspace, apps, input.appId),
			};
	}
}

export function createAppsTool(context: InstanceAiContext) {
	return new Tool(APPS_TOOL_ID)
		.description(
			'Build n8n Apps: small static Vue apps that n8n builds and hosts. ' +
				'Load `app-builder` via `load_skill` before calling this tool. ' +
				'`create` and `open` put the app source into the sandbox workspace. Edit it there with the ' +
				'workspace tools. `commit` saves the folder as one version and builds it. ' +
				'`bindings` lists the workflows, data tables and agents that the app can call. ' +
				'`bind` adds or replaces one binding and `unbind` removes one. Each change saves a new version.',
		)
		.input(sanitizeInputSchema(inputSchema))
		.handler(async (input: Input) => {
			const apps = context.appService;
			const workspace = context.workspace;
			if (!apps || !workspace) return { error: 'Apps are not available in this conversation.' };
			try {
				return await handle(context, workspace, apps, input);
			} catch (error) {
				return { error: error instanceof Error ? error.message : String(error) };
			}
		})
		.build();
}
