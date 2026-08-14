import type { IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';

/** `IExecuteFunctions` vs `ISupplyDataFunctions` (e.g. agent as a tool); only the former has `getExecuteData`. */
export function isExecuteFunctions(
	context: IExecuteFunctions | ISupplyDataFunctions,
): context is IExecuteFunctions {
	return 'getExecuteData' in context;
}
