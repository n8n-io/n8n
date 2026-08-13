import type { LookupFunction } from 'node:net';
import { vi } from 'vitest';

import type { SsrfBridge } from '..';

export function makeLookupFn(): LookupFunction {
	return vi.fn() as unknown as LookupFunction;
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
