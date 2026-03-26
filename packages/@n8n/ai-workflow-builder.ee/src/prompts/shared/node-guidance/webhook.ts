import type { NodeGuidance } from '@/types';

export const webhook: NodeGuidance = {
	nodeType: 'n8n-nodes-base.webhook',

	usage: `Search for "Webhook" (n8n-nodes-base.webhook) when:
- Workflow needs to receive HTTP requests from external services
- API callbacks, webhooks, or HTTP endpoints are needed
- Integration requires real-time event handling from external systems`,

	connections: `WEBHOOK RESPONSE MODE RULES - CRITICAL:

Response modes and their requirements:
- "onReceived" (Immediately): Responds instantly when webhook is called. No RespondToWebhook node needed.
- "lastNode" (When Last Node Finishes): Responds with data from last node. No RespondToWebhook node needed.
- "responseNode" (Using Respond to Webhook Node): REQUIRES a RespondToWebhook node connected downstream.

RULE 1: If responseMode='responseNode', you MUST add a RespondToWebhook node
RULE 2: If RespondToWebhook node exists, responseMode MUST be 'responseNode'

Pattern for custom response control:
Webhook (responseMode: responseNode) → [Processing] → RespondToWebhook`,

	configuration: `WEBHOOK RESPONSE MODE CONFIGURATION:

Choose responseMode based on use case:
- "onReceived": Quick acknowledgment, processing happens async
- "lastNode": Return processed data, simple request-response flows
- "responseNode": Full control over response timing, headers, status codes

CRITICAL: When user needs to control response content/timing/headers, set responseMode='responseNode' AND add RespondToWebhook node.

When NOT to use responseNode:
- Simple acknowledgments (use 'onReceived')
- Return last node output directly (use 'lastNode')`,

	recommendation: `For webhook workflows requiring custom response handling (status codes, headers, delayed response), use responseMode='responseNode' with a RespondToWebhook node.

For simple webhook acknowledgments or direct data return, use 'onReceived' or 'lastNode' modes respectively.`,
};
