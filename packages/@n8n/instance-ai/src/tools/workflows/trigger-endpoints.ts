import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import {
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_PATH_IDENTIFIER,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';

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

/** Mirrors NodeHelpers.getNodeWebhookUrl: a `:param` segment makes a webhook path dynamic. */
function hasDynamicSegment(path: string): boolean {
	return path.startsWith(':') || path.includes('/:');
}

/** Mirrors the Form Trigger v2 webhook path expression: `path || options.path || webhookId`. */
function resolveFormV2Path(
	parameters: Record<string, unknown> | undefined,
	webhookId: string,
): string {
	const path = stringParam(parameters, 'path');
	if (path) return path;
	const options = parameters?.options;
	const optionsPath = isRecord(options) ? stringParam(options, 'path') : '';
	return optionsPath || webhookId;
}

function joinUrl(base: string, ...segments: string[]): string {
	const trimmedBase = base.replace(/\/+$/, '');
	const path = segments.map((segment) => segment.replace(/^\/+|\/+$/g, '')).join('/');
	return `${trimmedBase}/${path}`;
}

/**
 * Compute shareable end-user URLs for HTTP-reachable triggers in a saved
 * workflow. Encodes the URL rules that are easy to get wrong by hand: dynamic
 * webhook paths are served under the node's webhookId, Form Triggers v2 serve
 * under the form base while v1 keeps the legacy `/webhook/{path}/n8n-form`
 * shape, the `/chat` suffix is Chat Trigger-only, and a private Chat Trigger
 * has no end-user URL at all.
 */
export function computeTriggerEndpoints(
	json: WorkflowJSON,
	baseUrls: { webhookBaseUrl?: string; formBaseUrl?: string },
): TriggerEndpoint[] {
	const endpoints: TriggerEndpoint[] = [];

	for (const node of json.nodes ?? []) {
		if (!node.name) continue;
		// n8n never registers webhooks for disabled nodes (WebhookService.getNodeWebhooks),
		// so a disabled trigger has no reachable endpoint to share.
		if (node.disabled === true) continue;
		const parameters = node.parameters as Record<string, unknown> | undefined;
		const webhookId = typeof node.webhookId === 'string' ? node.webhookId : '';

		if (node.type === WEBHOOK_NODE_TYPE && baseUrls.webhookBaseUrl) {
			const path = stringParam(parameters, 'path');
			if (path === '' && webhookId) {
				// An empty static path serves at the node's webhookId
				// (NodeHelpers.getNodeWebhookPath: `path || node.webhookId`).
				endpoints.push({
					nodeName: node.name,
					kind: 'webhook',
					url: joinUrl(baseUrls.webhookBaseUrl, webhookId),
				});
			} else if (!isConcretePathSegment(path)) {
				endpoints.push({
					nodeName: node.name,
					kind: 'webhook',
					guidance:
						'The webhook path is not a concrete value yet, so no production URL can be shared.',
				});
			} else if (hasDynamicSegment(path)) {
				// n8n registers dynamic paths under `{webhookId}/{path}`, so without the
				// prefix the shared URL would 404.
				endpoints.push(
					webhookId
						? {
								nodeName: node.name,
								kind: 'webhook',
								url: joinUrl(baseUrls.webhookBaseUrl, webhookId, path),
								guidance: 'Replace the ":param" segments with real values when calling this URL.',
							}
						: {
								nodeName: node.name,
								kind: 'webhook',
								guidance:
									'The webhook path has dynamic ":param" segments and the node has no webhookId, so no production URL can be computed.',
							},
				);
			} else {
				endpoints.push({
					nodeName: node.name,
					kind: 'webhook',
					url: joinUrl(baseUrls.webhookBaseUrl, path),
				});
			}
		}

		if (node.type === FORM_TRIGGER_NODE_TYPE) {
			if (node.typeVersion === 1) {
				// Form Trigger v1 registers `{path}/n8n-form` without `nodeType: 'form'`, so it
				// serves under the webhook base and never falls back to the webhookId.
				if (baseUrls.webhookBaseUrl) {
					const path = stringParam(parameters, 'path');
					endpoints.push(
						isConcretePathSegment(path)
							? {
									nodeName: node.name,
									kind: 'form',
									url: joinUrl(baseUrls.webhookBaseUrl, path, FORM_TRIGGER_PATH_IDENTIFIER),
								}
							: {
									nodeName: node.name,
									kind: 'form',
									guidance:
										'The form path is not a concrete value yet, so no production URL can be shared.',
								},
					);
				}
			} else if (baseUrls.formBaseUrl) {
				const segment = resolveFormV2Path(parameters, webhookId);
				endpoints.push(
					isConcretePathSegment(segment)
						? { nodeName: node.name, kind: 'form', url: joinUrl(baseUrls.formBaseUrl, segment) }
						: {
								nodeName: node.name,
								kind: 'form',
								guidance:
									'The form path is not a concrete value yet, so no production URL can be shared.',
							},
				);
			}
		}

		if (node.type === CHAT_TRIGGER_NODE_TYPE) {
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
