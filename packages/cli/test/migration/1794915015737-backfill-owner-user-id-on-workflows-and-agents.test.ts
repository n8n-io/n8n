import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'BackfillOwnerUserIdOnWorkflowsAndAgents1794915015737';

type UserName =
	| 'alice'
	| 'bob'
	| 'carol'
	| 'dave'
	| 'outsider'
	| 'instanceAdmin'
	| 'instanceOwner'
	| 'service';
type Publication = [user: UserName | null, event: 'activated' | 'deactivated'];
type Resource = { projectId: string | null; publications: Publication[] };

const userIds: Record<UserName, string> = {
	alice: randomUUID(),
	bob: randomUUID(),
	carol: randomUUID(),
	dave: randomUUID(),
	outsider: randomUUID(),
	instanceAdmin: randomUUID(),
	instanceOwner: randomUUID(),
	service: randomUUID(),
};

const globalRoles: Record<string, string> = {
	instanceAdmin: 'global:admin',
	instanceOwner: 'global:owner',
};

const relations: Array<[projectId: string, user: UserName, role: string, createdDay: number]> = [
	['personal-alice', 'alice', 'project:personalOwner', 1],
	['personal-service', 'service', 'project:personalOwner', 1],
	['team', 'service', 'project:admin', 1],
	['team', 'carol', 'project:admin', 2],
	['team', 'bob', 'project:admin', 3],
	['team', 'dave', 'project:editor', 4],
	['team-sole-admin', 'service', 'project:admin', 1],
	['team-sole-admin', 'alice', 'project:admin', 1],
];

const cases: Array<[rule: string, resource: Resource, owner: UserName | null]> = [
	[
		'the personal project owner before a publisher',
		{ projectId: 'personal-alice', publications: [['dave', 'activated']] },
		'alice',
	],
	[
		'nobody when the personal project owner is a service account',
		{ projectId: 'personal-service', publications: [] },
		null,
	],
	[
		'the first publisher who is a member',
		{
			projectId: 'team',
			publications: [
				[null, 'activated'],
				['dave', 'activated'],
				['bob', 'activated'],
			],
		},
		'dave',
	],
	[
		'the last publisher when the first is not a member',
		{
			projectId: 'team',
			publications: [
				['outsider', 'activated'],
				['bob', 'activated'],
				['dave', 'activated'],
			],
		},
		'dave',
	],
	[
		'an instance admin who published and is not a member',
		{ projectId: 'team', publications: [['instanceAdmin', 'activated']] },
		'instanceAdmin',
	],
	[
		'nobody when two people are project admins and no publisher is a valid member',
		{
			projectId: 'team',
			publications: [
				['service', 'activated'],
				['outsider', 'activated'],
				['bob', 'deactivated'],
			],
		},
		null,
	],
	[
		'the project admin when one person is project admin',
		{ projectId: 'team-sole-admin', publications: [] },
		'alice',
	],
	[
		'the instance owner when a team project has no admin and no valid publisher',
		{ projectId: 'team-empty', publications: [['outsider', 'activated']] },
		'instanceOwner',
	],
];

describe('BackfillOwnerUserIdOnWorkflowsAndAgents migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insert(table: string, row: Record<string, unknown>) {
		await withContext(async ({ escape, runQuery }) => {
			const keys = Object.keys(row);
			await runQuery(
				`INSERT INTO ${escape.tableName(table)} (${keys.map(escape.columnName).join(', ')}) VALUES (${keys.map((key) => `:${key}`).join(', ')})`,
				row,
			);
		});
	}

	async function insertPublications(table: string, key: string, publications: Publication[]) {
		for (const [user, event] of publications) {
			await insert(table, {
				[key]: 'resource',
				event,
				userId: user && userIds[user],
				...(table === 'agent_publish_history' ? { author: 'Author' } : {}),
			});
		}
	}

	async function insertWorkflow({ publications }: Resource, share: Record<string, unknown>) {
		const now = new Date();
		await insert('workflow_entity', {
			id: 'resource',
			name: 'resource',
			nodes: '[]',
			connections: '{}',
			active: false,
			versionId: randomUUID(),
			createdAt: now,
			updatedAt: now,
		});
		await insert('shared_workflow', { workflowId: 'resource', ...share });
		await insertPublications('workflow_publish_history', 'workflowId', publications);
	}

	async function insertAgent({ projectId, publications }: Resource) {
		await insert('agents', {
			id: 'resource',
			name: 'resource',
			projectId,
			scope: projectId ? 'project' : 'instance',
			integrations: '[]',
			tools: '{}',
			skills: '{}',
		});
		await insertPublications('agent_publish_history', 'agentId', publications);
	}

	const getRow = async (table: string) =>
		await withContext(async ({ escape, runQuery }) => {
			const [row] = await runQuery<Array<Record<string, unknown>>>(
				`SELECT * FROM ${escape.tableName(table)}`,
			);
			return row;
		});

	async function getOwner(table: string) {
		const { ownerUserId } = await getRow(table);
		const owner = Object.entries(userIds).find(([, id]) => id === ownerUserId);
		return owner ? owner[0] : null;
	}

	beforeEach(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
		await withContext(
			async ({ escape, runQuery }) => await runQuery(`DELETE FROM ${escape.tableName('user')}`),
		);

		for (const [name, id] of Object.entries(userIds)) {
			await insert('user', {
				id,
				kind: name === 'service' ? 'service' : 'person',
				disabled: name === 'dave',
				roleSlug: globalRoles[name] ?? 'global:member',
			});
		}
		for (const id of [
			'personal-alice',
			'personal-service',
			'team',
			'team-sole-admin',
			'team-empty',
		]) {
			await insert('project', {
				id,
				name: id,
				type: id.startsWith('personal') ? 'personal' : 'team',
			});
		}
		for (const [projectId, user, role, createdDay] of relations) {
			const createdAt = new Date(2026, 0, createdDay);
			await insert('project_relation', {
				projectId,
				userId: userIds[user],
				role,
				createdAt,
				updatedAt: createdAt,
			});
		}
	});

	afterEach(async () => {
		await Container.get(DbConnection).close();
	});

	it.each(cases)('gives a workflow and a project agent %s', async (_rule, resource, owner) => {
		await insertWorkflow(resource, { projectId: resource.projectId, role: 'workflow:owner' });
		await insertAgent(resource);

		await runSingleMigration(MIGRATION_NAME);

		expect(await getOwner('workflow_entity')).toBe(owner);
		expect(await getOwner('agents')).toBe(owner);
	});

	it('gives no owner to a workflow without an owner share and to an instance agent', async () => {
		const resource: Resource = { projectId: null, publications: [['bob', 'activated']] };
		await insertWorkflow(resource, { projectId: 'team', role: 'workflow:editor' });
		await insertAgent(resource);

		await runSingleMigration(MIGRATION_NAME);

		expect(await getOwner('workflow_entity')).toBeNull();
		expect(await getOwner('agents')).toBeNull();
	});

	it('keeps the version and the update time of a workflow', async () => {
		await insertWorkflow(
			{ projectId: 'personal-alice', publications: [] },
			{ projectId: 'personal-alice', role: 'workflow:owner' },
		);
		const { versionCounter, updatedAt, versionId } = await getRow('workflow_entity');

		await runSingleMigration(MIGRATION_NAME);

		expect(await getRow('workflow_entity')).toMatchObject({
			ownerUserId: userIds.alice,
			versionCounter,
			updatedAt,
			versionId,
		});
	});
});
