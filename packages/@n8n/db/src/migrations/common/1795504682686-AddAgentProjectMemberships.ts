import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Gives the service account of every agent in a team project the
 * `project:agent` role in that project. With runtime identity on, a published
 * agent runs as its account, and this role gives it what the project gave it
 * before. A personal project has no members, so its agents get no row.
 *
 * New agents get the row when they are created.
 */
export class AddAgentProjectMemberships1795504682686 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.ensureAgentProjectRole(context);

		const { escape, runQuery } = context;
		const t = {
			agents: escape.tableName('agents'),
			project: escape.tableName('project'),
			projectRelation: escape.tableName('project_relation'),
		};
		const c = {
			id: escape.columnName('id'),
			type: escape.columnName('type'),
			role: escape.columnName('role'),
			userId: escape.columnName('userId'),
			projectId: escape.columnName('projectId'),
			identityId: escape.columnName('identityId'),
		};

		// One statement: the number of rows is the number of agents in team projects.
		await runQuery(
			`INSERT INTO ${t.projectRelation} (${c.projectId}, ${c.userId}, ${c.role})
			SELECT a.${c.projectId}, a.${c.identityId}, 'project:agent'
			FROM ${t.agents} a
			JOIN ${t.project} p ON p.${c.id} = a.${c.projectId}
			WHERE p.${c.type} = 'team'
			ON CONFLICT DO NOTHING`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		const projectRelation = escape.tableName('project_relation');
		await runQuery(
			`DELETE FROM ${projectRelation} WHERE ${escape.columnName('role')} = 'project:agent'`,
		);
	}

	/** Roles sync on start, after migrations. `project_relation.role` has an FK to the role. */
	private async ensureAgentProjectRole({ escape, runQuery }: MigrationContext) {
		const role = escape.tableName('role');
		await runQuery(
			`INSERT INTO ${role} (${escape.columnName('slug')}, ${escape.columnName('roleType')}, ${escape.columnName('systemRole')}) VALUES ('project:agent', 'project', :systemRole) ON CONFLICT DO NOTHING`,
			{ systemRole: true },
		);
	}
}
