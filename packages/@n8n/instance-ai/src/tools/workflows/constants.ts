/**
 * Sentinel value used in credential selection maps to represent "user chose n8n Connect
 * for this credential slot". Never persisted — always converted to
 * `{ id: null, name: '', __aiGatewayManaged: true }` at the backend apply boundary.
 */
export const AI_GATEWAY_SENTINEL = '__AI_GATEWAY_MANAGED__';

/** The exact shape written to the workflow when n8n Connect is applied. */
export const AI_GATEWAY_CREDENTIAL = Object.freeze({
	id: null,
	name: '',
	__aiGatewayManaged: true as const,
});
