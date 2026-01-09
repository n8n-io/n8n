import type { AINodeConnectionType, IntentoConnectionType } from 'n8n-workflow';

import type { Tracer } from 'tracing/*';
import type { IFunctions } from 'types/*';

export class SupplyFactory {
	static async getSuppliers<T>(functions: IFunctions, connectionType: IntentoConnectionType, tracer: Tracer): Promise<T[]> {
		tracer.debug(`🔮 [Reflection] Getting '${connectionType}' suppliers ...`);

		const data = await functions.getInputConnectionData(connectionType as AINodeConnectionType, 0);

		if (Array.isArray(data)) {
			tracer.debug(`🔮 [Reflection] Retrieved ${data.length} suppliers for connection type '${connectionType}'`);
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
