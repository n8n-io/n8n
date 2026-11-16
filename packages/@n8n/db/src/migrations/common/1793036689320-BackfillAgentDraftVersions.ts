import { isRecord } from '@n8n/utils/is-record';
import { v7 as uuid } from 'uuid';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

type Draft = { versionId: string | null; schema: unknown; integrations: unknown };
type SkillPin = { skillId: string; skillVersionId: string | null };

/** Capture drafts after skills and legacy publications have been migrated. */
export class BackfillAgentDraftVersions1793036689320 implements IrreversibleMigration {
	async up(ctx: MigrationContext) {
		const { escape, runInBatches } = ctx;
		// Scan a stable set: inserting history must not change the pagination.
		await runInBatches<{ id: string }>(
			`SELECT ${escape.columnName('id')} FROM ${escape.tableName('agents')}
			 WHERE ${escape.columnName('scope')} = 'project' ORDER BY ${escape.columnName('id')}`,
			async (agents) => {
				for (const { id } of agents) await this.captureDraft(ctx, id);
			},
		);
	}

	private async captureDraft(ctx: MigrationContext, agentId: string) {
		const { escape, runQuery, parseJson, logger, migrationName } = ctx;
		const c = escape.columnName;
		const [draft] = await runQuery<Draft[]>(
			`SELECT agent.${c('versionId')}, agent.${c('schema')}, agent.${c('integrations')}
			 FROM ${escape.tableName('agents')} agent
			 LEFT JOIN ${escape.tableName('agent_history')} history
			 ON history.${c('versionId')} = agent.${c('versionId')}
			 WHERE agent.${c('id')} = :agentId AND history.${c('versionId')} IS NULL`,
			{ agentId },
		);
		if (!draft) return;

		// Parse before writing so malformed legacy JSON leaves the draft unchanged.
		let schema: Record<string, unknown> | null;
		try {
			const config = parseJson<unknown>(draft.schema);
			if (config !== null && !isRecord(config)) throw new Error('Invalid configuration');
			schema = config;
			if (schema) {
				const integrations = parseJson<unknown>(draft.integrations);
				if (!Array.isArray(integrations)) throw new Error('Invalid integrations');
				schema.integrations = integrations.filter(
					(integration) => isRecord(integration) && integration.type === 'n8n_chat',
				);
				delete schema.skills;
			}
		} catch {
			logger.warn(
				`[${migrationName}] Skipped draft ${agentId}: invalid configuration or integrations`,
			);
			return;
		}

		const pins = schema ? await this.readSkillPins(ctx, agentId) : [];
		if (pins.some((pin) => !pin.skillVersionId)) {
			logger.warn(`[${migrationName}] Skipped draft ${agentId}: a skill has no saved version`);
			return;
		}

		// Keep the original save time and do not assign a publisher to a draft.
		const versionId = draft.versionId ?? uuid();
		const columns = ['versionId', 'agentId', 'schema', 'tools', 'author', 'createdAt', 'updatedAt'];
		await runQuery(
			`INSERT INTO ${escape.tableName('agent_history')} (${columns.map(c).join(', ')})
			 SELECT :versionId, ${c('id')}, :schema, ${c('tools')}, 'Unknown', ${c('updatedAt')}, ${c('updatedAt')}
			 FROM ${escape.tableName('agents')} WHERE ${c('id')} = :agentId`,
			{ agentId, versionId, schema: schema ? JSON.stringify(schema) : null },
		);
		if (draft.versionId === null) {
			await runQuery(
				`UPDATE ${escape.tableName('agents')} SET ${c('versionId')} = :versionId WHERE ${c('id')} = :agentId`,
				{ agentId, versionId },
			);
		}

		// Preserve attach order and each draft's explicit or latest skill version.
		for (const pin of pins) {
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_version_skill_dependency')}
				 (${['agentVersionId', 'skillId', 'skillVersionId', 'createdAt'].map(c).join(', ')})
				 SELECT :versionId, ${c('skillId')}, :skillVersionId, ${c('createdAt')}
				 FROM ${escape.tableName('agent_skill_dependency')}
				 WHERE ${c('agentId')} = :agentId AND ${c('skillId')} = :skillId`,
				{ agentId, versionId, ...pin },
			);
		}
		await this.captureTasks(ctx, agentId, versionId, schema);
	}

	private async readSkillPins({ escape, runQuery }: MigrationContext, agentId: string) {
		const c = escape.columnName;
		const versions = escape.tableName('skill_version');
		return await runQuery<SkillPin[]>(
			`SELECT dependency.${c('skillId')}, COALESCE(pinned.${c('id')}, (
				SELECT latest.${c('id')} FROM ${versions} latest
				WHERE latest.${c('skillId')} = dependency.${c('skillId')}
				ORDER BY latest.${c('version')} DESC LIMIT 1
			 )) AS ${c('skillVersionId')}
			 FROM ${escape.tableName('agent_skill_dependency')} dependency
			 LEFT JOIN ${versions} pinned ON pinned.${c('id')} = dependency.${c('skillVersionId')}
			 AND pinned.${c('skillId')} = dependency.${c('skillId')}
			 WHERE dependency.${c('agentId')} = :agentId ORDER BY dependency.${c('createdAt')}`,
			{ agentId },
		);
	}

	private async captureTasks(
		{ escape, runQuery }: MigrationContext,
		agentId: string,
		versionId: string,
		schema: Record<string, unknown> | null,
	) {
		const c = escape.columnName;
		const enabledTaskIds = Array.isArray(schema?.tasks)
			? schema.tasks.flatMap((task) =>
					isRecord(task) && typeof task.id === 'string' && task.enabled === true ? [task.id] : [],
				)
			: [];
		const enabled = enabledTaskIds.length
			? `CASE WHEN ${c('id')} IN (:...enabledTaskIds) THEN true ELSE false END`
			: 'false';
		const body = ['name', 'objective', 'cronExpression', 'timezone'].map(c).join(', ');
		await runQuery(
			`INSERT INTO ${escape.tableName('agent_task_snapshot')}
			 (${c('versionId')}, ${c('taskId')}, ${c('enabled')}, ${body})
			 SELECT :versionId, ${c('id')}, ${enabled}, ${body}
			 FROM ${escape.tableName('agent_task_definition')} WHERE ${c('agentId')} = :agentId`,
			{ agentId, versionId, enabledTaskIds },
		);
	}
}
