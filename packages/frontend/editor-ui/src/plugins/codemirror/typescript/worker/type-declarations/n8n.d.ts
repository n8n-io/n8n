import type { DateTime } from 'luxon';

export {};

declare global {
	type OutputItemWithoutJsonKey = {
		[key: string]: unknown;
	} & { json?: never };

	type OutputItemWithJsonKey = {
		json: {
			[key: string]: unknown;
		};
	};

	type MaybePromise<T> = Promise<T> | T;

	type OneOutputItem = OutputItemWithJsonKey | OutputItemWithoutJsonKey;
	type AllOutputItems = OneOutputItem | Array<OneOutputItem>;

	type N8nOutputItem = MaybePromise<OneOutputItem>;
	type N8nOutputItems = MaybePromise<AllOutputItems>;

	interface N8nJson {
		[key: string]: any;
	}

	interface N8nBinary {
		id: string;
		fileName: string;
		fileExtension: string;
		fileType: string;
		fileSize: string;
		mimeType: string;
	}

	interface N8nVars {}

	// TODO: populate dynamically
	interface N8nParameter {}

	interface N8nItem<J extends N8nJson = N8nJson, B extends string = string> {
		json: J & N8nJson;
		binary: Record<B, N8nBinary>;
	}

	interface N8nCustomData {
		set(key: string, value: string): void;
		get(key: string): string;
		getAll(): Record<string, string>;
		setAll(values: Record<string, string>): void;
	}

	type N8nExecutionMode = 'test' | 'production';
	interface N8nExecution {
		id: string;
		mode: N8nExecutionMode;
		resumeUrl?: string;
		resumeFormUrl?: string;
		customData: N8nCustomData;
	}

	interface N8nWorkflow {
		id: string;
		active: boolean;
		name: string;
	}

	interface N8nPrevNode {
		name: string;
		outputIndex: number;
		runIndex: number;
	}

	const $input: N8nInput;
	const $execution: N8nExecution;
	const $workflow: N8nWorkflow;
	const $prevNode: N8nPrevNode;
	const $runIndex: number;
	const $now: DateTime;
	const $today: DateTime;

	const $parameter: N8nInput['params'];
	const $vars: N8nVars;
	const $nodeVersion: number;

	function $jmespath(object: Object | Array<any>, expression: string): any;
	function $if<B extends boolean, T, F>(
		condition: B,
		valueIfTrue: T,
		valueIfFalse: F,
	): B extends true ? T : T extends false ? F : T | F;
	function $ifEmpty<V, E>(value: V, valueIfEmpty: E): V | E;
	function $min(...numbers: number[]): number;
	function $max(...numbers: number[]): number;
	function $evaluateExpression(expression: string): any;
	function $getWorkflowStaticData(type: 'global' | 'node'): N8nJson;

	type SomeOtherString = string & NonNullable<unknown>;
	// @ts-expect-error NodeName is created dynamically
	function $<K extends NodeName>(
		nodeName: K | SomeOtherString,
		// @ts-expect-error NodeDataMap is created dynamically
	): K extends keyof NodeDataMap ? NodeDataMap[K] : NodeData;
}
