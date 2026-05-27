import type { IconName } from '@n8n/design-system/components/N8nIcon';

import type { AgentJsonToolRef } from '../types';
import type {
	GroupedToolRow,
	ToolOpenTarget,
	ToolRow,
	ToolRowItem,
	ToolRowNodeType,
} from './AgentCapabilitiesSection.types';

export const MIN_GROUPED_TOOLS_PER_TYPE = 2;

type BaseToolRow = {
	index: number;
	label: string;
	typeLabel: string;
	nodeType: ToolRowNodeType;
	fallbackIcon: IconName;
	toolType: AgentJsonToolRef['type'] | 'mcpServer';
	openTarget: ToolOpenTarget;
};

function toUngroupedToolRow(row: BaseToolRow): ToolRow {
	const item: ToolRowItem = {
		index: row.index,
		label: row.label,
		nodeType: row.nodeType,
		openTarget: row.openTarget,
	};

	return {
		index: row.index,
		label: row.label,
		typeLabel: row.typeLabel,
		nodeType: row.nodeType,
		fallbackIcon: row.fallbackIcon,
		isGrouped: false,
		tool: item,
	};
}

function toGroupedToolRow(group: BaseToolRow[]): GroupedToolRow {
	const [first] = group;

	return {
		index: first.index,
		label: `${group.length} ${first.typeLabel}`,
		typeLabel: first.typeLabel,
		nodeType: first.nodeType,
		fallbackIcon: first.fallbackIcon,
		isGrouped: true,
		tools: group.map((row) => ({
			index: row.index,
			label: row.label,
			nodeType: row.nodeType,
			openTarget: row.openTarget,
		})),
	};
}

export function buildToolRows(rows: BaseToolRow[]): ToolRow[] {
	const groupedRows: ToolRow[] = [];
	const nodeGroups = new Map<string, BaseToolRow[]>();

	for (const row of rows) {
		/**
		 * Only node tools with a resolved node type are eligible for grouping.
		 * Workflow tools, custom tools, and unresolved node tools stay ungrouped
		 * because this grouping logic relies on nodeType.name as the canonical key
		 * and on the resolved node type for the grouped label/icon.
		 */
		if (row.toolType !== 'node' || !row.nodeType) {
			groupedRows.push(toUngroupedToolRow(row));
			continue;
		}

		const group = nodeGroups.get(row.nodeType.name);
		if (group) {
			group.push(row);
			continue;
		}

		nodeGroups.set(row.nodeType.name, [row]);
	}

	for (const group of nodeGroups.values()) {
		if (group.length >= MIN_GROUPED_TOOLS_PER_TYPE) {
			groupedRows.push(toGroupedToolRow(group));
			continue;
		}

		groupedRows.push(...group.map(toUngroupedToolRow));
	}

	return groupedRows.sort((left, right) => left.index - right.index);
}
