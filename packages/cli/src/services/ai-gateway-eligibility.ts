// Thin re-export: the pure eligibility logic moved to `@n8n/api-types` so the
// frontend can reuse it too (see `useWorkflowGatewayScan`). Keep this module
// around so existing cli imports (`@/services/ai-gateway-eligibility`) keep
// resolving unchanged.
export {
	checkAiGatewayEligibility,
	HTTP_NODE_TYPES,
	type AiGatewayEligibility,
	type AiGatewayEligibilityReason,
} from '@n8n/api-types';
