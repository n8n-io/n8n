import { EventEmitter } from 'events';
import type { IExecuteFunctions, INodeExecutionData, IWorkflowDataProxyData } from 'n8n-workflow';

export interface SandboxContext extends IWorkflowDataProxyData {
	$getNodeParameter: IExecuteFunctions['getNodeParameter'];
	$getWorkflowStaticData: IExecuteFunctions['getWorkflowStaticData'];
	helpers: IExecuteFunctions['helpers'];
}

export abstract class CodeSandbox extends EventEmitter {
	constructor(protected helpers: IExecuteFunctions['helpers']) {
		super();
	}

	abstract runCode<T = unknown>(): Promise<T>;

	abstract runCodeAllItems(): Promise<INodeExecutionData[] | INodeExecutionData[][]>;

	abstract runCodeEachItem(itemIndex: number): Promise<INodeExecutionData | undefined>;
}
