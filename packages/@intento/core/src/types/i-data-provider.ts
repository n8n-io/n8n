import type { IDataObject } from 'n8n-workflow';

/**
 * Interface for objects that can be converted to n8n's IDataObject format.
 *
 * Enables serialization of custom objects into n8n's standard data
 * format for workflow data exchange and persistence.
 */
export interface IDataProvider {
	/**
	 * Converts the object to n8n's IDataObject format.
	 *
	 * @returns IDataObject representation suitable for n8n workflow data exchange
	 */
	asDataObject(): IDataObject;
}
