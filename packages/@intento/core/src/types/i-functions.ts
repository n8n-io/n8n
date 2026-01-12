import type { IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';

/**
 * Union type for n8n function contexts available during node execution.
 *
 * Supports both regular node execution (IExecuteFunctions) and data supply
 * operations (ISupplyDataFunctions). Used throughout the codebase to accept
 * either context type for maximum flexibility.
 */
export type IFunctions = ISupplyDataFunctions | IExecuteFunctions;
