import type { SimplifiedNodeType } from '@/Interface';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon';
import type { AgentJsonToolRef } from '../types';

export type ToolRowNodeType = SimplifiedNodeType | null;

export type ToolOpenTarget =
	| {
			kind: 'tool';
			toolType: AgentJsonToolRef['type'];
			id: string;
	  }
	| {
			kind: 'mcpServer';
			serverName: string;
	  };

export type ToolRowItem = {
	index: number;
	label: string;
	nodeType: ToolRowNodeType;
	openTarget: ToolOpenTarget;
	invalid: boolean;
	invalidReasons: string[];
};

type ToolRowBase = {
	index: number;
	label: string;
	typeLabel: string;
	nodeType: ToolRowNodeType;
	fallbackIcon: IconName;
	/** True for a single row when it has a configuration error; true for a grouped row when any of its tools do. */
	invalid: boolean;
	/** Human-readable reasons behind `invalid`; the union of member reasons for a grouped row. */
	invalidReasons: string[];
};

export type GroupedToolRow = ToolRowBase & {
	isGrouped: true;
	tools: ToolRowItem[];
};

export type SingleToolRow = ToolRowBase & {
	isGrouped: false;
	tool: ToolRowItem;
};

export type ToolRow = GroupedToolRow | SingleToolRow;

export type ToolMenuItem = DropdownMenuItemProps<
	string,
	{ nodeType: ToolRowNodeType; openTarget: ToolOpenTarget }
>;
