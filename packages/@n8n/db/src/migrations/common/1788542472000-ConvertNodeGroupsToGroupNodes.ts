import type { IConnections, INode, IWorkflowGroup } from 'n8n-workflow';
import {
	GROUP_NODE_TYPE,
	migrateGroupNodesToNodeGroups,
	migrateNodeGroupsToGroupNodes,
} from 'n8n-workflow';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

type StoredWorkflow = {
	id: string;
	nodes: string | INode[];
	connections: string | IConnections;
	nodeGroups: string | IWorkflowGroup[];
};

const TABLES = ['workflow_entity', 'workflow_history'] as const;

/**
 * Converts each `nodeGroups` entry into a group node.
 *
 * A canvas group used to be a render-only entry in the `nodeGroups` column. It
 * is now a node of type `n8n-nodes-base.group` that holds its members through
 * their `parentId`, so the execution engine can run it.
 *
 * For each group this writes a group node, sets `parentId` on its members, and
 * re-points every connection that crossed the group boundary from the member
 * onto the group's port.
 *
 * `nodeGroups` is left in place. The new path ignores it, and the old path still
 * reads it, so an instance that turns the feature off keeps working.
 *
 * `down` rebuilds `nodeGroups` from the group nodes. It drops the groups the old
 * format cannot express (empty, nested, or with several interior entries or
 * exits) and ungroups their members. The nodes and the connections always
 * survive.
 *
 * See `.agents/specs/group-as-first-class-node.md`.
 */
export class ConvertNodeGroupsToGroupNodes1788542472000 implements ReversibleMigration {
	async up({ escape, runQuery, runInBatches, parseJson, logger }: MigrationContext) {
		for (const table of TABLES) {
			const tableName = escape.tableName(table);
			const idColumn = escape.columnName(table === 'workflow_entity' ? 'id' : 'versionId');
			const groupsColumn = escape.columnName('nodeGroups');

			await runInBatches<StoredWorkflow>(
				`SELECT ${idColumn} AS id, nodes, connections, ${groupsColumn} FROM ${tableName}`,
				async (rows) => {
					for (const row of rows) {
						const nodeGroups = parseJson<IWorkflowGroup[]>(row.nodeGroups) ?? [];
						if (nodeGroups.length === 0) continue;

						const result = migrateNodeGroupsToGroupNodes({
							nodes: parseJson<INode[]>(row.nodes) ?? [],
							connections: parseJson<IConnections>(row.connections) ?? {},
							nodeGroups,
						});

						if (result.missingNodeIds.length > 0) {
							// The group is still created, as an empty group. Losing it
							// would lose the user's work.
							logger.warn(
								`Workflow ${row.id} has groups that name ${result.missingNodeIds.length} node(s) it does not hold; those groups are now empty`,
							);
						}

						await runQuery(
							`UPDATE ${tableName} SET nodes = :nodes, connections = :connections WHERE ${idColumn} = :id`,
							{
								nodes: JSON.stringify(result.nodes),
								connections: JSON.stringify(result.connections),
								id: row.id,
							},
						);
					}
				},
			);
		}
	}

	async down({ escape, runQuery, runInBatches, parseJson, logger }: MigrationContext) {
		for (const table of TABLES) {
			const tableName = escape.tableName(table);
			const idColumn = escape.columnName(table === 'workflow_entity' ? 'id' : 'versionId');
			const groupsColumn = escape.columnName('nodeGroups');

			await runInBatches<StoredWorkflow>(
				`SELECT ${idColumn} AS id, nodes, connections, ${groupsColumn} FROM ${tableName}`,
				async (rows) => {
					for (const row of rows) {
						const nodes = parseJson<INode[]>(row.nodes) ?? [];
						if (!nodes.some((node) => node.type === GROUP_NODE_TYPE)) continue;

						const result = migrateGroupNodesToNodeGroups({
							nodes,
							connections: parseJson<IConnections>(row.connections) ?? {},
						});

						if (result.droppedGroupIds.length > 0) {
							logger.warn(
								`Workflow ${row.id} has ${result.droppedGroupIds.length} group(s) the older format cannot hold; their nodes stay but lose their group`,
							);
						}

						await runQuery(
							`UPDATE ${tableName} SET nodes = :nodes, connections = :connections, ${groupsColumn} = :nodeGroups WHERE ${idColumn} = :id`,
							{
								nodes: JSON.stringify(result.nodes),
								connections: JSON.stringify(result.connections),
								nodeGroups: JSON.stringify(result.nodeGroups),
								id: row.id,
							},
						);
					}
				},
			);
		}
	}
}
