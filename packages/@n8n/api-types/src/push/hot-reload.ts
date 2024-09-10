interface NodeTypeData {
	name: string;
	version: number;
}

interface ReloadNodeType {
	type: 'reloadNodeType';
	data: NodeTypeData;
}

interface RemoveNodeType {
	type: 'removeNodeType';
	data: NodeTypeData;
}

interface NodeDescriptionUpdated {
	type: 'nodeDescriptionUpdated';
	data: {};
}

export type HotReloadPushMessage = ReloadNodeType | RemoveNodeType | NodeDescriptionUpdated;
