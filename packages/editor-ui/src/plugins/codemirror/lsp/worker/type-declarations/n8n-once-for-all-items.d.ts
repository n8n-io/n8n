export {};
export type N8nReturn = Promise<Array<any>> | Array<any>;

declare global {
	interface NodeData<C, J extends N8nJson, B extends string, P> {
		context: C;
		params: P;
		all(branchIndex?: number, runIndex?: number): Array<N8nItem<J, B>>;
		first(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
		last(branchIndex?: number, runIndex?: number): N8nItem<J, B>;
		itemMatching(itemIndex: number): N8nItem<J, B>;
	}
}
