import type { IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';

/**
 * Union type for n8n function contexts used in intento-core.
 *
 * Abstracts differences between regular n8n nodes and AI nodes, enabling
 * intento-core utilities (Tracer, ContextFactory, SupplierBase, Pipeline) to work
 * with both execution contexts without type-specific branching.
 *
 * **Context Types:**
 * - `IExecuteFunctions` - Regular n8n nodes (e.g., TranslationAgent)
 * - `ISupplyDataFunctions` - AI nodes/providers (e.g., DryRunProvider)
 *
 * **Common Operations Available:**
 * - Parameter access: `getNodeParameter()`, `getCredentials()`
 * - Execution tracking: `addOutputData()`, `sendMessageToUI()`
 * - Workflow context: `getWorkflow()`, `getNode()`
 * - Helper utilities: `helpers.httpRequest()`, `helpers.request()`
 *
 * **Type Safety Note:**
 * This union requires careful handling in implementations. Use TypeScript's
 * discriminated union patterns or runtime checks when accessing context-specific
 * members not present in both types.
 *
 * @example
 * ```typescript
 * // SupplierBase accepts either context type
 * class DryRunSupplier extends SupplierBase {
 *   constructor(connection: IntentoConnectionType, functions: IFunctions) {
 *     super('DryRun', connection, functions);
 *   }
 * }
 *
 * // Works with IExecuteFunctions
 * async execute(this: IExecuteFunctions) {
 *   const supplier = new DryRunSupplier(connection, this);
 * }
 *
 * // Works with ISupplyDataFunctions
 * async supplyData(this: ISupplyDataFunctions) {
 *   const supplier = new DryRunSupplier(connection, this);
 * }
 * ```
 *
 * @see {@link SupplierBase} for primary consumer of this type
 * @see {@link Tracer} for logging across both context types
 * @see {@link ContextFactory} for context deserialization using either type
 */
export type IFunctions = ISupplyDataFunctions | IExecuteFunctions;
