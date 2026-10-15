import { effectScope, nextTick, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { WhatsAppAccountStatus } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';

import { getWhatsAppAccountStatus } from './api';
import {
	ACCOUNT_STATUS_POLL_MS,
	isAccountStatusSettled,
	useWhatsAppAccountStatus,
	useWhatsAppAccountWarnings,
} from './useWhatsAppAccountStatus';

vi.mock('./api', () => ({
	getWhatsAppAccountStatus: vi.fn(),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const getStatus = vi.mocked(getWhatsAppAccountStatus);

const ready: WhatsAppAccountStatus = {
	sending: 'available',
	reasons: [],
	displayName: 'approved',
	businessVerification: 'approved',
	accountReview: 'approved',
	sandbox: false,
};
const inReview: WhatsAppAccountStatus = { ...ready, sending: 'limited', displayName: 'pending' };

let credentialCounter = 0;

/** Each test uses its own credential, because the status cache is shared. */
function setup(options: { poll?: boolean; enabled?: boolean } = {}) {
	const credentialId = ref(`cred-${++credentialCounter}`);
	const enabled = ref(options.enabled ?? true);
	const scope = effectScope();
	const result = scope.run(() =>
		useWhatsAppAccountStatus({
			projectId: 'project-1',
			agentId: 'agent-1',
			credentialId,
			enabled,
			poll: options.poll,
		}),
	)!;
	return { ...result, credentialId, enabled, scope };
}

describe('useWhatsAppAccountStatus', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		getStatus.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('polls until the number can send and no review is pending, then stops', async () => {
		getStatus.mockResolvedValueOnce(inReview).mockResolvedValueOnce(ready);
		const { status, scope } = setup({ poll: true });

		await vi.advanceTimersByTimeAsync(0);
		expect(status.value).toEqual(inReview);

		await vi.advanceTimersByTimeAsync(ACCOUNT_STATUS_POLL_MS);
		expect(status.value).toEqual(ready);

		await vi.advanceTimersByTimeAsync(ACCOUNT_STATUS_POLL_MS * 3);
		expect(getStatus).toHaveBeenCalledTimes(2);
		scope.stop();
	});

	it('asks once without polling', async () => {
		getStatus.mockResolvedValue(inReview);
		const { scope } = setup();

		await vi.advanceTimersByTimeAsync(ACCOUNT_STATUS_POLL_MS * 3);

		expect(getStatus).toHaveBeenCalledTimes(1);
		scope.stop();
	});

	it('stops polling when the caller unmounts', async () => {
		getStatus.mockResolvedValue(inReview);
		const { scope } = setup({ poll: true });
		await vi.advanceTimersByTimeAsync(0);

		scope.stop();
		await vi.advanceTimersByTimeAsync(ACCOUNT_STATUS_POLL_MS * 3);

		expect(getStatus).toHaveBeenCalledTimes(1);
	});

	it('does not ask while disabled, and asks once enabled', async () => {
		getStatus.mockResolvedValue(ready);
		const { enabled, status, scope } = setup({ enabled: false });
		await vi.advanceTimersByTimeAsync(0);
		expect(getStatus).not.toHaveBeenCalled();
		expect(status.value).toBeNull();

		enabled.value = true;
		await nextTick();
		await vi.advanceTimersByTimeAsync(0);

		expect(getStatus).toHaveBeenCalledTimes(1);
		expect(status.value).toEqual(ready);
		scope.stop();
	});

	it('stops polling when the credential is not found', async () => {
		getStatus.mockRejectedValue(new ResponseError('Not found', { httpStatusCode: 404 }));
		const { scope } = setup({ poll: true });

		await vi.advanceTimersByTimeAsync(ACCOUNT_STATUS_POLL_MS * 3);

		expect(getStatus).toHaveBeenCalledTimes(1);
		scope.stop();
	});

	it('keeps polling after another error', async () => {
		getStatus.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(ready);
		const { status, scope } = setup({ poll: true });

		await vi.advanceTimersByTimeAsync(ACCOUNT_STATUS_POLL_MS);

		expect(status.value).toEqual(ready);
		scope.stop();
	});

	it('shares one request between callers that ask at the same time', async () => {
		getStatus.mockResolvedValue(ready);
		const credentialId = `cred-${++credentialCounter}`;
		const scope = effectScope();
		const [first, second] = scope.run(() => [
			useWhatsAppAccountStatus({
				projectId: 'project-1',
				agentId: 'agent-1',
				credentialId,
				enabled: true,
			}),
			useWhatsAppAccountStatus({
				projectId: 'project-1',
				agentId: 'agent-1',
				credentialId,
				enabled: true,
			}),
		])!;

		await vi.advanceTimersByTimeAsync(0);

		expect(getStatus).toHaveBeenCalledTimes(1);
		expect(first.status.value).toEqual(ready);
		expect(second.status.value).toEqual(ready);
		scope.stop();
	});
});

describe('isAccountStatusSettled', () => {
	it.each([
		['ready', ready, true],
		['a pending display name', inReview, false],
		['a blocked number', { ...ready, sending: 'blocked' as const }, false],
		['an unverified business', { ...ready, businessVerification: 'notStarted' as const }, true],
	])('treats %s as settled: %s', (_label, status, expected) => {
		expect(isAccountStatusSettled(status)).toBe(expected);
	});
});

describe('useWhatsAppAccountWarnings', () => {
	it('warns about a blocked number and each pending or declined review', () => {
		const warnings = useWhatsAppAccountWarnings({
			...ready,
			sending: 'blocked',
			displayName: 'pending',
			businessVerification: 'rejected',
			accountReview: 'notStarted',
		});

		expect(warnings.value).toEqual([
			'agents.channels.whatsapp.status.warning.blocked',
			'agents.channels.whatsapp.status.warning.displayName.pending',
			'agents.channels.whatsapp.status.warning.businessVerification.rejected',
		]);
	});

	it('does not warn about a test number that is ready', () => {
		expect(useWhatsAppAccountWarnings({ ...ready, sandbox: true }).value).toEqual([]);
	});
});
