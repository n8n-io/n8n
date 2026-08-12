import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick, ref, type EffectScope, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';

import { INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS } from '../../constants';

const mocks = vi.hoisted(() => ({
	openWithSeed: vi.fn(),
	isOpen: false,
	activeThreadId: null as string | null,
	isStreaming: false,
	isSendingMessage: false,
	instanceAiAvailable: true,
}));

vi.mock('../useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => computed(() => mocks.instanceAiAvailable),
}));

vi.mock('../../instanceAiPanel.store', () => ({
	useInstanceAiPanelStore: () => ({
		get isOpen() {
			return mocks.isOpen;
		},
		get activeThreadId() {
			return mocks.activeThreadId;
		},
		openWithSeed: mocks.openWithSeed,
	}),
}));

vi.mock('../../instanceAi.store', () => ({
	useInstanceAiStore: () => ({
		getRuntime: () => undefined,
	}),
}));

import {
	resetInstanceAiProactiveOfferStateForTests,
	useInstanceAiProactiveOffer,
} from '../useInstanceAiProactiveOffer';
import {
	useInstanceAiCredentialErrorOffer,
	type CredentialTestFailure,
} from '../useInstanceAiCredentialErrorOffer';

const failedTest: CredentialTestFailure = {
	credentialType: 'slackApi',
	displayName: 'Slack API',
	nodeName: 'Send message',
	errorMessage: 'invalid_auth',
	credentialId: 'cred-1',
};

describe('useInstanceAiCredentialErrorOffer', () => {
	let scope: EffectScope;

	function watchCredential(source: Ref<CredentialTestFailure | null>) {
		scope = effectScope();
		scope.run(() => useInstanceAiCredentialErrorOffer(source));
	}

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		localStorage.clear();
		mocks.isOpen = false;
		mocks.instanceAiAvailable = true;
		resetInstanceAiProactiveOfferStateForTests();
	});

	afterEach(() => {
		scope?.stop();
	});

	it('offers to explain the error once the user has settled on it', () => {
		watchCredential(ref<CredentialTestFailure | null>(failedTest));
		const { activeOffer } = useInstanceAiProactiveOffer();

		expect(activeOffer.value).toBeNull();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toMatchObject({
			key: 'credential-error:slackApi:cred-1:invalid_auth',
			source: 'proactive_offer',
		});
		expect(activeOffer.value?.title).toBe(
			useI18n().baseText('instanceAi.proactiveOffer.credentialError.title'),
		);
	});

	it('drafts an ask for an explanation, not a fix', () => {
		watchCredential(ref<CredentialTestFailure | null>(failedTest));
		const { activeOffer } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		// The agent can't resolve a 401 — it never sees the user's API key.
		expect(activeOffer.value?.message).toContain(
			'Explain what this error means and what I need to change',
		);
		expect(activeOffer.value?.message).toContain('<context type="credential-error">');
		expect(activeOffer.value?.message).toContain('credential: Slack API (type: slackApi)');
		expect(activeOffer.value?.message).toContain('credential id: cred-1');
		expect(activeOffer.value?.message).toContain('node: Send message');
		expect(activeOffer.value?.message).toContain('message: invalid_auth');
	});

	it('stays quiet when no test has failed', () => {
		watchCredential(ref<CredentialTestFailure | null>(null));
		const { activeOffer } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toBeNull();
	});

	it('withdraws an offer still in its dwell once the retest passes', async () => {
		const source = ref<CredentialTestFailure | null>(failedTest);
		watchCredential(source);
		const { activeOffer } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS - 500);
		source.value = null;
		await nextTick();
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		// Otherwise it surfaces seconds later to explain an error already fixed.
		expect(activeOffer.value).toBeNull();
	});

	it('withdraws an offer already on screen once the retest passes', async () => {
		const source = ref<CredentialTestFailure | null>(failedTest);
		watchCredential(source);
		const { activeOffer } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);
		expect(activeOffer.value).not.toBeNull();

		source.value = null;
		await nextTick();

		expect(activeOffer.value).toBeNull();
	});

	it('does not re-offer while the same failure repeats', async () => {
		const source = ref<CredentialTestFailure | null>(failedTest);
		watchCredential(source);
		const { activeOffer, clear } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);
		expect(activeOffer.value).not.toBeNull();
		clear();

		source.value = { ...failedTest };
		await nextTick();
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value).toBeNull();
	});

	it('offers again when the credential starts failing differently', async () => {
		const source = ref<CredentialTestFailure | null>(failedTest);
		watchCredential(source);
		const { activeOffer, clear } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);
		clear();

		source.value = { ...failedTest, errorMessage: '429 Too Many Requests' };
		await nextTick();
		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value?.key).toBe('credential-error:slackApi:cred-1:429 too many requests');
	});

	it('keys by display name when the credential has no id yet', () => {
		const { credentialId, ...withoutId } = failedTest;
		watchCredential(ref<CredentialTestFailure | null>(withoutId));
		const { activeOffer } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		expect(activeOffer.value?.key).toBe('credential-error:slackApi:Slack API:invalid_auth');
		expect(activeOffer.value?.message).not.toContain('credential id:');
	});

	it('never carries credential data', () => {
		watchCredential(
			ref<CredentialTestFailure | null>({
				...failedTest,
				errorMessage: 'invalid_auth',
			}),
		);
		const { activeOffer } = useInstanceAiProactiveOffer();

		vi.advanceTimersByTime(INSTANCE_AI_PROACTIVE_OFFER_DWELL_MS);

		// The shape has no field for it; this pins that no caller can smuggle one in.
		expect(Object.keys(failedTest)).toEqual([
			'credentialType',
			'displayName',
			'nodeName',
			'errorMessage',
			'credentialId',
		]);
		expect(activeOffer.value?.message).not.toMatch(/sk-|apiKey|token|password/i);
	});
});
