import type { AINodeConnectionType, IntentoConnectionType } from 'n8n-workflow';

import type { Tracer } from 'tracing/*';
import type { IFunctions } from 'types/*';

/**
 * Factory for retrieving suppliers from n8n's connection system.
 *
 * Provides centralized access to connected suppliers with automatic type casting,
 * priority ordering (LIFO), and comprehensive logging. Used by supplier-based nodes
 * to discover and instantiate their data sources.
 *
 * **Key Responsibilities:**
 * - Query n8n connection system for connected suppliers
 * - Handle single and multiple supplier scenarios
 * - Apply LIFO ordering (reverse array) for priority processing
 * - Provide type-safe supplier retrieval with generics
 *
 * **Design Assumptions:**
 * - n8n's connection system validates supplier structure before delivery
 * - Supplier type compatibility enforced by connection type definitions
 * - Empty supplier lists are valid (optional connections)
 *
 * @example
 * ```typescript
 * // Retrieve translation suppliers
 * const suppliers = await SupplyFactory.getSuppliers<ITranslationSupplier>(
 *   functions,
 *   'IntentoTranslation',
 *   tracer
 * );
 *
 * // suppliers[0] is highest priority (last connected)
 * // suppliers[n-1] is lowest priority (first connected)
 * ```
 */
export class SupplyFactory {
	/**
	 * Retrieves connected suppliers from n8n connection system.
	 *
	 * Queries n8n's connection data for the specified connection type and returns
	 * suppliers in reverse order (LIFO) for priority-based processing. Handles three
	 * scenarios: multiple suppliers (array), single supplier (object), or no suppliers (null).
	 *
	 * **Priority Ordering (LIFO):**
	 * - Last connected supplier = highest priority (index 0 after reverse)
	 * - First connected supplier = lowest priority (index n-1 after reverse)
	 * - Enables fallback chains: try [0], if fails try [1], etc.
	 *
	 * **Type Safety:**
	 * - Generic type T defines expected supplier interface
	 * - Type assertions justified by n8n's connection validation
	 * - IntentoConnectionType compatible with AINodeConnectionType (both string unions)
	 *
	 * @param functions - n8n function interface for accessing connection data
	 * @param connectionType - Intento connection type identifier (e.g., 'IntentoTranslation')
	 * @param tracer - Tracer instance for debug/warn logging throughout retrieval
	 * @returns Array of suppliers in LIFO order (last connected first), empty if none connected
	 *
	 * @example
	 * ```typescript
	 * // Multiple suppliers: returns [supplier3, supplier2, supplier1]
	 * const suppliers = await SupplyFactory.getSuppliers<ISupplier>(
	 *   functions,
	 *   'IntentoTranslation',
	 *   tracer
	 * );
	 *
	 * // Single supplier: returns [supplier1]
	 * // No suppliers: returns []
	 * ```
	 */
	static async getSuppliers<T>(functions: IFunctions, connectionType: IntentoConnectionType, tracer: Tracer): Promise<T[]> {
		tracer.debug(`🔮 Getting '${connectionType}' suppliers ...`);

		// NOTE: IntentoConnectionType extends AINodeConnectionType string union, cast is safe
		const data = await functions.getInputConnectionData(connectionType as AINodeConnectionType, 0);

		if (Array.isArray(data)) {
			tracer.debug(`🔮 Retrieved ${data.length} suppliers for connection type '${connectionType}'`);

			// NOTE: Reverse array for LIFO priority - last connected supplier becomes first choice
			// Type assertion justified: n8n validates supplier structure matches connection type
			return data.map((item) => item as T).reverse();
		}

		if (data) {
			// NOTE: Single supplier case - n8n returns object instead of array
			tracer.debug(`🔮 Retrieved 1 supplier for connection type '${connectionType}'`);
			return [data as T];
		}

		// NOTE: No suppliers connected - valid for optional connections, caller handles empty array
		tracer.warn(`🔮 No suppliers found for connection type '${connectionType}'`);
		return [];
	}
}
