import type { IDataObject } from 'n8n-workflow';

/**
 * Serializes supply chain objects for tracking in n8n's execution UI.
 *
 * SupplierBase calls `addInputData()` and `addOutputData()` with these serialized objects,
 * populating n8n's execution panel with structured data for each supply attempt: request
 * parameters, response data, latency metrics, and error details.
 *
 * @example
 * ```typescript
 * class TranslationRequest implements IDataProvider {
 *   asDataObject(): IDataObject {
 *     return {
 *       requestId: this.requestId,
 *       from: this.from,
 *       to: this.to,
 *       text: this.text,
 *       requestedAt: this.requestedAt
 *     };
 *   }
 * }
 * ```
 */
export interface IDataProvider {
	/**
	 * Serializes object state for n8n execution UI tracking.
	 *
	 * NOTE: Must include correlation IDs (requestId) to link requests with responses.
	 * Omit sensitive data (credentials, tokens, PII).
	 */
	asDataObject(): IDataObject;
}
