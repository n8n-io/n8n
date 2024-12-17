type NodeTypeData = {
	name: string;
	version: number;
};

type ReloadNodeType = {
	type: 'reloadNodeType';
	data: NodeTypeData;
};

type RemoveNodeType = {
	type: 'removeNodeType';
	data: NodeTypeData;
};

type NodeDescriptionUpdated = {
	type: 'nodeDescriptionUpdated';
	data: {};
};

export type HotReloadPushMessage = ReloadNodeType | RemoveNodeType | NodeDescriptionUpdated;
