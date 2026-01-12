import type { AINodeConnectionType, IntentoConnectionType } from 'n8n-workflow';

import type { Tracer } from 'tracing/*';
import type { IFunctions } from 'types/*';

/**
 * Factory for retrieving suppliers from n8n node connections.
 *
 * Retrieves supplier instances connected to a node via specific connection types.
 * Handles single supplier, multiple suppliers, and no supplier scenarios.
 */
export class SupplyFactory {
	/**
	 * Retrieves suppliers connected via specified connection type.
	 *
	 * Reverses n8n's default RTL (right-to-left) connection order to achieve
	 * LTR (left-to-right) priority, where leftmost connections have highest priority.
	 *
	 * @param functions - n8n functions for accessing connection data
	 * @param connectionType - Type of connection to query for suppliers
	 * @param tracer - Tracer for logging supplier retrieval operations
	 * @returns Array of suppliers (empty if none connected, LTR priority if multiple)
	 */
	static async getSuppliers<T>(functions: IFunctions, connectionType: IntentoConnectionType, tracer: Tracer): Promise<T[]> {
		tracer.debug(`🔮 [Reflection] Getting '${connectionType}' suppliers ...`);

		const data = await functions.getInputConnectionData(connectionType as AINodeConnectionType, 0);

		if (Array.isArray(data)) {
			tracer.debug(`🔮 [Reflection] Retrieved ${data.length} suppliers for connection type '${connectionType}'`);
			// NOTE: Reverse order converts n8n's RTL to LTR priority (leftmost = highest priority)
			return data.map((item) => item as T).reverse();
		}

		if (data) {
			tracer.debug(`🔮 [Reflection] Retrieved 1 supplier for connection type '${connectionType}'`);
			return [data as T];
		}

		tracer.warn(`🔮 [Reflection] No suppliers found for connection type '${connectionType}'`);
		return [];
	}
}
