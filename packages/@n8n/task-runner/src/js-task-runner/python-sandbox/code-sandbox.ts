import { EventEmitter } from 'events';
import type { IExecuteFunctions, INodeExecutionData, IWorkflowDataProxyData } from 'n8n-workflow';

interface SandboxTextKeys {
	object: {
		singular: string;
		plural: string;
	};
}

export interface SandboxContext extends IWorkflowDataProxyData {
	$getNodeParameter: IExecuteFunctions['getNodeParameter'];
	$getWorkflowStaticData: IExecuteFunctions['getWorkflowStaticData'];
	helpers: IExecuteFunctions['helpers'];
}

export abstract class CodeSandbox extends EventEmitter {
	constructor(
		// @ts-expect-error `_textKeys` is unused but kept for similarity with original.
		// eslint-disable-next-line @typescript-eslint/naming-convention
		private _textKeys: SandboxTextKeys,
		protected helpers: IExecuteFunctions['helpers'],
	) {
		super();
	}

	abstract runCode<T = unknown>(): Promise<T>;

	abstract runCodeAllItems(): Promise<INodeExecutionData[] | INodeExecutionData[][]>;

	abstract runCodeEachItem(itemIndex: number): Promise<INodeExecutionData | undefined>;
}
