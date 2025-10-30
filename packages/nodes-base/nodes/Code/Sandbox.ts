import { EventEmitter } from 'events';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	ISupplyDataFunctions,
	IWorkflowDataProxyData,
} from 'n8n-workflow';

import { validateRunCodeAllItems, validateRunCodeEachItem } from './result-validation';

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

export function getSandboxContext(
	this: IExecuteFunctions | ISupplyDataFunctions,
	index: number,
): SandboxContext {
	const helpers = {
		...this.helpers,
		httpRequestWithAuthentication: this.helpers.httpRequestWithAuthentication.bind(this),
		requestWithAuthenticationPaginated: this.helpers.requestWithAuthenticationPaginated.bind(this),
	};
	return {
		// from NodeExecuteFunctions
		$getNodeParameter: this.getNodeParameter.bind(this),
		$getWorkflowStaticData: this.getWorkflowStaticData.bind(this),
		helpers,

		// to bring in all $-prefixed vars and methods from WorkflowDataProxy
		// $node, $items(), $parameter, $json, $env, etc.
		...this.getWorkflowDataProxy(index),
	};
}

export abstract class Sandbox extends EventEmitter {
	constructor(
		private textKeys: SandboxTextKeys,
		protected helpers: IExecuteFunctions['helpers'],
	) {
		super();
	}

	abstract runCode<T = unknown>(): Promise<T>;

	abstract runCodeAllItems(): Promise<INodeExecutionData[] | INodeExecutionData[][]>;

	abstract runCodeEachItem(itemIndex: number): Promise<INodeExecutionData | undefined>;

	validateRunCodeEachItem(
		executionResult: INodeExecutionData | undefined,
		itemIndex: number,
	): INodeExecutionData {
		return validateRunCodeEachItem(
			executionResult,
			itemIndex,
			this.textKeys,
			this.helpers.normalizeItems.bind(this.helpers),
		);
	}

	validateRunCodeAllItems(
		executionResult: INodeExecutionData | INodeExecutionData[] | undefined,
	): INodeExecutionData[] {
		return validateRunCodeAllItems(
			executionResult,
			this.textKeys,
			this.helpers.normalizeItems.bind(this.helpers),
		);
	}
}
