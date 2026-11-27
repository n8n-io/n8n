import {
	DATA_TABLE_TOOL_NAME_BY_ACTION,
	getDataTableCallAction,
	getExecutionCallAction,
	getWorkspaceCallAction,
	resolveBuilderToolName,
	type DataTableWriteToolAction,
	type InstanceAiApprovalDetails,
	type InstanceAiDataTableChangeDetails,
} from '@n8n/api-types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { useToolLabel } from './toolLabels';

/** Translate structured details at render time so saved approvals follow the current locale. */
export function formatApprovalDetails(details: InstanceAiApprovalDetails): string {
	const i18n = useI18n();
	const t = i18n.baseText.bind(i18n);
	const join = (items: string[]) => items.join(t('instanceAi.approval.listSeparator'));
	const preview = (row: RowPreview) => {
		const values = row.values.map(({ column, value }) =>
			t(value === null ? 'instanceAi.approval.emptyValue' : 'instanceAi.approval.value', {
				interpolate: { column, value: value ?? '' },
			}),
		);
		if (row.remainingColumns)
			values.push(
				t('instanceAi.approval.moreColumns', {
					adjustToNumber: row.remainingColumns,
					interpolate: { count: row.remainingColumns },
				}),
			);
		return join(values);
	};
	const filterText = (
		filter: Extract<InstanceAiApprovalDetails, { action: 'delete-rows' }>['filter'],
	) => {
		const conditions = filter.filters.map(({ columnName: column, condition, value }) => {
			if (value === null && (condition === 'eq' || condition === 'neq')) {
				return t(
					condition === 'eq'
						? 'instanceAi.approval.filter.empty'
						: 'instanceAi.approval.filter.notEmpty',
					{ interpolate: { column } },
				);
			}
			if (
				(condition === 'like' || condition === 'ilike') &&
				typeof value === 'string' &&
				!value.includes('%')
			) {
				return t(
					condition === 'like'
						? 'instanceAi.approval.filter.contains'
						: 'instanceAi.approval.filter.containsInsensitive',
					{ interpolate: { column, value: JSON.stringify(value) } },
				);
			}
			return t(`instanceAi.approval.filter.${condition}`, {
				interpolate: { column, value: JSON.stringify(value) },
			});
		});
		return conditions.length > 1
			? conditions.map((condition) => `• ${condition}`).join('\n')
			: (conditions[0] ?? '');
	};
	const nodeList = (names: string[]) => {
		const visible = names.slice(0, 8);
		if (names.length > 8)
			visible.push(
				t('instanceAi.approval.moreNodes', {
					adjustToNumber: names.length - 8,
					interpolate: { count: names.length - 8 },
				}),
			);
		return join(visible);
	};

	switch (details.action) {
		case 'edit-workflow':
			return details.summary?.replace(/\s+/g, ' ').trim() || t('instanceAi.approval.editWorkflow');
		case 'delete-table':
			return t('instanceAi.approval.deleteTable');
		case 'add-column':
			return t('instanceAi.approval.addColumn', {
				interpolate: {
					column: details.column,
					type: t(`instanceAi.approval.columnType.${details.columnType}`),
				},
			});
		case 'delete-column':
			return t('instanceAi.approval.deleteColumn', { interpolate: { column: details.column } });
		case 'rename-column':
			return t('instanceAi.approval.renameColumn', {
				interpolate: { column: details.column, name: details.newName },
			});
		case 'insert-rows':
			return insertRowsLines(details, t, preview).join('\n\n');
		case 'update-rows':
			return t(
				details.filter.filters.length > 1
					? `instanceAi.approval.updateRows.${details.filter.type}`
					: details.filter.filters.length === 1
						? 'instanceAi.approval.updateRows'
						: 'instanceAi.approval.updateAllRows',
				{ interpolate: { changes: preview(details.changes), filter: filterText(details.filter) } },
			);
		case 'delete-rows':
			return t(
				details.filter.filters.length > 1
					? `instanceAi.approval.deleteRows.${details.filter.type}`
					: 'instanceAi.approval.deleteRows',
				{
					interpolate: { filter: filterText(details.filter) },
				},
			);
		case 'archive-agent':
			return t('instanceAi.approval.archiveAgent', {
				interpolate: { name: details.name, id: details.id },
			});
		case 'archive-workflow':
			return t('instanceAi.approval.archiveWorkflow', {
				interpolate: { name: details.name, id: details.id },
			});
		case 'restore-workflow':
			return t('instanceAi.approval.restoreWorkflow', {
				interpolate: { name: details.name, id: details.id },
			});
		case 'unpublish-workflow':
			return t('instanceAi.approval.unpublishWorkflow', {
				interpolate: { name: details.name, id: details.id },
			});
		case 'restore-version': {
			const date = details.createdAt ? new Date(details.createdAt) : undefined;
			const timestamp =
				date && !Number.isNaN(date.getTime())
					? new Intl.DateTimeFormat(i18n.locale, {
							dateStyle: 'medium',
							timeStyle: 'medium',
						}).format(date)
					: t('instanceAi.approval.unknownDate');
			return t('instanceAi.approval.restoreVersion', {
				interpolate: { version: details.version, timestamp },
			});
		}
		case 'update-version': {
			const fields: string[] = [];
			for (const field of ['name', 'description'] satisfies Array<'name' | 'description'>) {
				const value = details[field];
				if (value !== undefined)
					fields.push(
						t(
							value === null
								? `instanceAi.approval.version.${field}.empty`
								: `instanceAi.approval.version.${field}`,
							{ interpolate: { value: value === null ? '' : JSON.stringify(value) } },
						),
					);
			}
			return t('instanceAi.approval.updateVersion', {
				interpolate: {
					version: details.version,
					changes: fields.length ? join(fields) : t('instanceAi.approval.version.metadata'),
				},
			});
		}
		case 'run-workflow':
			return (
				details.summary?.replace(/\s+/g, ' ').trim() ||
				t(
					details.trigger
						? 'instanceAi.approval.runFromTrigger'
						: 'instanceAi.approval.runWorkflow',
					{ interpolate: { trigger: details.trigger ?? '' } },
				)
			);
		case 'publish-workflow': {
			const lines = [
				details.summary?.replace(/\s+/g, ' ').trim() ||
					t(
						details.selectedVersion
							? 'instanceAi.approval.publishVersion'
							: 'instanceAi.approval.publishDraft',
					),
			];
			if (details.supportingCount)
				lines.push(
					t('instanceAi.approval.supportingWorkflows', {
						adjustToNumber: details.supportingCount,
						interpolate: { count: details.supportingCount },
					}),
				);
			const verification = details.verification;
			if (verification) {
				lines.push(
					t(`instanceAi.approval.verification.${verification.level}`, {
						interpolate: { nodes: nodeList(verification.unprovenTargets) },
					}),
				);
				if (verification.cause)
					lines.push(
						t('instanceAi.approval.verification.cause', {
							interpolate: { cause: verification.cause },
						}),
					);
				if (verification.pendingTriggers.length)
					lines.push(
						t('instanceAi.approval.verification.pendingTriggers', {
							interpolate: { nodes: nodeList(verification.pendingTriggers) },
						}),
					);
				if (verification.nodesNotReached.length)
					lines.push(
						t('instanceAi.approval.verification.notReached', {
							adjustToNumber: verification.nodesNotReached.length,
							interpolate: {
								count: verification.nodesNotReached.length,
								total: verification.plannedNodeCount,
								nodes: nodeList(verification.nodesNotReached),
							},
						}),
					);
				if (verification.simulatedNodes.length)
					lines.push(
						t('instanceAi.approval.verification.simulated', {
							interpolate: { nodes: nodeList(verification.simulatedNodes) },
						}),
					);
				if (verification.pinnedNodes.length)
					lines.push(
						t('instanceAi.approval.verification.pinned', {
							interpolate: { nodes: nodeList(verification.pinnedNodes) },
						}),
					);
			}
			return lines.join('\n\n');
		}
		case 'data-table-changes':
			return formatDataTableChanges(details.changes, t, preview);
		case 'publish-agent':
			return formatPublishAgent(details, t);
	}
}

type PublishAgentDetails = Extract<InstanceAiApprovalDetails, { action: 'publish-agent' }>;

/**
 * The go live confirmation: what goes live, then what might get sent for real.
 */
function formatPublishAgent(details: PublishAgentDetails, t: Translate): string {
	const lines = [
		...(details.changedSinceAsked ? [t('instanceAi.approval.publishAgent.changedSinceAsked')] : []),
		t(
			details.selectedVersion
				? 'instanceAi.approval.publishAgent.version'
				: 'instanceAi.approval.publishAgent.draft',
		),
	];
	if (details.liveAvailability === 'changed')
		lines.push(t('instanceAi.approval.publishAgent.replacesLive'));

	if (details.sendTargets.length === 0) {
		lines.push(t('agents.testRun.mode.confirm.noList'));
		return lines.join('\n\n');
	}
	const targets = details.sendTargets.map((target) => {
		switch (target.kind) {
			case 'channel':
				return t('instanceAi.approval.publishAgent.target.channel', {
					interpolate: { name: target.name },
				});
			case 'task':
				return t('instanceAi.approval.publishAgent.target.task', {
					interpolate: { name: target.name },
				});
			case 'mcp-server':
				return t('instanceAi.approval.publishAgent.target.mcpServer', {
					interpolate: { name: target.name },
				});
			case 'tools':
				return t('instanceAi.approval.publishAgent.target.tools', {
					adjustToNumber: target.count,
					interpolate: { count: target.count },
				});
		}
	});
	if (details.moreSendTargets) {
		// The overflow counts channels, tasks and servers, so it goes before the tool count.
		const toolsLast = details.sendTargets.at(-1)?.kind === 'tools';
		targets.splice(
			toolsLast ? targets.length - 1 : targets.length,
			0,
			t('instanceAi.approval.publishAgent.target.more', {
				interpolate: { count: details.moreSendTargets },
			}),
		);
	}
	lines.push(
		[
			t('agents.testRun.mode.confirm.listLabel'),
			...targets.map((target) =>
				t('instanceAi.approval.publishAgent.listItem', { interpolate: { item: target } }),
			),
		].join('\n'),
	);
	return lines.join('\n\n');
}

type Translate = ReturnType<typeof useI18n>['baseText'];
type RowPreview = Extract<InstanceAiApprovalDetails, { action: 'update-rows' }>['changes'];
type DataTableChanges = Extract<
	InstanceAiApprovalDetails,
	{ action: 'data-table-changes' }
>['changes'];
type CreateTableColumns = Extract<
	InstanceAiDataTableChangeDetails,
	{ action: 'create-table' }
>['columns'];

function createTableText(columns: CreateTableColumns, t: Translate): string {
	if (columns.length === 0) return t('instanceAi.approval.createTable.noColumns');
	const columnList = columns
		.map(({ name, columnType }) =>
			t('instanceAi.approval.columnWithType', {
				interpolate: { column: name, type: t(`instanceAi.approval.columnType.${columnType}`) },
			}),
		)
		.join(t('instanceAi.approval.listSeparator'));
	return t('instanceAi.approval.createTable', { interpolate: { columns: columnList } });
}

function insertRowsLines(
	details: Extract<InstanceAiApprovalDetails, { action: 'insert-rows' }>,
	t: Translate,
	preview: (row: RowPreview) => string,
): string[] {
	const lines = [
		t('instanceAi.approval.addRows', {
			adjustToNumber: details.count,
			interpolate: { count: details.count },
		}),
	];
	details.rows.forEach((row, index) => {
		const changes = preview(row);
		lines.push(
			t(changes ? 'instanceAi.approval.row' : 'instanceAi.approval.emptyRow', {
				interpolate: { index: index + 1, changes },
			}),
		);
	});
	const remaining = details.count - details.rows.length;
	if (remaining > 0)
		lines.push(
			t('instanceAi.approval.moreRows', {
				adjustToNumber: remaining,
				interpolate: { count: remaining },
			}),
		);
	return lines;
}

/** One batch change can take several lines: row previews get a line each. */
function changeLines(
	change: InstanceAiDataTableChangeDetails,
	t: Translate,
	preview: (row: RowPreview) => string,
): string[] {
	if (change.action === 'create-table') return [createTableText(change.columns, t)];
	if (change.action === 'insert-rows') return insertRowsLines(change, t, preview);
	return [formatApprovalDetails(change)];
}

/** Changes grouped by table, in the order the batch first names each table. */
function groupByTable(
	changes: DataTableChanges,
): Array<{ name: string; changes: DataTableChanges }> {
	const groups = new Map<string, { name: string; changes: DataTableChanges }>();
	for (const change of changes) {
		const group = groups.get(change.tableKey) ?? { name: change.tableName, changes: [] };
		group.changes.push(change);
		groups.set(change.tableKey, group);
	}
	return [...groups.values()];
}

/**
 * One line for each change. With several tables, each table gets a block with
 * a header. With one table, the card title already names it.
 */
function formatDataTableChanges(
	changes: DataTableChanges,
	t: Translate,
	preview: (row: RowPreview) => string,
): string {
	const blocks = groupByTable(changes).map(({ name, changes: tableChanges }) => ({
		name,
		lines: tableChanges.flatMap(({ details }) => changeLines(details, t, preview)),
	}));
	if (blocks.length === 1) return blocks[0].lines.join('\n');
	return blocks
		.map(({ name, lines }) =>
			[t('instanceAi.approval.tableHeader', { interpolate: { name } }), ...lines].join('\n'),
		)
		.join('\n\n');
}

/** The former single-action tool of each change on a batch card, which owns its title phrase. */
const TOOL_ACTION_BY_CHANGE = {
	'create-table': 'create',
	'delete-table': 'delete',
	'add-column': 'add-column',
	'delete-column': 'delete-column',
	'rename-column': 'rename-column',
	'insert-rows': 'insert-rows',
	'update-rows': 'update-rows',
	'delete-rows': 'delete-rows',
} as const satisfies Record<
	DataTableChanges[number]['details']['action'],
	DataTableWriteToolAction
>;

/**
 * Title of a batch card. One change keeps the verb of that change, so a delete
 * does not read as a "change". Otherwise the title names the table, or counts
 * the tables.
 */
function formatDataTableChangesTitle(changes: DataTableChanges): string {
	const i18n = useI18n();
	if (changes.length === 1) {
		const [{ tableName, details }] = changes;
		return formatApprovalTitle({
			toolName: DATA_TABLE_TOOL_NAME_BY_ACTION[TOOL_ACTION_BY_CHANGE[details.action]],
			resourceName: tableName,
		});
	}
	const tables = groupByTable(changes);
	if (tables.length === 1) {
		return i18n.baseText('instanceAi.confirmation.resourcePrompt', {
			interpolate: {
				action: i18n.baseText('instanceAi.tools.change_data_tables.imperativeWithResource'),
				name: tables[0].name,
			},
		});
	}
	return i18n.baseText('instanceAi.confirmation.allowPrompt', {
		interpolate: {
			action: i18n.baseText('instanceAi.tools.change_data_tables.imperativeWithCount', {
				adjustToNumber: tables.length,
				interpolate: { count: tables.length },
			}),
		},
	});
}

/**
 * Short imperative phrases for approval titles, keyed by
 * `instanceAi.tools.{tool}.{action}`. The frontend owns the phrase, so it stays
 * translatable.
 */
const approvalTitleKeys = new Map<string, BaseTextKey>(
	(
		[
			'instanceAi.tools.archive_agent.imperative',
			'instanceAi.tools.archive_agent.imperativeWithResource',
			'instanceAi.tools.archive_workflow.imperative',
			'instanceAi.tools.archive_workflow.imperativeWithResource',
			'instanceAi.tools.unarchive_workflow.imperative',
			'instanceAi.tools.unarchive_workflow.imperativeWithResource',
			'instanceAi.tools.publish_workflow.imperative',
			'instanceAi.tools.publish_workflow.imperativeWithResource',
			'instanceAi.tools.unpublish_workflow.imperative',
			'instanceAi.tools.unpublish_workflow.imperativeWithResource',
			'instanceAi.tools.update_workflow_version.imperative',
			'instanceAi.tools.update_workflow_version.imperativeWithResource',
			'instanceAi.tools.restore_workflow_version.imperative',
			'instanceAi.tools.restore_workflow_version.imperativeWithResource',
			'instanceAi.tools.workflow_builder_nodes.execute.imperativeWithResource',
			'instanceAi.tools.execute_node.imperative',
			'instanceAi.tools.execute_node.imperativeWithResource',
			'instanceAi.tools.workflow_builder_executions.run.imperative',
			'instanceAi.tools.workflow_builder_executions.run.imperativeWithResource',
			'instanceAi.tools.delete_credential.imperative',
			'instanceAi.tools.data_tables.create.imperative',
			'instanceAi.tools.data_tables.create.imperativeWithResource',
			'instanceAi.tools.data_tables.delete.imperative',
			'instanceAi.tools.data_tables.delete.imperativeWithResource',
			'instanceAi.tools.data_tables.add-column.imperative',
			'instanceAi.tools.data_tables.add-column.imperativeWithResource',
			'instanceAi.tools.data_tables.delete-column.imperative',
			'instanceAi.tools.data_tables.delete-column.imperativeWithResource',
			'instanceAi.tools.data_tables.rename-column.imperative',
			'instanceAi.tools.data_tables.rename-column.imperativeWithResource',
			'instanceAi.tools.data_tables.insert-rows.imperative',
			'instanceAi.tools.data_tables.insert-rows.imperativeWithResource',
			'instanceAi.tools.data_tables.update-rows.imperative',
			'instanceAi.tools.data_tables.update-rows.imperativeWithResource',
			'instanceAi.tools.data_tables.delete-rows.imperative',
			'instanceAi.tools.data_tables.delete-rows.imperativeWithResource',
			'instanceAi.tools.change_data_tables.imperative',
			'instanceAi.tools.change_data_tables.imperativeWithResource',
			'instanceAi.tools.skills.create.imperative',
			'instanceAi.tools.skills.create.imperativeWithResource',
			'instanceAi.tools.skills.update.imperative',
			'instanceAi.tools.skills.update.imperativeWithResource',
			'instanceAi.tools.skills.delete.imperative',
			'instanceAi.tools.skills.delete.imperativeWithResource',
			'instanceAi.tools.skills.import-from-source.imperative',
			'instanceAi.tools.skills.import-from-source.imperativeWithResource',
			'instanceAi.tools.custom-mcp-servers.create.imperative',
			'instanceAi.tools.custom-mcp-servers.create.imperativeWithResource',
			'instanceAi.tools.custom-mcp-servers.update.imperative',
			'instanceAi.tools.custom-mcp-servers.update.imperativeWithResource',
			'instanceAi.tools.custom-mcp-servers.delete.imperative',
			'instanceAi.tools.custom-mcp-servers.delete.imperativeWithResource',
			'instanceAi.tools.custom-mcp-servers.add-tools.imperative',
			'instanceAi.tools.custom-mcp-servers.add-tools.imperativeWithResource',
			'instanceAi.tools.custom-mcp-servers.update-tool.imperative',
			'instanceAi.tools.custom-mcp-servers.update-tool.imperativeWithResource',
			'instanceAi.tools.custom-mcp-servers.generate.imperative',
			'instanceAi.tools.custom-mcp-servers.generate.imperativeWithResource',
			'instanceAi.tools.custom-mcp-servers.remove-tool.imperative',
			'instanceAi.tools.custom-mcp-servers.remove-tool.imperativeWithResource',
			'instanceAi.tools.workspace.tag-workflow.imperative',
			'instanceAi.tools.workspace.cleanup-test-executions.imperative',
			'instanceAi.tools.workspace.create-folder.imperative',
			'instanceAi.tools.workspace.delete-folder.imperative',
			'instanceAi.tools.workspace.move-workflow-to-folder.imperative',
			'instanceAi.tools.workflow_builder_build_workflow.imperative',
			'instanceAi.tools.workflow_builder_build_workflow.imperativeWithResource',
			'instanceAi.tools.build-workflow-with-agent.imperative',
		] satisfies BaseTextKey[]
	).map((key) => [key, key]),
);

/**
 * Title of a plain approval: a short imperative phrase from i18n, keyed by the
 * tool name and its optional action, in "Allow n8n Assistant to {action}?".
 * When the tool names the resource it acts on, the title carries that name and
 * the phrase comes from the `.imperativeWithResource` key, which is written to
 * precede a name. A tool without a phrase gets its display label. A batch of
 * data table changes takes its title from the tables in its details.
 */
export function formatApprovalTitle(params: {
	toolName: string;
	args?: Record<string, unknown>;
	resourceName?: string;
	approvalDetails?: InstanceAiApprovalDetails;
}): string {
	const i18n = useI18n();
	const { args, resourceName, approvalDetails } = params;
	if (approvalDetails?.action === 'data-table-changes') {
		return formatDataTableChangesTitle(approvalDetails.changes);
	}
	if (approvalDetails?.action === 'publish-agent') {
		return i18n.baseText(
			`instanceAi.approval.publishAgent.title.${approvalDetails.liveAvailability}`,
			{
				interpolate: {
					name: resourceName ?? i18n.baseText('instanceAi.approval.publishAgent.unnamed'),
				},
			},
		);
	}
	const toolName = resolveBuilderToolName(params.toolName, args?.action);
	// A former multi-action tool resolves to a single-action tool, which takes no action suffix.
	const actionSelectsTool = toolName !== resolveBuilderToolName(params.toolName);
	const action = typeof args?.action === 'string' && !actionSelectsTool ? args.action : undefined;
	// Data table tools share the phrases of the former multi-action tool, keyed by action.
	const dataTableAction = getDataTableCallAction(toolName);
	// Execution tools do the same with the former executions tool.
	const executionAction = getExecutionCallAction(toolName);
	// Workspace tools do the same with the former workspace tool.
	const workspaceAction = getWorkspaceCallAction(toolName);
	const keyBase = dataTableAction
		? `instanceAi.tools.data_tables.${dataTableAction}`
		: executionAction
			? `instanceAi.tools.workflow_builder_executions.${executionAction}`
			: workspaceAction
				? `instanceAi.tools.workspace.${workspaceAction}`
				: action
					? `instanceAi.tools.${toolName}.${action}`
					: `instanceAi.tools.${toolName}`;
	if (resourceName) {
		const namedKey = approvalTitleKeys.get(`${keyBase}.imperativeWithResource`);
		if (namedKey) {
			return i18n.baseText('instanceAi.confirmation.resourcePrompt', {
				interpolate: { action: i18n.baseText(namedKey), name: resourceName },
			});
		}
	}
	const imperativeKey = approvalTitleKeys.get(`${keyBase}.imperative`);
	if (imperativeKey) {
		return i18n.baseText('instanceAi.confirmation.allowPrompt', {
			interpolate: { action: i18n.baseText(imperativeKey) },
		});
	}
	return useToolLabel().getToolLabel(toolName, args);
}
