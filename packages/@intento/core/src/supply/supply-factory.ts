import type { AINodeConnectionType, IntentoConnectionType } from 'n8n-workflow';

import type { Tracer } from 'tracing/*';
import type { IFunctions } from 'types/*';

/**
 * Factory for retrieving supplier instances from n8n AI node connections.
 *
 * Retrieves configured supplier instances (translation providers, AI models, etc.)
 * from upstream nodes connected via n8n's AI agent connection system. Handles both
 * single and multiple supplier configurations with automatic array normalization.
 *
 * **Connection resolution:**
 * - Single supplier → Wrapped in array for consistent interface
 * - Multiple suppliers → Returned as-is, reversed for priority order
 * - No suppliers → Returns empty array (logged as warning)
 *
 * @example
 * ```typescript
 * const tracer = new Tracer(this);
 * const suppliers = await SupplyFactory.getSuppliers<TranslationSupplier>(
 *   this,
 *   'translation',
 *   tracer
 * );
 * // → [supplier3, supplier2, supplier1] (reversed for fallback priority)
 * ```
 */
export class SupplyFactory {
	/**
	 * Retrieves supplier instances from n8n AI node input connections.
	 *
	 * Queries n8n connection system for suppliers of specified type, normalizes single/array
	 * results, and reverses array order for fallback priority (last connected = first tried).
	 * Logs retrieval process with supplier counts for debugging connection issues.
	 *
	 * **Array reversal rationale:** n8n connection order is first-connected-first, but fallback
	 * logic typically tries last-added-first (e.g., prefer newest config over legacy).
	 *
	 * @param functions - n8n functions for accessing workflow context and connections
	 * @param connectionType - Intento connection type identifier (e.g., 'translation', 'ai-model')
	 * @param tracer - Tracer instance for distributed logging with correlation
	 * @returns Array of supplier instances in reverse connection order (empty if none found)
	 *
	 * @example
	 * ```typescript
	 * // Multiple suppliers connected: OpenAI → DeepL → Google
	 * const suppliers = await SupplyFactory.getSuppliers<TranslationSupplier>(...);
	 * // Returns: [Google, DeepL, OpenAI] (reversed)
	 * ```
	 */
	static async getSuppliers<T>(functions: IFunctions, connectionType: IntentoConnectionType, tracer: Tracer): Promise<T[]> {
		tracer.debug(`🔮 [Reflection] Getting '${connectionType}' suppliers ...`);

		// NOTE: Type cast necessary as IntentoConnectionType extends AINodeConnectionType
		// but n8n's getInputConnectionData requires exact AINodeConnectionType parameter
		const data = await functions.getInputConnectionData(connectionType as AINodeConnectionType, 0);

		if (Array.isArray(data)) {
			tracer.debug(`🔮 [Reflection] Retrieved ${data.length} suppliers for connection type '${connectionType}'`);

			// NOTE: Reverse array so last-connected supplier is tried first in fallback logic
			// Connection order: [first, second, third] → Priority order: [third, second, first]
			return data.map((item) => item as T).reverse();
		}

		if (data) {
			tracer.debug(`🔮 [Reflection] Retrieved 1 supplier for connection type '${connectionType}'`);
			// NOTE: Wrap single supplier in array for consistent return type
			return [data as T];
		}

		tracer.warn(`🔮 [Reflection] No suppliers found for connection type '${connectionType}'`);
		return [];
	}
}
