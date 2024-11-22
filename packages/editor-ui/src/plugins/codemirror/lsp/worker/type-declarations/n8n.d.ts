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

	// Will be populated dynamically
	interface N8nInput {}

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

	// @ts-expect-error NodeName and NodeDataMap are created dynamically
	function $<K extends NodeName>(nodeName: K): NodeDataMap[K];
}
