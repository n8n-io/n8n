import type { IconName } from '@n8n/design-system';
import { describeAgentToolRestriction } from '@n8n/frontend-module-type-availability-policies';

import type { AgentJsonToolRef } from '../types';
import type {
	ChipRestriction,
	GroupedToolRow,
	ToolOpenTarget,
	ToolRow,
	ToolRowItem,
	ToolRowNodeType,
} from './AgentCapabilitiesSection.types';

export const MIN_GROUPED_TOOLS_PER_TYPE = 2;

/** One translated sentence, so a locale owns its wording and order. */
export function chipRestrictionText(restriction: ChipRestriction): string {
	return (
		restriction.message ??
		describeAgentToolRestriction(restriction.typeLabel, { scope: restriction.scope })
	);
}

type BaseToolRow = {
	index: number;
	enabled: boolean;
	label: string;
	typeLabel: string;
	nodeType: ToolRowNodeType;
	fallbackIcon: IconName;
	toolType: AgentJsonToolRef['type'] | 'mcpServer';
	openTarget: ToolOpenTarget;
	invalid: boolean;
	invalidReasons: string[];
	warning: boolean;
	warningReasons: string[];
	restriction: ChipRestriction | null;
};

function toUngroupedToolRow(row: BaseToolRow): ToolRow {
	const item: ToolRowItem = {
		index: row.index,
		enabled: row.enabled,
		label: row.label,
		nodeType: row.nodeType,
		openTarget: row.openTarget,
		invalid: row.invalid,
		invalidReasons: row.invalidReasons,
		restriction: row.restriction,
	};

	return {
		index: row.index,
		enabled: row.enabled,
		label: row.label,
		typeLabel: row.typeLabel,
		nodeType: row.nodeType,
		fallbackIcon: row.fallbackIcon,
		invalid: row.invalid,
		invalidReasons: row.invalidReasons,
		warning: row.warning,
		warningReasons: row.warningReasons,
		restriction: row.restriction,
		isGrouped: false,
		tool: item,
	};
}

function toGroupedToolRow(group: BaseToolRow[]): GroupedToolRow {
	const [first] = group;

	return {
		index: first.index,
		enabled: group.some((row) => row.enabled),
		label: `${group.length} ${first.typeLabel}`,
		typeLabel: first.typeLabel,
		nodeType: first.nodeType,
		fallbackIcon: first.fallbackIcon,
		invalid: group.some((row) => row.invalid),
		invalidReasons: [...new Set(group.flatMap((row) => row.invalidReasons))],
		warning: group.some((row) => row.warning),
		warningReasons: [...new Set(group.flatMap((row) => row.warningReasons))],
		// Members are grouped by restricted state too, so the group speaks for all of them.
		restriction: first.restriction,
		isGrouped: true,
		tools: group.map((row) => ({
			index: row.index,
			enabled: row.enabled,
			label: row.label,
			nodeType: row.nodeType,
			openTarget: row.openTarget,
			invalid: row.invalid,
			invalidReasons: row.invalidReasons,
			restriction: row.restriction,
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

		/**
		 * Restricted state joins the key. A node type usually decides it for every tool of that
		 * type, but a tool that embeds an inline agent is restricted by what it holds, so two
		 * tools of one type can differ. Grouping them would dim a tool that is perfectly usable.
		 */
		const key = `${row.nodeType.name}|${row.restriction ? 'restricted' : 'allowed'}`;
		const group = nodeGroups.get(key);
		if (group) {
			group.push(row);
			continue;
		}

		nodeGroups.set(key, [row]);
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
