export {};

declare global {
	interface N8nJson {
		[key: string]: number | boolean | string | Object | Array<any> | Date;
	}
	interface N8nBinary {
		id: string;
		fileName: string;
		fileExtension: string;
		fileType: string;
		fileSize: string;
		mimeType: string;
	}

	interface N8nItem<J extends N8nJson = N8nJson, B extends string = string> {
		json: J;
		binary: Record<B, N8nBinary>;
	}

	interface N8nInput {
		all(branchIndex?: number, runIndex?: number): Array<N8nItem>;
		first(branchIndex?: number, runIndex?: number): N8nItem;
		last(branchIndex?: number, runIndex?: number): N8nItem;
		item: N8nItem;
	}

	interface N8nExecution {
		id: string;
	}

	interface N8nWorkflow {
		id: string;
		name: string;
	}

	const $input: N8nInput;
	const $execution: N8nExecution;
	const $workflow: N8nWorkflow;

	type NodeName = 'Node A' | 'Node B';

	interface NodeData<C, J extends N8nJson, B extends string, P> {
		context: C;
		item: N8nItem<J, B>;
		params: P;
	}

	interface NodeDataMap {
		'Node A': NodeData<{}, { a: string }, 'data', {}>;
		'Node B': NodeData<{}, { b: string }, never, {}>;
	}

	function $<K extends NodeName>(nodeName: K): NodeDataMap[K];
}
