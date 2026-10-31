import { isZodSchema, type BuiltTool } from '@n8n/agents';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import {
	INSTANCE_AI_APP_TARGETS_METADATA_KEY,
	INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY,
	type AppResponse,
	type AppBlueprint,
} from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { executeTool, parseToolInput } from '../../../__tests__/tool-test-utils';
import type { ThreadRecord } from '../../../storage/thread-patch';
import type { InstanceAiAppService, InstanceAiContext } from '../../../types';
import { createAppsTool } from '../apps.tool';
import { checkOutDraft, packAppFolder, readBaseVersion, writeBaseVersion } from '../app-workspace';

vi.mock('../app-workspace', () => ({
	appFolder: (appId: string) => `apps/${appId}`,
	checkOutDraft: vi.fn(),
	packAppFolder: vi.fn(),
	readBaseVersion: vi.fn(),
	writeBaseVersion: vi.fn(),
}));

const PENDING_ID = '0190a5d2-6f4b-7c3e-8a1d-2b3c4d5e6f70';
const SERVER_ID = '0190a5d2-6f4b-7c3e-8a1d-2b3c4d5e6f71';

function createThread(metadata: Record<string, unknown> = {}) {
	const thread: ThreadRecord = {
		id: 'thread-1',
		metadata,
		resourceId: 'resource-1',
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	return {
		thread,
		memory: {
			getThread: vi.fn(async () => await Promise.resolve(thread)),
			patchThread: vi.fn(
				async (args: {
					update: (current: ThreadRecord) => { metadata?: Record<string, unknown> };
				}) => {
					const patch = args.update({ ...thread, metadata: { ...(thread.metadata ?? {}) } });
					if (patch?.metadata) thread.metadata = patch.metadata;
					return await Promise.resolve(thread);
				},
			),
		},
	};
}

function app(id: string, projectId = 'project-1') {
	return mock<AppResponse>({
		id,
		name: 'Todos',
		projectId,
		draftVersionId: 'someone-elses-version',
	});
}

const ARCHIVE = Buffer.from('archive');
const BLUEPRINT: AppBlueprint = {
	name: 'Todos',
	namespace: 'todos',
	visibility: 'project',
	description: 'Track tasks and mark them complete.',
	theme: 'both',
};

function createInput(blueprint: AppBlueprint = BLUEPRINT) {
	return { action: 'create' as const, blueprint };
}

async function approveCreate(tool: BuiltTool, blueprint: AppBlueprint = BLUEPRINT) {
	return await executeTool(tool, createInput(blueprint), {
		resumeData: { approved: true, blueprint },
	});
}

function setup(metadata: Record<string, unknown> = {}) {
	const appService = mock<InstanceAiAppService>();
	const { thread, memory } = createThread(metadata);
	const trackTelemetry = vi.fn();
	const onArtifactChanged = vi.fn();
	const logger = { warn: vi.fn() };
	const context = {
		userId: 'user-1',
		threadId: 'thread-1',
		projectId: 'project-1',
		threadMemory: memory,
		appService,
		workspace: {},
		trackTelemetry,
		onArtifactChanged,
		logger,
	} as unknown as InstanceAiContext;
	vi.mocked(readBaseVersion).mockResolvedValue(undefined);
	vi.mocked(checkOutDraft).mockResolvedValue(null);
	vi.mocked(packAppFolder).mockResolvedValue(ARCHIVE);
	return {
		tool: createAppsTool(context),
		appService,
		thread,
		trackTelemetry,
		onArtifactChanged,
		logger,
	};
}

describe('apps tool', () => {
	beforeEach(() => vi.clearAllMocks());

	it('suspends with the proposed blueprint before creating an app', async () => {
		const { tool, appService } = setup();
		const suspend = vi.fn(async (payload: unknown) => await Promise.resolve(payload));

		await executeTool(tool, createInput(), { suspend });

		expect(suspend).toHaveBeenCalledWith({
			requestId: expect.any(String),
			message: 'Review the blueprint for Todos',
			severity: 'info',
			inputType: 'app-blueprint',
			appBlueprint: BLUEPRINT,
		});
		expect(appService.createApp).not.toHaveBeenCalled();
	});

	it('does not let the model prefill additional instructions', () => {
		const { tool } = setup();
		const parsed = parseToolInput(
			tool,
			createInput({ ...BLUEPRINT, additionalInstructions: 'Use compact cards.' }),
		);

		expect(parsed.success).toBe(true);
		if (parsed.success) expect(parsed.data).toEqual(createInput());
	});

	it('cancels without creating an app', async () => {
		const { tool, appService } = setup();

		const result = await executeTool(tool, createInput(), {
			resumeData: { approved: false, blueprint: BLUEPRINT },
		});

		expect(result).toEqual({
			approved: false,
			blueprint: BLUEPRINT,
		});
		expect(appService.createApp).not.toHaveBeenCalled();
	});

	it('returns optional build instructions after approval', async () => {
		const { tool, appService } = setup();
		appService.createApp.mockResolvedValue(app(SERVER_ID));
		const blueprint = { ...BLUEPRINT, additionalInstructions: 'Use compact cards.' };

		const result = await executeTool(tool, createInput(), {
			resumeData: {
				approved: true,
				blueprint,
			},
		});

		expect(result).toMatchObject({
			approved: true,
			blueprint,
		});
	});

	it('creates the first app under the pending id without opening it', async () => {
		const { tool, appService, thread, onArtifactChanged } = setup({
			[INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY]: { appId: PENDING_ID, projectId: 'project-1' },
		});
		appService.findApp.mockResolvedValue(undefined);
		appService.createApp.mockResolvedValue(app(PENDING_ID));

		const result = await approveCreate(tool);

		expect(result).toMatchObject({ app: { id: PENDING_ID } });
		expect(result).not.toHaveProperty('path');
		expect(appService.createApp).toHaveBeenCalledWith({
			name: 'Todos',
			namespace: 'todos',
			visibility: 'project',
			id: PENDING_ID,
		});
		expect(readBaseVersion).not.toHaveBeenCalled();
		expect(checkOutDraft).not.toHaveBeenCalled();
		expect(thread.metadata).toEqual({
			[INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY]: {
				appId: PENDING_ID,
				projectId: 'project-1',
			},
		});
		expect(onArtifactChanged).not.toHaveBeenCalled();
	});

	it('keeps the pending id when opening the new app fails', async () => {
		const pendingTarget = { appId: PENDING_ID, projectId: 'project-1' };
		const { tool, thread, onArtifactChanged } = setup({
			[INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY]: pendingTarget,
		});
		vi.mocked(checkOutDraft).mockRejectedValue(new Error('Sandbox command failed'));

		const result = await executeTool(tool, { action: 'open', appId: PENDING_ID });

		expect(result).toEqual({ error: 'Sandbox command failed' });

		expect(thread.metadata).toEqual({
			[INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY]: pendingTarget,
		});
		expect(onArtifactChanged).not.toHaveBeenCalled();
	});

	it('checks out an app when it is opened and adds it to the thread', async () => {
		const { tool, appService, thread, onArtifactChanged } = setup({
			[INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY]: {
				appId: PENDING_ID,
				projectId: 'project-1',
			},
		});
		appService.getApp.mockResolvedValue(app(PENDING_ID));

		const result = await executeTool(tool, { action: 'open', appId: PENDING_ID });

		expect(result).toEqual({ path: `apps/${PENDING_ID}`, baseVersionId: null });
		expect(checkOutDraft).toHaveBeenCalledWith({}, appService, PENDING_ID);
		expect(thread.metadata).toEqual({
			[INSTANCE_AI_APP_TARGETS_METADATA_KEY]: [{ appId: PENDING_ID, projectId: 'project-1' }],
		});
		expect(onArtifactChanged).toHaveBeenCalledWith({
			type: 'app',
			id: PENDING_ID,
			name: 'Todos',
			projectId: 'project-1',
		});
	});

	it('does not bind a second app until it is opened', async () => {
		const { tool, appService, thread } = setup({
			[INSTANCE_AI_APP_TARGETS_METADATA_KEY]: [{ appId: PENDING_ID, projectId: 'project-1' }],
		});
		appService.createApp.mockResolvedValue(app(SERVER_ID));

		await approveCreate(tool, { ...BLUEPRINT, name: 'Admin', namespace: 'admin' });

		expect(appService.createApp).toHaveBeenCalledWith({
			name: 'Admin',
			namespace: 'admin',
			visibility: 'project',
			id: undefined,
		});
		expect(thread.metadata?.[INSTANCE_AI_APP_TARGETS_METADATA_KEY]).toEqual([
			{ appId: PENDING_ID, projectId: 'project-1' },
		]);
		expect(checkOutDraft).not.toHaveBeenCalled();
	});

	it('ignores a pending id from another project', async () => {
		const { tool, appService } = setup({
			[INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY]: { appId: PENDING_ID, projectId: 'project-2' },
		});
		appService.createApp.mockResolvedValue(app(SERVER_ID));

		await approveCreate(tool);

		expect(appService.findApp).not.toHaveBeenCalled();
		expect(appService.createApp).toHaveBeenCalledWith(expect.objectContaining({ id: undefined }));
	});

	it('reuses the app of a pending id that already exists and says so', async () => {
		const { tool, appService } = setup({
			[INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY]: { appId: PENDING_ID, projectId: 'project-1' },
		});
		appService.findApp.mockResolvedValue(app(PENDING_ID));

		const result = await approveCreate(tool);

		expect(result).toMatchObject({ alreadyCreated: true });
		expect(appService.createApp).not.toHaveBeenCalled();
	});

	it('returns a failed pending id lookup as an error and does not create the app', async () => {
		const { tool, appService } = setup({
			[INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY]: { appId: PENDING_ID, projectId: 'project-1' },
		});
		appService.findApp.mockRejectedValue(new Error('Database unavailable'));

		const result = await approveCreate(tool);

		expect(result).toEqual({ error: 'Database unavailable' });
		expect(appService.createApp).not.toHaveBeenCalled();
	});

	it('keeps an open app folder, binds it to the thread and preserves uncommitted edits', async () => {
		const { tool, appService, thread, onArtifactChanged } = setup();
		vi.mocked(readBaseVersion).mockResolvedValue('v1');
		appService.getApp.mockResolvedValue(app(SERVER_ID));

		const result = await executeTool(tool, { action: 'open', appId: SERVER_ID });

		expect(result).toEqual({ path: `apps/${SERVER_ID}`, baseVersionId: 'v1', alreadyOpen: true });
		expect(checkOutDraft).not.toHaveBeenCalled();
		expect(thread.metadata?.[INSTANCE_AI_APP_TARGETS_METADATA_KEY]).toEqual([
			{ appId: SERVER_ID, projectId: 'project-1' },
		]);
		expect(onArtifactChanged).toHaveBeenCalledWith({
			type: 'app',
			id: SERVER_ID,
			name: 'Todos',
			projectId: 'project-1',
		});
	});

	it('refuses to commit an app that is not open', async () => {
		const { tool, appService } = setup();

		const result = await executeTool(tool, { action: 'commit', appId: SERVER_ID, label: 'x' });

		expect(result).toEqual({
			error: 'The app is not open in the workspace. Open it with the `open` action first.',
		});
		expect(appService.commit).not.toHaveBeenCalled();
	});

	it('commits the folder on its base, moves the base to the committed version and shows the app', async () => {
		const { tool, appService, thread, trackTelemetry, onArtifactChanged } = setup();
		vi.mocked(readBaseVersion).mockResolvedValue('v1');
		appService.getApp.mockResolvedValue(app(SERVER_ID));
		appService.commit.mockResolvedValue({
			versionId: 'v2',
			status: 'failed',
			attempts: 1,
			statusUpdatedAt: null,
			diagnostics: { stage: 'build', message: 'Build failed.', log: `${'x'.repeat(5000)}END` },
		});

		const result = await executeTool<{
			app: unknown;
			buildStatus: string;
			diagnostics: { log: string; message: string };
		}>(tool, { action: 'commit', appId: SERVER_ID, label: 'Add list' });

		expect(appService.commit).toHaveBeenCalledWith(SERVER_ID, 'v1', ARCHIVE, 'Add list');
		expect(writeBaseVersion).toHaveBeenCalledWith({}, SERVER_ID, 'v2');
		expect(result.app).toEqual({ id: SERVER_ID, name: 'Todos', projectId: 'project-1' });
		expect(result.buildStatus).toBe('failed');
		expect(result.diagnostics.log).toHaveLength(4000);
		expect(result.diagnostics.log.endsWith('END')).toBe(true);
		expect(thread.metadata?.[INSTANCE_AI_APP_TARGETS_METADATA_KEY]).toEqual([
			{ appId: SERVER_ID, projectId: 'project-1' },
		]);
		expect(onArtifactChanged).toHaveBeenCalledWith(expect.objectContaining({ id: SERVER_ID }));
		expect(trackTelemetry).toHaveBeenCalledWith('instance_ai_app_change_committed', {
			thread_id: 'thread-1',
			app_id: SERVER_ID,
			version_id: 'v2',
			build_status: 'failed',
			build_stage: 'build',
		});
	});

	it('returns a saved commit when the app cannot be read after it', async () => {
		const { tool, appService, onArtifactChanged, logger } = setup();
		vi.mocked(readBaseVersion).mockResolvedValue('v1');
		appService.commit.mockResolvedValue({
			versionId: 'v2',
			status: 'succeeded',
			attempts: 1,
			statusUpdatedAt: null,
		});
		appService.getApp.mockRejectedValue(new Error('Database unavailable'));

		const result = await executeTool(tool, { action: 'commit', appId: SERVER_ID, label: 'Edit' });

		expect(result).toEqual({ app: { id: SERVER_ID }, versionId: 'v2', buildStatus: 'succeeded' });
		expect(writeBaseVersion).toHaveBeenCalledWith({}, SERVER_ID, 'v2');
		expect(onArtifactChanged).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith('Failed to report the changed app', {
			appId: SERVER_ID,
			error: 'Database unavailable',
		});
	});

	it('returns an open app when the artifact report fails', async () => {
		const { tool, appService, onArtifactChanged, logger } = setup();
		appService.getApp.mockResolvedValue(app(SERVER_ID));
		onArtifactChanged.mockRejectedValue(new Error('Event bus unavailable'));

		const result = await executeTool(tool, { action: 'open', appId: SERVER_ID });

		expect(result).toEqual({ path: `apps/${SERVER_ID}`, baseVersionId: null });
		expect(logger.warn).toHaveBeenCalled();
	});

	it('keeps the base when the commit fails, so the folder is not lost', async () => {
		const { tool, appService } = setup();
		vi.mocked(readBaseVersion).mockResolvedValue('v1');
		appService.commit.mockRejectedValue(new Error('The draft changed. Reload it and try again.'));

		const result = await executeTool(tool, { action: 'commit', appId: SERVER_ID, label: 'x' });

		expect(result).toEqual({ error: 'The draft changed. Reload it and try again.' });
		expect(writeBaseVersion).not.toHaveBeenCalled();
	});

	it('discards local edits by checking out the draft again', async () => {
		const { tool, appService } = setup();
		vi.mocked(checkOutDraft).mockResolvedValue('v2');

		const result = await executeTool(tool, { action: 'discard', appId: SERVER_ID });

		expect(result).toEqual({ path: `apps/${SERVER_ID}`, baseVersionId: 'v2' });
		expect(checkOutDraft).toHaveBeenCalledWith({}, appService, SERVER_ID);
	});

	it('lists the apps of the project with their ids and URLs', async () => {
		const { tool, appService } = setup();
		appService.listApps.mockResolvedValue({
			data: [
				{
					...app(SERVER_ID),
					namespace: 'todos',
					visibility: 'project',
					publishedUrl: 'https://todos.example.com',
				},
			],
			count: 1,
		});

		const result = await executeTool(tool, { action: 'list', search: 'Todo' });

		expect(appService.listApps).toHaveBeenCalledWith({ name: 'Todo' });
		expect(result).toEqual({
			apps: [
				{
					id: SERVER_ID,
					name: 'Todos',
					namespace: 'todos',
					visibility: 'project',
					publishedUrl: 'https://todos.example.com',
				},
			],
			count: 1,
		});
	});

	it('rejects an app id that is not a UUID', () => {
		const { tool } = setup();

		expect(parseToolInput(tool, { action: 'open', appId: "x'; rm -rf /" }).success).toBe(false);
	});

	it('rejects an invalid namespace in the input', () => {
		const { tool } = setup();

		expect(
			parseToolInput(tool, {
				action: 'create',
				blueprint: { ...BLUEPRINT, namespace: 'Todo App' },
			}).success,
		).toBe(false);
	});

	it('exposes an object input schema to the model', () => {
		const { inputSchema } = setup().tool as { inputSchema: unknown };
		if (!isZodSchema(inputSchema)) throw new Error('expected a Zod input schema');

		expect(zodToJsonSchema(inputSchema)).toMatchObject({ type: 'object' });
	});
});
