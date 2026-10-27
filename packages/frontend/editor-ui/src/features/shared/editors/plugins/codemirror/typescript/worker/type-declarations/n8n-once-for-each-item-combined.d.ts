export {};

declare global {
	interface NodeData<C, J extends N8nJson, B extends string, P> {
		context: C;
		item: J & N8nJson;
		params: P;
	}

	// @ts-expect-error N8nInputJson is populated dynamically
	type N8nInput = NodeData<{}, N8nInputJson, {}, {}>;

	const $itemIndex: number;
	const $json: N8nInputJson & N8nJson;
	const $binary: Record<N8nInputBinaryKeys, N8nBinary>;
}
