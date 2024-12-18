export {};

declare global {
	interface NodeData<C, J extends N8nJson, B extends string, P> {
		context: C;
		params: P;
		all(branchIndex?: number, runIndex?: number): Array<N8nItem<J, B>>;
		first(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
		last(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
		itemMatching(itemIndex: number): N8nItem<J, B>;
	}

	// @ts-expect-error N8nInputItem is populated dynamically
	type N8nInput = NodeData<{}, N8nInputItem, {}, {}>;
}
