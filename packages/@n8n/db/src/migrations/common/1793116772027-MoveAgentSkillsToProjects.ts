import { createHash, randomUUID } from 'node:crypto';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/** An agent skill with its latest version and the agent that holds it. */
type AgentSkillRow = {
	skillId: string;
	projectId: string | null;
	agentName: string;
	versionId: string;
	version: number;
	name: string;
};

type VersionContentRow = {
	description: string;
	instructions: string;
	/** A JSON string on SQLite, an object on Postgres. */
	frontmatter: string | Record<string, unknown> | null;
};

type FileRow = { path: string; content: string };

/** `skill_version.name` is varchar(128). */
const NAME_MAX_LENGTH = 128;

/** The longest agent name a new skill name holds, so the attempt number always fits. */
const AGENT_LABEL_MAX_LENGTH = NAME_MAX_LENGTH / 2;

const BATCH_SIZE = 100;

/**
 * Removes the agent scope of skills. Each agent skill becomes a skill of the agent's
 * project, or an instance skill when the agent has no project. The agent keeps its
 * refs and pins, because the skill id stays the same.
 *
 * When the target already has a skill with the same name, the moved skill gets a new
 * version named "<name> (<agent name>)". Earlier versions keep their names, so
 * published agents and pinned drafts run what they ran before.
 *
 * Then the migration drops `skill.agentId`. A skill no longer goes with its agent:
 * deleting an agent keeps the skills of its project.
 */
export class MoveAgentSkillsToProjects1793116772027 implements IrreversibleMigration {
	async up(context: MigrationContext) {
		const { escape, runQuery, queryRunner, tablePrefix, schemaBuilder } = context;

		await this.renameClashingSkills(context);

		const skill = escape.tableName('skill');
		const agentId = escape.columnName('agentId');
		await runQuery(
			`UPDATE ${skill} SET
				${escape.columnName('projectId')} = (
					SELECT a.${escape.columnName('projectId')} FROM ${escape.tableName('agents')} a
					WHERE a.${escape.columnName('id')} = ${skill}.${agentId}
				),
				${agentId} = NULL
			WHERE ${agentId} IS NOT NULL`,
		);

		// TypeORM's SQLite rebuild keeps a CHECK that names a dropped column, so the CHECK
		// goes first. Dropping the column also drops its index and foreign key.
		await queryRunner.dropCheckConstraint(
			`${tablePrefix}skill`,
			`CHK_${tablePrefix}skill_single_target`,
		);
		await schemaBuilder.dropColumns('skill', ['agentId'], { recreatesOnSqlite: true });
	}

	/**
	 * Gives a new name to each agent skill whose name the target already holds. The oldest
	 * agent skill keeps a free name, and the names it takes count for the next ones.
	 */
	private async renameClashingSkills(context: MigrationContext) {
		const { escape, runInBatches, logger, migrationName } = context;
		const takenByTarget = new Map<string, Set<string>>();
		let renamed = 0;

		const s = (column: string) => `s.${escape.columnName(column)}`;
		const v = (column: string) => `v.${escape.columnName(column)}`;
		const as = (column: string) => escape.columnName(column);

		// This step writes no skill rows, so offset paging stays stable.
		await runInBatches<AgentSkillRow>(
			`SELECT ${s('id')} AS ${as('skillId')}, a.${escape.columnName('projectId')} AS ${as('projectId')},
				a.${escape.columnName('name')} AS ${as('agentName')}, ${v('id')} AS ${as('versionId')},
				${v('version')} AS ${as('version')}, ${v('name')} AS ${as('name')}
			${skillsWithLatestVersion(context)}
			JOIN ${escape.tableName('agents')} a ON a.${escape.columnName('id')} = ${s('agentId')}
			WHERE ${s('agentId')} IS NOT NULL
			ORDER BY ${s('createdAt')}, ${s('id')}`,
			async (rows) => {
				for (const row of rows) {
					const targetKey = row.projectId ?? '';
					let taken = takenByTarget.get(targetKey);
					if (!taken) {
						taken = await this.namesInTarget(context, row.projectId);
						takenByTarget.set(targetKey, taken);
					}
					const name = freeName(row.name, row.agentName, taken);
					taken.add(nameKey(name));
					if (name === row.name) continue;
					await this.insertRenamedVersion(context, row, name);
					renamed++;
				}
			},
			BATCH_SIZE,
		);

		logger.info(`[${migrationName}] Renamed agent skills whose name the project already had`, {
			renamed,
		});
	}

	/** Name keys of the latest versions of the project skills, or of the instance skills. */
	private async namesInTarget(
		context: MigrationContext,
		projectId: string | null,
	): Promise<Set<string>> {
		const { escape, runQuery } = context;
		const s = (column: string) => `s.${escape.columnName(column)}`;
		const target =
			projectId === null
				? `${s('projectId')} IS NULL AND ${s('agentId')} IS NULL`
				: `${s('projectId')} = :projectId`;
		const rows = await runQuery<Array<{ name: string }>>(
			`SELECT v.${escape.columnName('name')} AS ${escape.columnName('name')}
			${skillsWithLatestVersion(context)}
			WHERE ${target}`,
			projectId === null ? {} : { projectId },
		);
		return new Set(rows.map((row) => nameKey(row.name)));
	}

	/** Adds the next version of the skill: the latest content with the new name. */
	private async insertRenamedVersion(context: MigrationContext, row: AgentSkillRow, name: string) {
		const { escape, runQuery, parseJson } = context;
		const [version] = await runQuery<VersionContentRow[]>(
			`SELECT ${['description', 'instructions', 'frontmatter'].map((column) => escape.columnName(column)).join(', ')}
			FROM ${escape.tableName('skill_version')} WHERE ${escape.columnName('id')} = :versionId`,
			{ versionId: row.versionId },
		);
		const files = await runQuery<FileRow[]>(
			`SELECT ${escape.columnName('path')}, ${escape.columnName('content')}
			FROM ${escape.tableName('skill_file')} WHERE ${escape.columnName('skillVersionId')} = :versionId`,
			{ versionId: row.versionId },
		);
		const frontmatter =
			version.frontmatter === null ? null : parseJson<Record<string, unknown>>(version.frontmatter);
		const hash = contentHash({
			name,
			description: version.description,
			instructions: version.instructions,
			frontmatter,
			files,
		});

		const id = randomUUID();
		const columns = [
			'id',
			'skillId',
			'version',
			'name',
			'description',
			'instructions',
			'frontmatter',
			'contentHash',
			'createdById',
		].map((column) => escape.columnName(column));
		await runQuery(
			`INSERT INTO ${escape.tableName('skill_version')} (${columns.join(', ')})
			SELECT :id, ${columns[1]}, :version, :name, ${columns[4]}, ${columns[5]}, ${columns[6]}, :contentHash, NULL
			FROM ${escape.tableName('skill_version')} WHERE ${columns[0]} = :versionId`,
			{ id, version: row.version + 1, name, contentHash: hash, versionId: row.versionId },
		);

		const path = escape.columnName('path');
		const content = escape.columnName('content');
		const skillVersionId = escape.columnName('skillVersionId');
		await runQuery(
			`INSERT INTO ${escape.tableName('skill_file')} (${skillVersionId}, ${path}, ${content})
			SELECT :id, ${path}, ${content} FROM ${escape.tableName('skill_file')}
			WHERE ${skillVersionId} = :versionId`,
			{ id, versionId: row.versionId },
		);
	}
}

/** `FROM` skills `s`, joined to their latest version `v`. */
function skillsWithLatestVersion({ escape }: MigrationContext): string {
	const version = escape.columnName('version');
	const skillId = escape.columnName('skillId');
	const versions = escape.tableName('skill_version');
	return `FROM ${escape.tableName('skill')} s
		JOIN ${versions} v ON v.${skillId} = s.${escape.columnName('id')}
			AND v.${version} = (SELECT MAX(v2.${version}) FROM ${versions} v2 WHERE v2.${skillId} = s.${escape.columnName('id')})`;
}

/**
 * The rule for two skill names that are hard to tell apart: case, surrounding spaces, and
 * runs of spaces, hyphens and underscores do not count. The same as `skillNameKey`.
 */
function nameKey(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[\s_-]+/g, ' ')
		.trim();
}

/** The name, or "<name> (<agent name>)" with a number after it until it is free. */
function freeName(name: string, agentName: string, taken: Set<string>): string {
	if (!taken.has(nameKey(name))) return name;
	// A long agent name is cut, so the tail and its number always fit next to the name.
	const label = agentName.slice(0, AGENT_LABEL_MAX_LENGTH).trimEnd();
	for (let attempt = 1; ; attempt++) {
		const tail = attempt === 1 ? ` (${label})` : ` (${label}) ${attempt}`;
		const candidate = `${name.slice(0, NAME_MAX_LENGTH - tail.length).trimEnd()}${tail}`;
		if (!taken.has(nameKey(candidate))) return candidate;
	}
}

type SkillContent = {
	name: string;
	description: string;
	instructions: string;
	frontmatter: Record<string, unknown> | null;
	files: FileRow[];
};

/**
 * Identity of a version's content, name included. It must give the same value as
 * `skillContentHash` in the skills module, so the app finds these versions by hash.
 */
function contentHash(content: SkillContent): string {
	return createHash('sha256')
		.update(
			JSON.stringify({
				name: content.name,
				description: content.description,
				instructions: content.instructions,
				frontmatter: content.frontmatter ? sortKeys(content.frontmatter) : null,
				files: content.files
					.map((file) => [file.path, file.content])
					.sort(([left], [right]) => compareCodeUnits(left, right)),
			}),
		)
		.digest('hex');
}

function compareCodeUnits(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

/** Map keys in sorted order at every level. List order stays. */
function sortKeys(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortKeys);
	if (value === null || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value)
			.sort(([left], [right]) => compareCodeUnits(left, right))
			.map(([key, entry]) => [key, sortKeys(entry)]),
	);
}
