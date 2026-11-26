import type { IConnection, NodeParametersCarryOver } from 'n8n-workflow';

export type InputPanel = {
	nodeName?: string;
	run?: number;
	branch?: number;
	data: {
		isEmpty: boolean;
	};
};

export type OutputPanel = {
	run?: number;
	branch?: number;
	data: {
		isEmpty: boolean;
	};
	editMode: {
		enabled: boolean;
		value: string;
	};
};

export type NodePanelType = 'input' | 'output';

export type MainPanelType = 'regular' | 'dragless' | 'inputless' | 'unknown' | 'wide';

export type MainPanelDimensions = Record<
	MainPanelType,
	{
		relativeLeft: number;
		relativeRight: number;
		relativeWidth: number;
	}
>;

/** What a node version update set aside or changed, kept to show in the node settings. */
export type NodeVersionChange = Omit<NodeParametersCarryOver, 'parameters' | 'issues'> & {
	fromVersion: number;
	/** The `[source, target]` pairs that the update removed. */
	removedConnections: Array<[IConnection, IConnection]>;
};
