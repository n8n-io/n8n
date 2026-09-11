import type { InstanceAiApprovalDetails } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

/** Translate structured details at render time so saved approvals follow the current locale. */
export function formatApprovalDetails(details: InstanceAiApprovalDetails): string {
	const i18n = useI18n();
	const t = i18n.baseText.bind(i18n);
	const join = (items: string[]) => items.join(t('instanceAi.approval.listSeparator'));
	const preview = (
		row: Extract<InstanceAiApprovalDetails, { action: 'update-rows' }>['changes'],
	) => {
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
		return conditions.join(t(`instanceAi.approval.filter.${filter.type}`));
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
		case 'insert-rows': {
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
			return lines.join('\n\n');
		}
		case 'update-rows':
			return t(
				details.filter.filters.length
					? 'instanceAi.approval.updateRows'
					: 'instanceAi.approval.updateAllRows',
				{ interpolate: { changes: preview(details.changes), filter: filterText(details.filter) } },
			);
		case 'delete-rows':
			return t('instanceAi.approval.deleteRows', {
				interpolate: { filter: filterText(details.filter) },
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
	}
}
