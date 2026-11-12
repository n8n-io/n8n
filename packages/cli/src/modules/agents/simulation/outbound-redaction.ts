import { ALWAYS_SENSITIVE_HEADERS } from '@n8n/utils/redaction/sensitive-headers';
import { isSensitiveKey } from '@n8n/utils/redaction/sensitive-key';
import { isRecord } from '@n8n/utils/is-record';
import type { ICredentialsHelper } from 'n8n-workflow';

import type { OutboundRequest } from './tool-simulation.contracts';

const PLACEHOLDER = '[REDACTED]';
// Shorter values would match ordinary text; erring long only blurs the simulated reply.
const MIN_SECRET_LENGTH = 4;
const SENSITIVE_HEADERS = new Set(ALWAYS_SENSITIVE_HEADERS);

/**
 * Keeps real credentials out of requests sent to a simulation backend. It records the secret
 * values that tools decrypt, and removes them wherever a node put them (URL path, query, body).
 */
export class OutboundRedactor {
	private readonly secrets = new Set<string>();

	/** Wraps a credentials helper so every decrypted secret is recorded. */
	wrap(helper: ICredentialsHelper): ICredentialsHelper {
		return new Proxy(helper, {
			get: (target, property, receiver) => {
				const value: unknown = Reflect.get(target, property, receiver);
				if (property !== 'getDecrypted' || typeof value !== 'function') {
					return typeof value === 'function' ? value.bind(target) : value;
				}
				return async (...args: unknown[]) => {
					const decrypted: unknown = await Reflect.apply(value, target, args);
					this.collect(decrypted);
					return decrypted;
				};
			},
		});
	}

	redact(request: OutboundRequest): OutboundRequest {
		const headers: Record<string, string> = {};
		for (const [name, value] of Object.entries(request.headers ?? {})) {
			if (SENSITIVE_HEADERS.has(name.toLowerCase()) || isSensitiveKey(name)) continue;
			headers[name] = this.scrub(value);
		}
		return {
			...request,
			url: this.redactUrl(request.url),
			headers,
			...(request.body === undefined ? {} : { body: this.redactValue(request.body) }),
		};
	}

	private collect(value: unknown, key?: string): void {
		if (typeof value === 'string') {
			if (key && isSensitiveKey(key) && value.length >= MIN_SECRET_LENGTH) this.secrets.add(value);
			return;
		}
		if (Array.isArray(value)) {
			for (const item of value) this.collect(item, key);
		} else if (isRecord(value)) {
			for (const [childKey, child] of Object.entries(value)) this.collect(child, childKey);
		}
	}

	private redactUrl(url: string): string {
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			return this.scrub(url);
		}
		parsed.username = '';
		parsed.password = '';
		for (const name of [...parsed.searchParams.keys()]) {
			if (isSensitiveKey(name)) parsed.searchParams.set(name, PLACEHOLDER);
		}
		return this.scrub(parsed.toString());
	}

	private redactValue(value: unknown, key?: string): unknown {
		if (key && isSensitiveKey(key)) return PLACEHOLDER;
		if (typeof value === 'string') return this.scrub(value);
		if (Array.isArray(value)) return value.map((item) => this.redactValue(item));
		if (isRecord(value)) {
			return Object.fromEntries(
				Object.entries(value).map(([childKey, child]) => [
					childKey,
					this.redactValue(child, childKey),
				]),
			);
		}
		return value;
	}

	private scrub(text: string): string {
		let out = text;
		for (const secret of this.secrets) {
			for (const form of new Set([secret, encodeURIComponent(secret)])) {
				out = out.split(form).join(PLACEHOLDER);
			}
		}
		return out;
	}
}
