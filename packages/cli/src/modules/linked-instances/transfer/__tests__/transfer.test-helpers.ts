import type { LinkedInstanceRemoteProject } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { CredentialsFinderService, EventService } from '@n8n/backend-services';
import type { User, WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { McpSettingsService } from '@/modules/mcp/mcp.settings.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { LinkedInstanceStore } from '../../linked-instance.store';
import type {
	RemoteInstanceClient,
	RemoteInstanceClientFactory,
} from '../../remote/remote-instance.client';
import {
	CLOUD,
	fakeCipher,
	fakeRepository,
	fakeToken,
} from '../../__tests__/linked-instances.test-helpers';
import { LinkedInstanceSessions } from '../linked-instance-sessions';
import { LocalPackageImport } from '../local-package-import';
import type { LocalWorkflowDeactivator } from '../local-workflow-deactivator';
import { TransferLocalWorkflows } from '../transfer-local-workflows';
import { TransferPreflightService } from '../transfer-preflight.service';
import { TransferService } from '../transfer.service';

/** Every tool that a recent n8n instance offers for a move. */
export const ALL_TOOLS = [
	'search_projects',
	'list_credentials',
	'publish_workflow',
	'export_workflow_package',
	'import_workflow_package',
];

export const OPS: LinkedInstanceRemoteProject = { id: 'Xk3pQ9aZ1bC2dE4f', name: 'Ops' };

/** The personal project of the token's user in the linked instance. */
export const REMOTE_PERSONAL_PROJECT_ID = 'Pq7rS8tU9vW0xY1z';

type ToolHandler = (args: Record<string, unknown>) => unknown;

/**
 * A linked instance with the package tools. A repeated import of the same source workflow into
 * the same project updates the first copy, as the real lineage does.
 */
export function fakeRemote(client: ReturnType<typeof mock<RemoteInstanceClient>>) {
	const copies = new Map<string, string>();
	const handlers: Record<string, ToolHandler> = {
		import_workflow_package: (args) => {
			const project = typeof args.projectId === 'string' ? args.projectId : 'personal';
			const key = `${project}:${String(args.sourceWorkflowId)}`;
			const created = !copies.has(key);
			if (created) copies.set(key, `remote${copies.size + 1}`);
			return {
				workflowId: copies.get(key),
				workflowName: 'Daily report',
				created,
				published: false,
				credentialsNeedingSetup: [],
				missingNodeTypes: [],
				warnings: [],
			};
		},
		publish_workflow: (args) => ({
			success: true,
			workflowId: args.workflowId,
			activeVersionId: 'version-1',
		}),
		list_credentials: () => ({ data: [], count: 0 }),
		search_projects: () => ({
			data: [
				{ id: REMOTE_PERSONAL_PROJECT_ID, name: 'Alice <alice@example.com>', type: 'personal' },
			],
			count: 1,
		}),
		export_workflow_package: () => ({
			packageBase64: Buffer.from('remote-package').toString('base64'),
			workflowName: 'Daily report',
			sizeBytes: 14,
			requirements: { nodeTypes: [], credentials: [] },
			warnings: [],
		}),
	};
	client.probe.mockResolvedValue({ ok: true, toolNames: ALL_TOOLS });
	client.callTool.mockImplementation(async (name, args) => {
		const handler = handlers[name];
		if (!handler) throw new Error(`Unexpected tool ${name}`);
		return handler(args);
	});
	const callsOf = (name: string) =>
		client.callTool.mock.calls.filter(([toolName]) => toolName === name).map(([, args]) => args);
	return { handlers, copies, callsOf };
}

export const node = (overrides: Partial<INode> = {}): INode => ({
	id: 'node-1',
	name: 'Post to Slack',
	type: 'n8n-nodes-base.slack',
	typeVersion: 2.3,
	position: [0, 0],
	parameters: {},
	...overrides,
});

export const workflowEntity = (overrides: Partial<WorkflowEntity> = {}) =>
	({
		id: 'wf1',
		name: 'Daily report',
		nodes: [node()],
		connections: {},
		settings: {},
		isArchived: false,
		activeVersionId: null,
		...overrides,
	}) as WorkflowEntity;

export function transferSetup() {
	const { repository, rows } = fakeRepository();
	const store = new LinkedInstanceStore(repository, fakeCipher());
	const client = mock<RemoteInstanceClient>();
	const clientFactory = mock<RemoteInstanceClientFactory>();
	clientFactory.create.mockReturnValue(client);
	const remote = fakeRemote(client);
	const sessions = new LinkedInstanceSessions(store, clientFactory);

	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const workflowFinder = mock<WorkflowFinderService>();
	const projectService = mock<ProjectService>();
	const credentialsFinder = mock<CredentialsFinderService>();
	const deactivator = mock<LocalWorkflowDeactivator>();
	const mcpSettings = mock<McpSettingsService>();
	const packageImport = new LocalPackageImport(projectService, mcpSettings, logger);
	const local = new TransferLocalWorkflows(
		workflowFinder,
		credentialsFinder,
		deactivator,
		packageImport,
	);

	const eventService = mock<EventService>();
	const service = new TransferService(logger, eventService, sessions, local);
	const preflightService = new TransferPreflightService(logger, sessions, local);

	/** Links the instance for the user, with the given default project. */
	async function link(
		owner: User,
		defaultRemoteProject: LinkedInstanceRemoteProject | null = OPS,
		token = fakeToken(),
	) {
		const summary = await store.create({
			userId: owner.id,
			name: 'Cloud',
			origin: CLOUD,
			token,
			status: 'online',
			verifiedAt: new Date(),
			defaultRemoteProject,
		});
		if (!summary) throw new Error('The link was not created');
		return { ...summary, token };
	}

	return {
		service,
		preflightService,
		sessions,
		store,
		rows,
		client,
		clientFactory,
		remote,
		workflowFinder,
		projectService,
		credentialsFinder,
		deactivator,
		mcpSettings,
		logger,
		eventService,
		link,
	};
}

/** Everything that a test can see: results, errors, events and log lines. */
export function serialised(...values: unknown[]): string {
	return JSON.stringify(values, (_, value: unknown) =>
		value instanceof Error ? { name: value.name, message: value.message } : value,
	);
}
