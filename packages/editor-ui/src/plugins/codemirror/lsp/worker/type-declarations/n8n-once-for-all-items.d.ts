export {};

declare global {
	interface NodeData<C, J extends N8nJson, B extends string, P> {
		context: C;
		params: P;
	}
}
