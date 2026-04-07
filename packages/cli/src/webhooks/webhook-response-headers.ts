import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { validateHeaderName, validateHeaderValue } from 'node:http';
import { ensureError } from 'n8n-workflow';

/**
 * The headers object that node's `responseHeaders` property can return
 */
export type WebhookNodeResponseHeaders = {
	entries?: Array<{
		name: string;
		value: string;
	}>;
};

/** Headers that users are not allowed to set via webhook response config */
const PROTECTED_HEADERS = new Set(['content-security-policy']);

/** Response headers. Keys are always lower-cased. Invalid headers are silently skipped. */
export class WebhookResponseHeaders {
	private headers = new Map<string, string>();

	/** Create an instance from a plain object, validating each entry. */
	static fromObject(obj: object): WebhookResponseHeaders {
		const instance = new WebhookResponseHeaders();
		instance.addFromObject(obj);
		return instance;
	}

	/** Add a single header. Silently skips invalid or protected headers. */
	set(name: string, value: string): void {
		const lowerName = name.toLowerCase();
		if (PROTECTED_HEADERS.has(lowerName)) return;
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
