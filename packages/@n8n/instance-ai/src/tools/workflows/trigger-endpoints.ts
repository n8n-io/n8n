import type { WorkflowJSON } from '@n8n/workflow-sdk';

const WEBHOOK_TRIGGER_TYPE = 'n8n-nodes-base.webhook';
const FORM_TRIGGER_TYPE = 'n8n-nodes-base.formTrigger';
const CHAT_TRIGGER_TYPE = '@n8n/n8n-nodes-langchain.chatTrigger';

export interface TriggerEndpoint {
	nodeName: string;
	kind: 'webhook' | 'form' | 'chat';
	/** Concrete end-user URL when it can be computed deterministically. */
	url?: string;
	/** How to reach or test this trigger; present when no URL applies. */
	guidance?: string;
}

export const TRIGGER_ENDPOINTS_NOTE =
	'Share these end-user URLs (or in-editor guidance) in your completion message. ' +
	'Do not hardcode them into workflow code or build specs unless the workflow itself needs its own endpoint.';

function stringParam(parameters: Record<string, unknown> | undefined, key: string): string {
	const value = parameters?.[key];
	return typeof value === 'string' ? value.trim() : '';
}

/** Concrete path segments only — expressions and placeholder markers are not shareable. */
function isConcretePathSegment(value: string): boolean {
	return value.length > 0 && !value.includes('{{') && !value.includes('__PLACEHOLDER');
}

function joinUrl(base: string, ...segments: string[]): string {
	const trimmedBase = base.replace(/\/+$/, '');
	const path = segments.map((segment) => segment.replace(/^\/+|\/+$/g, '')).join('/');
	return `${trimmedBase}/${path}`;
}

/**
 * Compute shareable end-user URLs for HTTP-reachable triggers in a saved
 * workflow. Encodes the URL rules that are easy to get wrong by hand: Form
 * Triggers serve under the form base (not /webhook/), the `/chat` suffix is
 * Chat Trigger-only, and a private Chat Trigger has no end-user URL at all.
 */
export function computeTriggerEndpoints(
	json: WorkflowJSON,
	baseUrls: { webhookBaseUrl?: string; formBaseUrl?: string },
): TriggerEndpoint[] {
	const endpoints: TriggerEndpoint[] = [];

	for (const node of json.nodes ?? []) {
		if (!node.name) continue;
		const parameters = node.parameters as Record<string, unknown> | undefined;
		const webhookId = typeof node.webhookId === 'string' ? node.webhookId : '';

		if (node.type === WEBHOOK_TRIGGER_TYPE && baseUrls.webhookBaseUrl) {
			const path = stringParam(parameters, 'path');
			endpoints.push(
				isConcretePathSegment(path)
					? {
							nodeName: node.name,
							kind: 'webhook',
							url: joinUrl(baseUrls.webhookBaseUrl, path),
						}
					: {
							nodeName: node.name,
							kind: 'webhook',
							guidance:
								'The webhook path is not a concrete value yet, so no production URL can be shared.',
						},
			);
		}

		if (node.type === FORM_TRIGGER_TYPE && baseUrls.formBaseUrl) {
			const path = stringParam(parameters, 'path');
			const segment = isConcretePathSegment(path) ? path : webhookId;
			endpoints.push(
				segment
					? { nodeName: node.name, kind: 'form', url: joinUrl(baseUrls.formBaseUrl, segment) }
					: {
							nodeName: node.name,
							kind: 'form',
							guidance:
								'The form path is not a concrete value yet, so no production URL can be shared.',
						},
			);
		}

		if (node.type === CHAT_TRIGGER_TYPE) {
			const isPublic = parameters?.public === true;
			if (!isPublic) {
				endpoints.push({
					nodeName: node.name,
					kind: 'chat',
					guidance:
						'This chat is private (public: false): there is no end-user URL. Tell the user to open the workflow in the editor and click the "Open chat" button on the canvas to test it.',
				});
			} else if (baseUrls.webhookBaseUrl && webhookId) {
				endpoints.push({
					nodeName: node.name,
					kind: 'chat',
					url: joinUrl(baseUrls.webhookBaseUrl, webhookId, 'chat'),
					guidance: 'Public chat URL — works once the workflow is published.',
				});
			}
		}
	}

	return endpoints;
}
