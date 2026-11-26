import type { IrreversibleMigration, MigrationContext } from '../migration-types';

// A migration is a snapshot. It must not change when the role constants change.
const INSTANCE_OWNER_ROLE = 'global:owner';
const IMPLICIT_TEAM_PROJECT_MEMBER_ROLES = "'global:owner', 'global:admin'";

type OwnedTable = {
	name: string;
	homeProjectId: (ctx: MigrationContext) => string;
	publishHistory: string;
	publishHistoryKey: string;
};

const workflows: OwnedTable = {
	name: 'workflow_entity',
	homeProjectId: ({ escape }) => {
		const c = escape.columnName;
		return `(SELECT MIN(s.${c('projectId')}) FROM ${escape.tableName('shared_workflow')} s
			WHERE s.${c('workflowId')} = t.${c('id')} AND s.${c('role')} = 'workflow:owner')`;
	},
	publishHistory: 'workflow_publish_history',
	publishHistoryKey: 'workflowId',
};

const agents: OwnedTable = {
	name: 'agents',
	homeProjectId: ({ escape }) => `t.${escape.columnName('projectId')}`,
	publishHistory: 'agent_publish_history',
	publishHistoryKey: 'agentId',
};

export class BackfillOwnerUserIdOnWorkflowsAndAgents1794915015737 implements IrreversibleMigration {
	async up(ctx: MigrationContext) {
		for (const table of [workflows, agents]) {
			await this.backfillOwner(ctx, table);
		}
	}

	private async backfillOwner(ctx: MigrationContext, table: OwnedTable) {
		const { escape, runQuery } = ctx;
		const ownerUserId = escape.columnName('ownerUserId');

		await runQuery(`UPDATE ${escape.tableName(table.name)} AS t SET ${ownerUserId} = COALESCE(
				(${this.solePersonalProjectOwner(ctx, table)}),
				(${this.publisher(ctx, table, 'MIN')}),
				(${this.publisher(ctx, table, 'MAX')}),
				(${this.oldestTeamProjectAdmin(ctx, table)}),
				(${this.instanceOwnerOfTeamProjectWithoutAdmin(ctx, table)})
			) WHERE ${ownerUserId} IS NULL`);
	}

	private solePersonalProjectOwner(ctx: MigrationContext, table: OwnedTable) {
		const { escape } = ctx;
		const c = escape.columnName;

		return `SELECT r.${c('userId')} FROM ${escape.tableName('project_relation')} r
			JOIN ${escape.tableName('project')} p
				ON p.${c('id')} = r.${c('projectId')} AND p.${c('type')} = 'personal'
			JOIN ${escape.tableName('user')} u
				ON u.${c('id')} = r.${c('userId')} AND u.${c('kind')} = 'person'
			WHERE r.${c('projectId')} = ${table.homeProjectId(ctx)} AND r.${c('role')} = 'project:personalOwner'
				AND NOT EXISTS (
					SELECT 1 FROM ${escape.tableName('project_relation')} o
					JOIN ${escape.tableName('user')} ou
						ON ou.${c('id')} = o.${c('userId')} AND ou.${c('kind')} = 'person'
					WHERE o.${c('projectId')} = r.${c('projectId')} AND o.${c('role')} = r.${c('role')}
						AND o.${c('userId')} <> r.${c('userId')}
				)`;
	}

	private oldestTeamProjectAdmin(ctx: MigrationContext, table: OwnedTable) {
		const { escape } = ctx;
		const c = escape.columnName;

		return `SELECT r.${c('userId')} FROM ${escape.tableName('project_relation')} r
			JOIN ${escape.tableName('project')} p
				ON p.${c('id')} = r.${c('projectId')} AND p.${c('type')} = 'team'
			JOIN ${escape.tableName('user')} u
				ON u.${c('id')} = r.${c('userId')} AND u.${c('kind')} = 'person'
			WHERE r.${c('projectId')} = ${table.homeProjectId(ctx)} AND r.${c('role')} = 'project:admin'
			ORDER BY r.${c('createdAt')} ASC, r.${c('userId')} ASC
			LIMIT 1`;
	}

	private instanceOwnerOfTeamProjectWithoutAdmin(ctx: MigrationContext, table: OwnedTable) {
		const { escape } = ctx;
		const c = escape.columnName;
		const isInstanceOwner = (alias: string) =>
			`${alias}.${c('roleSlug')} = '${INSTANCE_OWNER_ROLE}'`;

		return `SELECT u.${c('id')} FROM ${escape.tableName('user')} u
			JOIN ${escape.tableName('project')} p
				ON p.${c('id')} = ${table.homeProjectId(ctx)} AND p.${c('type')} = 'team'
			WHERE ${isInstanceOwner('u')} AND u.${c('kind')} = 'person'
				AND NOT EXISTS (
					SELECT 1 FROM ${escape.tableName('user')} o
					WHERE ${isInstanceOwner('o')} AND o.${c('id')} <> u.${c('id')}
				)
				AND NOT EXISTS (
					SELECT 1 FROM ${escape.tableName('project_relation')} r
					JOIN ${escape.tableName('user')} a
						ON a.${c('id')} = r.${c('userId')} AND a.${c('kind')} = 'person'
					WHERE r.${c('projectId')} = p.${c('id')} AND r.${c('role')} = 'project:admin'
				)`;
	}

	private publisher(ctx: MigrationContext, table: OwnedTable, pick: 'MIN' | 'MAX') {
		const { escape } = ctx;
		const c = escape.columnName;
		const history = escape.tableName(table.publishHistory);

		return `SELECT h.${c('userId')} FROM ${history} h
			JOIN ${escape.tableName('user')} u
				ON u.${c('id')} = h.${c('userId')} AND u.${c('kind')} = 'person'
			WHERE h.${c('id')} = (
				SELECT ${pick}(e.${c('id')}) FROM ${history} e
				WHERE e.${c(table.publishHistoryKey)} = t.${c('id')}
					AND e.${c('event')} = 'activated' AND e.${c('userId')} IS NOT NULL
			) AND (
				EXISTS (
					SELECT 1 FROM ${escape.tableName('project_relation')} r
					WHERE r.${c('userId')} = h.${c('userId')}
						AND r.${c('projectId')} = ${table.homeProjectId(ctx)}
				) OR (
					u.${c('roleSlug')} IN (${IMPLICIT_TEAM_PROJECT_MEMBER_ROLES}) AND EXISTS (
						SELECT 1 FROM ${escape.tableName('project')} p
						WHERE p.${c('id')} = ${table.homeProjectId(ctx)} AND p.${c('type')} = 'team'
					)
				)
			)`;
	}
}
