import { ModuleRegistry } from '@n8n/backend-common';
import type { Logger } from '@n8n/backend-common';
import type {
	CredentialsEntity,
	CredentialsRepository,
	TagEntity,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { STICKY_NODE_TYPE, UserError, type INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { DataTableColumn } from '@/modules/data-table/data-table-column.entity';
import type { DataTable } from '@/modules/data-table/data-table.entity';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';

import type { KnowledgeSource } from '../../database/entities';
import type {
	ConnectorSyncContext,
	ConnectorSyncResult,
	KnowledgeDocumentDraft,
} from '../connector.types';
import { N8nKnowledgeConnector } from '../n8n.connector';

const SECRET_PARAMETER = 'xoxb-super-secret-token';
const ENCRYPTED_BLOB = 'U2FsdGVkX1+encrypted-credential-blob';

const node = (over: Partial<INode> = {}): INode => ({
	id: 'node-1',
	name: 'Send message',
	type: 'n8n-nodes-base.slack',
	typeVersion: 2.2,
	position: [0, 0],
	parameters: { token: SECRET_PARAMETER, channel: '#finance-private' },
	...over,
});

const stickyNote = (content: string): INode =>
	node({
		id: 'sticky-1',
		name: 'Sticky Note',
		type: STICKY_NODE_TYPE,
		parameters: { content },
	});

/**
 * `mock<T>(values)` re-proxies nested values, which turns a `Date` into something
 * that no longer compares as one, so the real values are assigned on top instead.
 */
const fixture = <T extends object>(values: Partial<T>): T => Object.assign(mock<T>(), values);

const tag = (name: string) => fixture<TagEntity>({ id: `tag-${name}`, name });

const workflow = (over: Partial<WorkflowEntity> = {}) =>
	fixture<WorkflowEntity>({
		id: 'wf-1',
		name: 'Daily digest',
		activeVersionId: null,
		nodes: [],
		tags: [],
		updatedAt: new Date('2024-05-01T10:00:00.000Z'),
		...over,
	});

const column = (name: string, type: DataTableColumn['type'], index: number) =>
	fixture<DataTableColumn>({ id: `col-${name}`, name, type, index });

const dataTable = (over: Partial<DataTable> = {}) =>
	fixture<DataTable>({
		id: 'dt-1',
		name: 'Customers',
		projectId: 'project-1',
		columns: [],
		updatedAt: new Date('2024-05-02T10:00:00.000Z'),
		...over,
	});

const credential = (over: Partial<CredentialsEntity> = {}) =>
	fixture<CredentialsEntity>({
		id: 'cred-1',
		name: 'Slack account',
		type: 'slackApi',
		// Present on the fixture on purpose: the drafts must never carry it.
		data: ENCRYPTED_BLOB,
		updatedAt: new Date('2024-05-03T10:00:00.000Z'),
		...over,
	});

describe('N8nKnowledgeConnector', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const dataTableRepository = mock<DataTableRepository>();
	const moduleRegistry = mock<ModuleRegistry>();
	const logger = mock<Logger>();

	const connector = new N8nKnowledgeConnector(workflowRepository, credentialsRepository);

	const syncContext = (
		config: Record<string, unknown> = {},
		over: Partial<ConnectorSyncContext> = {},
	): ConnectorSyncContext => ({
		source: fixture<KnowledgeSource>({
			id: 'source-1',
			name: 'This instance',
			type: 'n8n',
			config,
		}),
		checkpoint: null,
		credential: null,
		logger,
		...over,
	});

	const drain = async (ctx: ConnectorSyncContext) => {
		const generator = connector.sync(ctx);
		const drafts: KnowledgeDocumentDraft[] = [];

		let next = await generator.next();
		while (!next.done) {
			drafts.push(next.value);
			next = await generator.next();
		}

		const result: ConnectorSyncResult = next.value;

		return { drafts, result };
	};

	beforeEach(() => {
		vi.clearAllMocks();

		workflowRepository.find.mockResolvedValue([]);
		credentialsRepository.find.mockResolvedValue([]);
		dataTableRepository.find.mockResolvedValue([]);
		moduleRegistry.isActive.mockReturnValue(false);

		// The connector resolves `ModuleRegistry` and the data-table repository through
		// the container, so both tokens are routed to their mocks here.
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) =>
			token === ModuleRegistry ? moduleRegistry : dataTableRepository,
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('parseConfig', () => {
		test('enables every kind by default', () => {
			expect(connector.parseConfig({})).toEqual({
				includeWorkflows: true,
				includeDataTables: true,
				includeCredentials: true,
			});
		});

		test('keeps explicitly disabled kinds', () => {
			expect(connector.parseConfig({ includeCredentials: false })).toEqual({
				includeWorkflows: true,
				includeDataTables: true,
				includeCredentials: false,
			});
		});

		test('throws a UserError when a flag has the wrong type', () => {
			expect(() => connector.parseConfig({ includeWorkflows: 'yes' })).toThrow(UserError);
		});
	});

	describe('sync - workflows', () => {
		test('emits a workflow document with its tags, node inventory and sticky notes', async () => {
			workflowRepository.find.mockResolvedValue([
				workflow({
					activeVersionId: 'version-1',
					tags: [tag('marketing'), tag('ops')],
					nodes: [
						node({ id: 'node-1', name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger' }),
						node({ id: 'node-2', name: 'Send message' }),
						stickyNote('Runs every morning before the standup.'),
					],
				}),
			]);

			const { drafts } = await drain(syncContext({ includeCredentials: false }));

			expect(drafts).toHaveLength(1);
			const [draft] = drafts;

			expect(draft.externalId).toBe('workflow:wf-1');
			expect(draft.title).toBe('Daily digest');
			expect(draft.url).toBe('/workflow/wf-1');
			expect(draft.sourceUpdatedAt).toEqual(new Date('2024-05-01T10:00:00.000Z'));
			expect(draft.metadata).toEqual({
				kind: 'workflow',
				workflowId: 'wf-1',
				active: true,
				nodeCount: 2,
			});
			expect(draft.text).toBe(
				[
					'Workflow "Daily digest"',
					'Status: active',
					'Tags: marketing, ops',
					'Nodes:',
					'- Schedule (n8n-nodes-base.scheduleTrigger)',
					'- Send message (n8n-nodes-base.slack)',
					'Notes:',
					'- Runs every morning before the standup.',
				].join('\n'),
			);
		});

		test('never emits node parameters', async () => {
			workflowRepository.find.mockResolvedValue([
				workflow({ nodes: [node(), stickyNote('Documented on purpose.')] }),
			]);

			const { drafts } = await drain(syncContext({ includeCredentials: false }));

			const serialized = JSON.stringify(drafts);
			expect(serialized).not.toContain(SECRET_PARAMETER);
			expect(serialized).not.toContain('#finance-private');
			// Sticky notes are the one exception - their content is user documentation.
			expect(serialized).toContain('Documented on purpose.');
		});

		test('marks a workflow without a published version as inactive', async () => {
			workflowRepository.find.mockResolvedValue([workflow()]);

			const { drafts } = await drain(syncContext({ includeCredentials: false }));

			expect(drafts[0].text).toContain('Status: inactive');
			expect(drafts[0].metadata.active).toBe(false);
		});
	});

	describe('sync - credentials', () => {
		test('emits metadata only, never the encrypted data blob', async () => {
			credentialsRepository.find.mockResolvedValue([credential()]);

			const { drafts } = await drain(syncContext({ includeWorkflows: false }));

			expect(drafts).toHaveLength(1);
			expect(drafts[0]).toEqual({
				externalId: 'credential:cred-1',
				title: 'Slack account',
				text: 'Credential "Slack account" of type "slackApi" is available on this instance.',
				metadata: {
					kind: 'credential',
					credentialId: 'cred-1',
					credentialType: 'slackApi',
				},
				sourceUpdatedAt: new Date('2024-05-03T10:00:00.000Z'),
			});
			expect(JSON.stringify(drafts)).not.toContain(ENCRYPTED_BLOB);
		});

		test('does not even read the encrypted data column', async () => {
			await drain(syncContext({ includeWorkflows: false }));

			expect(credentialsRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({ select: ['id', 'name', 'type', 'updatedAt'] }),
			);
		});
	});

	describe('sync - data tables', () => {
		test('skips data tables when the data-table module is not active', async () => {
			const { drafts } = await drain(
				syncContext({ includeWorkflows: false, includeCredentials: false }),
			);

			expect(moduleRegistry.isActive).toHaveBeenCalledWith('data-table');
			expect(dataTableRepository.find).not.toHaveBeenCalled();
			expect(drafts).toEqual([]);
		});

		test('emits a data table document with its columns when the module is active', async () => {
			moduleRegistry.isActive.mockReturnValue(true);
			dataTableRepository.find.mockResolvedValue([
				dataTable({
					columns: [column('age', 'number', 1), column('email', 'string', 0)],
				}),
			]);

			const { drafts } = await drain(
				syncContext({ includeWorkflows: false, includeCredentials: false }),
			);

			expect(drafts).toHaveLength(1);
			expect(drafts[0].externalId).toBe('dataTable:dt-1');
			expect(drafts[0].title).toBe('Customers');
			expect(drafts[0].text).toBe(
				[
					'Data table "Customers"',
					'Project: project-1',
					'Columns:',
					'- email (string)',
					'- age (number)',
				].join('\n'),
			);
			expect(drafts[0].metadata).toEqual({
				kind: 'dataTable',
				dataTableId: 'dt-1',
				projectId: 'project-1',
			});
		});
	});

	describe('sync - config flags', () => {
		test('reads nothing for the kinds the source disabled', async () => {
			const { drafts } = await drain(
				syncContext({
					includeWorkflows: false,
					includeDataTables: false,
					includeCredentials: false,
				}),
			);

			expect(drafts).toEqual([]);
			expect(workflowRepository.find).not.toHaveBeenCalled();
			expect(credentialsRepository.find).not.toHaveBeenCalled();
			expect(moduleRegistry.isActive).not.toHaveBeenCalled();
		});

		test('emits every kind by default', async () => {
			moduleRegistry.isActive.mockReturnValue(true);
			workflowRepository.find.mockResolvedValue([workflow()]);
			dataTableRepository.find.mockResolvedValue([dataTable()]);
			credentialsRepository.find.mockResolvedValue([credential()]);

			const { drafts } = await drain(syncContext());

			expect(drafts.map(({ externalId }) => externalId)).toEqual([
				'workflow:wf-1',
				'dataTable:dt-1',
				'credential:cred-1',
			]);
		});
	});

	describe('sync - checkpoint', () => {
		test('returns the newest updatedAt it emitted', async () => {
			workflowRepository.find.mockResolvedValue([
				workflow({ id: 'wf-old', updatedAt: new Date('2024-05-01T10:00:00.000Z') }),
				workflow({ id: 'wf-new', updatedAt: new Date('2024-06-09T08:30:00.000Z') }),
			]);
			credentialsRepository.find.mockResolvedValue([
				credential({ updatedAt: new Date('2024-05-03T10:00:00.000Z') }),
			]);

			const { result } = await drain(syncContext({ includeDataTables: false }));

			expect(result).toEqual({ checkpoint: { since: '2024-06-09T08:30:00.000Z' } });
		});

		test('only emits entities updated after the checkpoint', async () => {
			workflowRepository.find.mockResolvedValue([
				workflow({ id: 'wf-stale', updatedAt: new Date('2024-05-01T10:00:00.000Z') }),
				workflow({ id: 'wf-touched', updatedAt: new Date('2024-05-20T10:00:00.000Z') }),
			]);
			credentialsRepository.find.mockResolvedValue([
				credential({ id: 'cred-stale', updatedAt: new Date('2024-05-03T10:00:00.000Z') }),
			]);

			const { drafts, result } = await drain(
				syncContext(
					{ includeDataTables: false },
					{ checkpoint: { since: '2024-05-10T00:00:00.000Z' } },
				),
			);

			expect(drafts.map(({ externalId }) => externalId)).toEqual(['workflow:wf-touched']);
			expect(result).toEqual({ checkpoint: { since: '2024-05-20T10:00:00.000Z' } });
		});

		test('carries the previous checkpoint forward when nothing changed', async () => {
			workflowRepository.find.mockResolvedValue([
				workflow({ updatedAt: new Date('2024-05-01T10:00:00.000Z') }),
			]);

			const { drafts, result } = await drain(
				syncContext(
					{ includeDataTables: false, includeCredentials: false },
					{ checkpoint: { since: '2024-05-10T00:00:00.000Z' } },
				),
			);

			expect(drafts).toEqual([]);
			expect(result).toEqual({ checkpoint: { since: '2024-05-10T00:00:00.000Z' } });
		});

		test('ignores an unreadable checkpoint and resyncs everything', async () => {
			workflowRepository.find.mockResolvedValue([workflow()]);

			const { drafts } = await drain(
				syncContext(
					{ includeDataTables: false, includeCredentials: false },
					{ checkpoint: { since: 'not-a-date' } },
				),
			);

			expect(drafts).toHaveLength(1);
		});
	});

	describe('sync - abort', () => {
		test('stops with an error when the abort signal fires', async () => {
			const controller = new AbortController();
			controller.abort();

			await expect(drain(syncContext({}, { abortSignal: controller.signal }))).rejects.toThrow(
				'aborted',
			);
			expect(workflowRepository.find).not.toHaveBeenCalled();
		});
	});

	describe('listExternalIds', () => {
		test('enumerates the ids of every enabled kind', async () => {
			moduleRegistry.isActive.mockReturnValue(true);
			workflowRepository.find.mockResolvedValue([
				workflow({ id: 'wf-1' }),
				workflow({ id: 'wf-2' }),
			]);
			dataTableRepository.find.mockResolvedValue([dataTable({ id: 'dt-1' })]);
			credentialsRepository.find.mockResolvedValue([credential({ id: 'cred-1' })]);

			await expect(connector.listExternalIds(syncContext())).resolves.toEqual([
				'workflow:wf-1',
				'workflow:wf-2',
				'dataTable:dt-1',
				'credential:cred-1',
			]);

			expect(workflowRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({ select: ['id'] }),
			);
		});

		test('leaves out the kinds the source disabled and an inactive data-table module', async () => {
			workflowRepository.find.mockResolvedValue([workflow({ id: 'wf-1' })]);

			await expect(
				connector.listExternalIds(syncContext({ includeCredentials: false })),
			).resolves.toEqual(['workflow:wf-1']);

			expect(dataTableRepository.find).not.toHaveBeenCalled();
			expect(credentialsRepository.find).not.toHaveBeenCalled();
		});
	});
});
