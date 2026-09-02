import type dns from 'node:dns';
import type { LookupFunction } from 'node:net';
import { afterEach, beforeEach, vi, type Mock } from 'vitest';

import type { SsrfBridge } from '..';

export function makeLookupFn(): LookupFunction {
	return vi.fn() as unknown as LookupFunction;
}

/** A `lookup` that fails every resolution with `error`. */
export function makeDenyingLookup(error: Error): LookupFunction & Mock {
	return vi.fn((_hostname: string, options: dns.LookupOptions, onResult: unknown) => {
		(onResult as (error: Error | null, address?: unknown, family?: number) => void)(
			error,
			options.all ? [] : '',
			undefined,
		);
	}) as unknown as LookupFunction & Mock;
}

const PROXY_ENV_KEYS = [
	'HTTP_PROXY',
	'http_proxy',
	'HTTPS_PROXY',
	'https_proxy',
	'NO_PROXY',
	'no_proxy',
	'ALL_PROXY',
	'all_proxy',
] as const;

/** Clears the proxy environment around each test and restores it afterwards. */
export function useCleanProxyEnv(): void {
	const savedEnv: Record<string, string | undefined> = {};

	beforeEach(() => {
		for (const key of PROXY_ENV_KEYS) {
			savedEnv[key] = process.env[key];
			delete process.env[key];
		}
	});

	afterEach(() => {
		for (const key of PROXY_ENV_KEYS) {
			if (savedEnv[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = savedEnv[key];
			}
		}
	});
}

export function makeSsrfBridge(overrides?: Partial<SsrfBridge>): SsrfBridge {
	return {
		validateUrl: vi.fn().mockResolvedValue({ ok: true, result: undefined }),
		validateIp: vi.fn().mockReturnValue({ ok: true, result: undefined }),
		validateConnectionHost: vi.fn().mockReturnValue({ ok: true, result: undefined }),
		validateRedirectSync: vi.fn(),
		createSecureLookup: vi.fn().mockReturnValue(makeLookupFn()),
		...overrides,
	};
}
