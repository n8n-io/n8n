import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import {
	getHtmlSandboxCSP,
	isFormHtmlSandboxingDisabled,
	isWebhookHtmlSandboxingDisabled,
} from 'n8n-core';
import { validateHeaderName, validateHeaderValue } from 'node:http';
import { ensureError } from '@n8n/utils/errors/ensure-error';

/**
 * The headers object that node's `responseHeaders` property can return
 */
export type WebhookNodeResponseHeaders = {
	entries?: Array<{
		name: string;
		value: string;
	}>;
};

/**
 * Headers that users are not allowed to set via webhook response config, because they control
 * client-side state the instance owns rather than the response payload.
 */
const PROTECTED_HEADERS = new Set([
	'content-security-policy',
	'strict-transport-security',
	'clear-site-data',
]);

/** Response headers. Keys are always lower-cased. Invalid headers are silently skipped. */
export class WebhookResponseHeaders {
	private headers = new Map<string, string>();

	/** Create an instance from a plain object, validating each entry. */
	static fromObject(obj: object): WebhookResponseHeaders {
		const instance = new WebhookResponseHeaders();
		instance.addFromObject(obj);
		return instance;
	}

	/** Add a single header. Skips invalid or protected headers, logging a warning for each. */
	set(name: string, value: string): void {
		const lowerName = name.toLowerCase();
		if (PROTECTED_HEADERS.has(lowerName)) {
			Container.get(Logger).warn('Dropping protected webhook response header', {
				headerName: name,
			});
			return;
		}
		try {
			validateHeaderName(lowerName);
			validateHeaderValue(lowerName, value);
		} catch (e) {
			Container.get(Logger).warn('Dropping invalid webhook response header', {
				headerName: name,
				error: ensureError(e).message,
			});
			return;
		}
		this.headers.set(lowerName, value);
	}

	/** Add headers from a plain object (e.g. IDataObject from RespondToWebhook node). */
	addFromObject(obj: object): void {
		for (const [name, value] of Object.entries(obj)) {
			this.set(name, String(value));
		}
	}

	/** Add headers from a webhook node's `responseHeaders` parameter. */
	addFromNodeHeaders(nodeHeaders: WebhookNodeResponseHeaders): void {
		if (nodeHeaders.entries === undefined) return;

		for (const entry of nodeHeaders.entries) {
			this.set(entry.name, entry.value);
		}
	}

	/** Apply all validated headers to an Express response. */
	applyToResponse(res: Response): void {
		if (this.headers.size === 0) return;

		res.setHeaders(this.headers);
	}
}

/** The operator setting that controls the sandbox CSP on the responses of a route. */
export type WebhookSandboxSetting = 'webhook' | 'form';

const SANDBOX_SETTING_LOCAL = 'webhookSandboxSetting';

/** Record which operator setting controls the sandbox CSP on this response. */
export function setRouteSandboxSetting(res: Response, setting: WebhookSandboxSetting): void {
	res.locals[SANDBOX_SETTING_LOCAL] = setting;
}

function getRouteSandboxSetting(res: Response): WebhookSandboxSetting | undefined {
	const setting: unknown = res.locals?.[SANDBOX_SETTING_LOCAL];
	return setting === 'webhook' || setting === 'form' ? setting : undefined;
}

/**
 * Set the sandbox CSP header on a webhook or form route response, unless an operator
 * disabled it. The setting of the route decides, so every writer of a route follows the
 * same setting. `fallback` applies when the response is not on a webhook or form route.
 */
export function applySandboxCSP(res: Response, fallback: WebhookSandboxSetting = 'webhook'): void {
	const setting = getRouteSandboxSetting(res) ?? fallback;
	const disabled =
		setting === 'form' ? isFormHtmlSandboxingDisabled() : isWebhookHtmlSandboxingDisabled();
	if (disabled) return;
	res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
}

/**
 * Set the sandbox CSP header on a form page response. If an operator disabled it, remove
 * the header instead, because the request handler sets it for the whole route.
 * Call this for every HTML page a form endpoint serves, error and status pages included.
 */
export function applyFormSandboxCSP(res: Response): void {
	if (isFormHtmlSandboxingDisabled()) {
		res.removeHeader('Content-Security-Policy');
		return;
	}
	res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
}
