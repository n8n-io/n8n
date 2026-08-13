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
