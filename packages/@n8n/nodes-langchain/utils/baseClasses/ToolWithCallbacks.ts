import type { Tool } from 'langchain/tools';
import type { IExecuteFunctions } from 'n8n-workflow';
import { getToolCallbacks } from '../callbacks';

type ConstructorParametersType<T> = T extends new (...args: infer P) => unknown ? P : never;

/**
 * Not all Langchain tools support passing down of `callbacks`(Wikipedia, Serpe, etc.).
 * Hence wrapper around a Tool instance, providing callback functionality.
 */

export class ToolWithCallbacks<
	T extends Tool,
	Params extends unknown[] = ConstructorParametersType<T>,
> {
	private toolInstance: T;

	constructor(context: IExecuteFunctions, ToolClass: new (...args: Params) => T, ...args: Params) {
		this.toolInstance = new ToolClass(...args);
		this.toolInstance.callbacks = getToolCallbacks(context);
	}

	getToolInstance(): T {
		return this.toolInstance;
	}
}
