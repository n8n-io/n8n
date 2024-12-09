import type { DateTime } from 'luxon';

export {};

declare global {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console) */
	interface Console {
		/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/log_static) */
		log(...data: any[]): void;
	}

	var console: Console;

	interface N8nJson {
		[key: string]: number | boolean | string | Object | Array<any> | Date | DateTime;
	}

	interface N8nBinary {
		id: string;
		fileName: string;
		fileExtension: string;
		fileType: string;
		fileSize: string;
		mimeType: string;
	}

	// TODO: populate dynamically
	interface N8nVars {}

	// TODO: populate dynamically
	interface N8nParameter {}

	interface N8nItem<J extends N8nJson = N8nJson, B extends string = string> {
		json: J & N8nJson;
		binary: Record<B, N8nBinary>;
	}

	// Will be populated dynamically
	interface N8nInput {}

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

	const $parameter: N8nParameter;
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

	// @ts-expect-error NodeName and NodeDataMap are created dynamically
	function $<K extends NodeName>(nodeName: K): NodeDataMap[K];
}
