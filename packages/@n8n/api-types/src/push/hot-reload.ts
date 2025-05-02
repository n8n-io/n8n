export type NodeTypeData = {
	name: string;
	version: number;
};

export type ReloadNodeType = {
	type: 'reloadNodeType';
	data: NodeTypeData;
};

export type RemoveNodeType = {
	type: 'removeNodeType';
	data: NodeTypeData;
};

export type NodeDescriptionUpdated = {
	type: 'nodeDescriptionUpdated';
	data: {};
};

export type HotReloadPushMessage = ReloadNodeType | RemoveNodeType | NodeDescriptionUpdated;
