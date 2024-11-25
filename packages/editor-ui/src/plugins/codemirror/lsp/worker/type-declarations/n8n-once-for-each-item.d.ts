export {};
export type N8nReturn = Promise<Object> | Object;

declare global {
	interface NodeData<C, J extends N8nJson, B extends string, P> {
		context: C;
		item: N8nItem<J, B>;
		params: P;
	}

	const $itemIndex: number;
	const $json: N8nInput['item']['json'];
	const $binary: N8nInput['item']['binary'];
}
