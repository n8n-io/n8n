import type { SimplifiedNodeType } from '@/Interface';
import type { NodeTypeAvailabilityScope } from '@n8n/api-types';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import type { AgentJsonToolRef } from '../types';

export type ToolRowNodeType = SimplifiedNodeType | null;

/** Why a policy locks a chip, as its lock tooltip states it. */
export type ChipRestriction = {
	/** The level that denied the type; absent when the policy names none. */
	scope?: NodeTypeAvailabilityScope;
	/** The denied type's display name, which is not always the type the chip shows. */
	typeLabel: string;
	/** Set only when the entry itself is allowed and something it embeds is denied. */
	message?: string;
};

export type ToolPickerMode = 'tools' | 'workflows';

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
	enabled: boolean;
	label: string;
	nodeType: ToolRowNodeType;
	openTarget: ToolOpenTarget;
	invalid: boolean;
	invalidReasons: string[];
	/** Set when a policy locks the row. It outranks `invalid` and `warning`. */
	restriction: ChipRestriction | null;
};

type ToolRowBase = {
	index: number;
	enabled: boolean;
	label: string;
	typeLabel: string;
	nodeType: ToolRowNodeType;
	fallbackIcon: IconName;
	/** True for a single row when it has a configuration error; true for a grouped row when any of its tools do. */
	invalid: boolean;
	/** Human-readable reasons behind `invalid`; the union of member reasons for a grouped row. */
	invalidReasons: string[];
	/** True when the row blocks publishing but still works in preview (e.g. an unpublished workflow). */
	warning: boolean;
	warningReasons: string[];
	/** Set when a policy locks the row. It outranks `invalid` and `warning`. */
	restriction: ChipRestriction | null;
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
	{
		index: number;
		enabled: boolean;
		nodeType: ToolRowNodeType;
		openTarget: ToolOpenTarget;
		invalid: boolean;
		invalidReasons: string[];
		restriction: ChipRestriction | null;
	}
>;
