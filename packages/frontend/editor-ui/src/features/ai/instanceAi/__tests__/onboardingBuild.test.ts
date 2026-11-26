import { afterEach, describe, expect, it, vi } from 'vitest';
import { post } from '@n8n/rest-api-client';
import {
	claimOnboardingBuild,
	reserveOnboardingBuildSend,
} from '@/features/ai/instanceAi/onboardingBuild';
import { parseOnboardingHandoff } from '@/features/ai/instanceAi/onboardingHandoff';

vi.mock('@n8n/rest-api-client', () => ({ post: vi.fn() }));

const id = '20000000-0000-4000-8000-000000000000';
const other = '30000000-0000-4000-8000-000000000000';

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	sessionStorage.clear();
	localStorage.clear();
});

describe('Cloud onboarding build', () => {
	it('only recognizes an opaque UUIDv4 in the dedicated fragment', () => {
		expect(parseOnboardingHandoff(`#onboardingBuild=${id}`)).toEqual({ id, isDraft: false });
		expect(parseOnboardingHandoff(`#onboardingDraft=${id}`)).toEqual({ id, isDraft: true });
		for (const hash of [
			undefined,
			'',
			'#onboardingBuild=Build%20my%20workflow',
			'#onboardingDraft=Build%20my%20workflow',
			`#onboardingDraft=${id}&mode=send`,
			`#onboardingBuild=${id}&prompt=untrusted`,
			`?onboardingBuild=${id}`,
		]) {
			expect(parseOnboardingHandoff(hash)).toBeUndefined();
		}
	});

	it('retries the same owner claim after a lost response and never writes the prompt to storage', async () => {
		vi.mocked(post)
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValue({ prompt: 'Build the approved workflow' });
		await expect(claimOnboardingBuild('/rest', id)).rejects.toThrow('offline');
		expect(await claimOnboardingBuild('/rest', id)).toEqual({
			prompt: 'Build the approved workflow',
		});
		const first = vi.mocked(post).mock.calls[0];
		expect(first).toEqual([
			'/rest',
			'/cloud/proxy/onboarding-prompt/claim',
			{ id, claimId: expect.stringMatching(/^[a-f0-9-]{36}$/) },
		]);
		expect(vi.mocked(post).mock.calls[1]).toEqual(first);
		expect(JSON.stringify(sessionStorage)).not.toContain('Build the approved workflow');
		await claimOnboardingBuild('/rest', other);
		expect(vi.mocked(post).mock.calls[2][2]?.claimId).not.toBe(first[2]?.claimId);
	});

	it('respects the server-bound draft intent', async () => {
		vi.mocked(post).mockResolvedValue({ prompt: 'Plan this', intent: 'draft' });
		await expect(claimOnboardingBuild('/rest', id)).resolves.toEqual({
			prompt: 'Plan this',
			intent: 'draft',
		});
	});

	it.each([
		{},
		{ prompt: '   ' },
		{ prompt: 'x'.repeat(16001) },
		{ prompt: 'Plan this', intent: 'other' },
	])('rejects an invalid claim response', async (response) => {
		vi.mocked(post).mockResolvedValue(response);
		await expect(claimOnboardingBuild('/rest', id)).rejects.toThrow('Invalid onboarding prompt');
	});

	it('grants one automatic submit across duplicated tabs for each approved build', async () => {
		vi.stubGlobal('navigator', {
			locks: { request: async (_key: string, take: () => boolean) => take() },
		});
		expect(await reserveOnboardingBuildSend(id)).toBe(true);
		expect(await reserveOnboardingBuildSend(id)).toBe(false);
		expect(await reserveOnboardingBuildSend(other)).toBe(true);
		expect(await reserveOnboardingBuildSend(id)).toBe(false);
	});

	it('leaves submission manual if a shared send receipt is unavailable', async () => {
		vi.stubGlobal('navigator', {});
		expect(await reserveOnboardingBuildSend(id)).toBe(false);
	});

	it('prunes old receipts when the next build is reserved', async () => {
		vi.useFakeTimers();
		try {
			vi.stubGlobal('navigator', {
				locks: { request: async (_key: string, take: () => boolean) => take() },
			});
			expect(await reserveOnboardingBuildSend(id)).toBe(true);
			vi.advanceTimersByTime(16 * 60_000);
			expect(await reserveOnboardingBuildSend(other)).toBe(true);
			expect(JSON.stringify(localStorage)).not.toContain(id);
		} finally {
			vi.useRealTimers();
		}
	});
});
