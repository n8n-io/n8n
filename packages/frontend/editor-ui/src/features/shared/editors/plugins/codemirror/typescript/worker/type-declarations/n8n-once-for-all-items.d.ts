export {};

declare global {
	interface NodeData<C = any, J extends N8nJson = any, B extends string = string, P = any> {
		context: C;
		params: P;
		all(branchIndex?: number, runIndex?: number): Array<N8nItem<J, B>>;
		first(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
		last(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
		itemMatching(itemIndex: number): N8nItem<J, B>;
	}

	// @ts-expect-error N8nInputJson is populated dynamically
	type N8nInput = NodeData<N8nInputContext, N8nInputJson, N8nInputBinaryKeys, N8nInputParams>;
}
