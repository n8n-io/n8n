export {};

declare global {
	interface NodeData<C = any, J extends N8nJson = any, B extends string = string, P = any> {
		context: C;
		params: P;
		all(branchIndex?: number, runIndex?: number): Array<J & N8nJson>;
		first(branchIndex?: number, runIndex?: number): J & N8nJson;
		last(branchIndex?: number, runIndex?: number): J & N8nJson;
		itemMatching(itemIndex: number): J & N8nJson;
	}

	// @ts-expect-error N8nInputJson is populated dynamically
	type N8nInput = NodeData<N8nInputContext, N8nInputJson, N8nInputBinaryKeys, N8nInputParams>;
}
