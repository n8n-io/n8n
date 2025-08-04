export {};

declare global {
	interface NodeData<C, J extends N8nJson, B extends string, P> {
		context: C;
		item: N8nItem<J, B>;
		params: P;
	}

	// @ts-expect-error N8nInputJson is populated dynamically
	type N8nInput = NodeData<{}, N8nInputJson, {}, {}>;

	const $itemIndex: number;
	const $json: N8nInput['item']['json'];
	const $binary: N8nInput['item']['binary'];
}
