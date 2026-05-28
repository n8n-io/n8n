import { randomUUID } from 'node:crypto';

import type { ReversibleMigration, MigrationContext } from '../migration-types';

const table = {
	tools: 'chat_hub_tools',
	sessions: 'chat_hub_sessions',
	agents: 'chat_hub_agents',
	sessionTools: 'chat_hub_session_tools',
	agentTools: 'chat_hub_agent_tools',
	user: 'user',
} as const;

interface SessionRow {
	id: string;
	ownerId: string;
	tools: string;
}

interface AgentRow {
	id: string;
	ownerId: string;
	tools: string;
}

/** The actual tools in the JSON data contain full INode definitions. */
interface ToolDefinition extends Record<string, unknown> {
	id: string;
	name: string;
	type: string;
	typeVersion: number;
}

export class CreateChatHubToolsTable1770000000000 implements ReversibleMigration {
	async up({
		schemaBuilder: { createTable, column, dropColumns },
		escape,
		isPostgres,
		runQuery,
		runInBatches,
		parseJson,
		logger,
		migrationName,
	}: MigrationContext) {
		// Create the chat_hub_tools table with type and typeVersion columns
		await createTable(table.tools)
			.withColumns(
				column('id').uuid.primary,
				column('name').varchar(255).notNull,
				column('type').varchar(255).notNull,
				column('typeVersion').double.notNull,
				column('ownerId').uuid.notNull,
				column('definition').json.notNull,
				column('enabled').bool.notNull.default(true),
			)
			.withForeignKey('ownerId', {
				tableName: table.user,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['ownerId', 'name'], true).withTimestamps;

		// Create join tables
		await createTable(table.sessionTools)
			.withColumns(column('sessionId').uuid.notNull.primary, column('toolId').uuid.notNull.primary)
			.withForeignKey('sessionId', {
				tableName: table.sessions,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('toolId', {
				tableName: table.tools,
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		await createTable(table.agentTools)
			.withColumns(column('agentId').uuid.notNull.primary, column('toolId').uuid.notNull.primary)
			.withForeignKey('agentId', {
				tableName: table.agents,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('toolId', {
				tableName: table.tools,
				columnName: 'id',
				onDelete: 'CASCADE',
			});

		// Data migration: move tools from chat hub sessions and agents to the new chat_hub_tools table.
		// Before this migration tools were stored as full INode definitions in a JSON column on sessions and agents.
		// In practice we only supported three hardcoded tools, but each session held unique copies of them.
		// Now we want to normalize and move them to a new table. Do the normalization by building a
		// per-user tool name -> tool ID map across sessions and agents, and only insert the tool once per user.
		const toolsByUserAndName = new Map<string, string>(); // key: `${ownerId}::${name}` -> toolId

		const sessionsTable = escape.tableName(table.sessions);
		const agentsTable = escape.tableName(table.agents);
		const toolsTable = escape.tableName(table.tools);
		const sessionToolsTable = escape.tableName(table.sessionTools);
		const agentToolsTable = escape.tableName(table.agentTools);
		const toolsFilter = isPostgres ? '"tools"::text != \'[]\'' : '"tools" != \'[]\'';

		// Helper to ensure a tool exists in chat_hub_tools and return its ID
		async function ensureTool(ownerId: string, def: ToolDefinition): Promise<string> {
			const key = `${ownerId}::${def.name}`;
			const existing = toolsByUserAndName.get(key);
			if (existing) return existing;

			const toolId = randomUUID();
			await runQuery(
				`INSERT INTO ${toolsTable} ("id", "name", "type", "typeVersion", "ownerId", "definition", "enabled")
				 VALUES (:id, :name, :type, :typeVersion, :ownerId, :definition, :enabled)`,
				{
					id: toolId,
					name: def.name,
					type: def.type,
					typeVersion: def.typeVersion,
					ownerId,
					definition: JSON.stringify({ ...def, id: toolId }),
					enabled: true,
				},
			);

			toolsByUserAndName.set(key, toolId);
			return toolId;
		}

		// Light validation, discard data that doesn't look like a valid tool definition to avoid inserting junk.
		function isValidTool(tool: ToolDefinition): boolean {
			return Boolean(tool.id && tool.name && tool.type && typeof tool.typeVersion === 'number');
		}

		function safeParseTools(raw: string, entityId: string, entityType: string): ToolDefinition[] {
			try {
				const tools = parseJson<ToolDefinition[]>(raw);
				if (!Array.isArray(tools)) {
					logger.warn(
						`[${migrationName}] Tools column for ${entityType} ${entityId} is not an array. Skipping.`,
					);
					return [];
				}
				return tools;
			} catch (error) {
				logger.warn(
					`[${migrationName}] Failed to parse tools for ${entityType} ${entityId}: ${error instanceof Error ? error.message : 'Unknown error'}. Skipping.`,
				);
				return [];
			}
		}

		// Migrate chat hub sessions
		await runInBatches<SessionRow>(
			`SELECT "id", "ownerId", "tools" FROM ${sessionsTable} WHERE ${toolsFilter}`,
			async (sessions) => {
				for (const session of sessions) {
					const tools = safeParseTools(session.tools, session.id, 'session');
					const insertedToolIds = new Set<string>();

					for (const tool of tools) {
						if (!isValidTool(tool)) continue;

						const toolId = await ensureTool(session.ownerId, tool);
						if (insertedToolIds.has(toolId)) continue;
						insertedToolIds.add(toolId);

						await runQuery(
							`INSERT INTO ${sessionToolsTable} ("sessionId", "toolId") VALUES (:sessionId, :toolId)`,
							{ sessionId: session.id, toolId },
						);
					}
				}
			},
		);

		// Migrate chat hub agents
		await runInBatches<AgentRow>(
			`SELECT "id", "ownerId", "tools" FROM ${agentsTable} WHERE ${toolsFilter}`,
			async (agents) => {
				for (const agent of agents) {
					const tools = safeParseTools(agent.tools, agent.id, 'agent');
					const insertedToolIds = new Set<string>();

					for (const tool of tools) {
						if (!isValidTool(tool)) continue;

						const toolId = await ensureTool(agent.ownerId, tool);
						if (insertedToolIds.has(toolId)) continue;
						insertedToolIds.add(toolId);

						await runQuery(
							`INSERT INTO ${agentToolsTable} ("agentId", "toolId") VALUES (:agentId, :toolId)`,
							{ agentId: agent.id, toolId },
						);
					}
				}
			},
		);

		// Drop the tools columns from chat hub sessions and agents
		await dropColumns(table.sessions, ['tools']);
		await dropColumns(table.agents, ['tools']);
	}

	async down({ schemaBuilder: { addColumns, column, dropTable } }: MigrationContext) {
		await dropTable(table.sessionTools);
		await dropTable(table.agentTools);
		await dropTable(table.tools);

		// This loses data, but we can't really restore it.
		// Impact of losing the configured tools should be fairly minimal, as credentials remain intact
		// and users can easily re-add the search tools to chat hub sessions and agents after the rollback if needed.
		await addColumns(table.sessions, [column('tools').json.notNull.default("'[]'")]);
		await addColumns(table.agents, [column('tools').json.notNull.default("'[]'")]);
	}
}
