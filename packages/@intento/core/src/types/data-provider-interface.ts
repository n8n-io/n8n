import type { INodeExecutionData } from 'n8n-workflow';

/**
 * Interface for objects that can be serialized to n8n execution data format.
 *
 * Enables supply chain objects (requests, responses, errors) to be tracked in
 * n8n's execution UI, making all retry attempts and their data visible to users
 * for debugging and audit purposes.
 *
 * **Primary Use Case:**
 * SupplierBase calls `addInputData()` and `addOutputData()` with serialized data
 * from requests/responses. This populates n8n's execution panel with structured
 * data for each supply attempt, including request parameters, response data,
 * latency metrics, and error details.
 *
 * **Implementation Requirements:**
 * - Return 2D array matching n8n's execution data structure: `[[{json: {...}}]]`
 * - First dimension: Connection/output index (typically single element)
 * - Second dimension: Items in that output (typically single item per attempt)
 * - Include correlation IDs (requestId) to link requests with responses
 * - Include all data relevant for debugging: inputs, outputs, timing, metadata
 * - Omit sensitive data (credentials, tokens, PII)
 *
 * **Format Convention:**
 * ```
 * [[{json: {requestId, ...fields}}]]  // Standard format for most implementations
 * ```
 *
 * @example
 * ```typescript
 * class TranslationRequest implements IDataProvider {
 *   asExecutionData(): INodeExecutionData[][] {
 *     return [[{
 *       json: {
 *         requestId: this.requestId,
 *         from: this.from,
 *         to: this.to,
 *         text: this.text,
 *         requestedAt: this.requestedAt
 *       }
 *     }]];
 *   }
 * }
 *
 * // In SupplierBase, this appears in n8n UI:
 * // Input tab shows: {requestId: "abc-123", from: "en", to: "fr", text: "Hello", requestedAt: 1609459200000}
 * ```
 *
 * @see {@link SupplyRequestBase} for request implementation pattern
 * @see {@link SupplyResponseBase} for response implementation pattern
 * @see {@link SupplyErrorBase} for error implementation pattern
 * @see {@link SupplierBase.startAttempt} where addInputData() consumes this
 * @see {@link SupplierBase.completeAttempt} where addOutputData() consumes this
 */
export interface IDataProvider {
	/**
	 * Converts object state into n8n execution data format.
	 *
	 * **Called by SupplierBase** to track supply attempts in n8n's execution UI.
	 * Each call to this method represents one entry in the execution panel.
	 *
	 * @returns 2D array of execution data items in n8n's standard format
	 *
	 * @example
	 * ```typescript
	 * // Request serialization (input data)
	 * const request = new TranslationRequest("Hello", "fr", "en");
	 * functions.addInputData(connection, request.asExecutionData());
	 *
	 * // Response serialization (output data)
	 * const response = new TranslationResponse(request, "Bonjour");
	 * functions.addOutputData(connection, index, response.asExecutionData());
	 * ```
	 */
	asExecutionData(): INodeExecutionData[][];
}
