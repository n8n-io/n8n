import type { IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';

/**
 * `IExecuteFunctions` vs `ISupplyDataFunctions` (e.g. agent as a tool). Discriminate on
 * `cloneWith`, which only the sub-node context adds: `SupplyDataContext` extends the same
 * base class as `ExecuteContext`, so every member of that base (`getExecuteData`, …) is on
 * both and cannot tell them apart.
 */
export function isExecuteFunctions(
	context: IExecuteFunctions | ISupplyDataFunctions,
): context is IExecuteFunctions {
	return !('cloneWith' in context);
}
