import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeWorkflowSetupCard } from '../__tests__/factories';
import type { WorkflowSetupCard } from '../workflowSetup.types';
import { useWorkflowSetupSelections } from './useWorkflowSetupSelections';

interface TestCredential {
	id: string;
	type: string;
	name: string;
}

interface CredentialChangeListeners {
	onCredentialCreated?: (credential: TestCredential) => void;
	onCredentialUpdated?: (credential: TestCredential) => void;
	onCredentialDeleted?: (credentialId: string) => void;
}

const credentialsStore = vi.hoisted(() => ({
	credentials: new Map<string, TestCredential>(),
	credentialTestResults: new Map<string, string>(),
	getCredentialById: vi.fn((id: string) => credentialsStore.credentials.get(id)),
	isCredentialTestedOk: vi.fn(
		(id: string) => credentialsStore.credentialTestResults.get(id) === 'success',
	),
}));

const credentialListeners = vi.hoisted(() => ({
	current: null as CredentialChangeListeners | null,
	stop: vi.fn(),
}));

const credentialTest = vi.hoisted(() => ({
	testableTypes: new Set<string>(),
	isCredentialTypeTestable: vi.fn((type: string) => credentialTest.testableTypes.has(type)),
	testCredentialInBackground: vi.fn(),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => credentialsStore,
	listenForCredentialChanges: vi.fn((listeners: CredentialChangeListeners) => {
		credentialListeners.current = listeners;
		return credentialListeners.stop;
	}),
}));

vi.mock('@/features/credentials/composables/useCredentialTestInBackground', () => ({
	useCredentialTestInBackground: () => ({
		isCredentialTypeTestable: credentialTest.isCredentialTypeTestable,
		testCredentialInBackground: credentialTest.testCredentialInBackground,
	}),
}));

interface Harness {
	cardA: WorkflowSetupCard;
	cardB: WorkflowSetupCard;
	cardsRef: Ref<WorkflowSetupCard[]>;
	cards: ComputedRef<WorkflowSetupCard[]>;
	activeIndex: Ref<number>;
	selections: ReturnType<typeof useWorkflowSetupSelections>;
}

function addCredential(credential: TestCredential): void {
	credentialsStore.credentials.set(credential.id, credential);
}

function setupHarness(cards?: WorkflowSetupCard[]): Harness {
	const cardA = makeWorkflowSetupCard({
		id: 'HTTP Request:httpBasicAuth',
		targetNodeName: 'HTTP Request',
		credentialType: 'httpBasicAuth',
	});
	const cardB = makeWorkflowSetupCard({
		id: 'Slack:slackApi',
		targetNodeName: 'Slack',
		credentialType: 'slackApi',
	});
	const cardsRef = ref(cards ?? [cardA, cardB]);
	const cardsComputed = computed(() => cardsRef.value);
	const activeIndex = ref(0);
	const activeCard = computed(() => cardsComputed.value[activeIndex.value]);

	const selections = useWorkflowSetupSelections({
		cards: cardsComputed,
		activeCard,
	});

	return {
		cardA,
		cardB,
		cardsRef,
		cards: cardsComputed,
		activeIndex,
		selections,
	};
}

describe('useWorkflowSetupSelections', () => {
	beforeEach(() => {
		credentialsStore.credentials.clear();
		credentialsStore.credentialTestResults.clear();
		credentialsStore.getCredentialById.mockClear();
		credentialsStore.isCredentialTestedOk.mockClear();
		credentialListeners.current = null;
		credentialListeners.stop.mockClear();
		credentialTest.testableTypes.clear();
		credentialTest.isCredentialTypeTestable.mockClear();
		credentialTest.testCredentialInBackground.mockClear();
	});

	it('sets a selection, tests it in the background, and clears a previous skip', () => {
		addCredential({ id: 'cred-1', type: 'httpBasicAuth', name: 'HTTP credential' });
		const h = setupHarness();
		h.selections.markCardSkipped(h.cardA);

		h.selections.setSelection('HTTP Request', 'httpBasicAuth', 'cred-1');

		expect(h.selections.selections.value).toEqual({
			'HTTP Request': { httpBasicAuth: 'cred-1' },
		});
		expect(credentialTest.testCredentialInBackground).toHaveBeenCalledWith(
			'cred-1',
			'HTTP credential',
			'httpBasicAuth',
		);
		expect(h.selections.isCardSkipped(h.cardA)).toBe(false);
	});

	it('removes a selected credential when set to null', () => {
		const h = setupHarness();
		h.selections.setSelection('HTTP Request', 'httpBasicAuth', 'cred-1');

		h.selections.setSelection('HTTP Request', 'httpBasicAuth', null);

		expect(h.selections.selections.value).toEqual({ 'HTTP Request': {} });
		expect(h.selections.buildNodeCredentials()).toEqual({});
	});

	it('reports card completion based on testability and credential test result', () => {
		const h = setupHarness();

		expect(h.selections.isCardComplete(h.cardA)).toBe(false);

		h.selections.setSelection('HTTP Request', 'httpBasicAuth', 'cred-1');
		expect(h.selections.isCardComplete(h.cardA)).toBe(true);

		credentialTest.testableTypes.add('httpBasicAuth');
		expect(h.selections.isCardComplete(h.cardA)).toBe(false);

		credentialsStore.credentialTestResults.set('cred-1', 'success');
		expect(h.selections.isCardComplete(h.cardA)).toBe(true);
	});

	it('reports credential test failures only for selected testable credentials', () => {
		const h = setupHarness();
		h.selections.setSelection('HTTP Request', 'httpBasicAuth', 'cred-1');
		credentialsStore.credentialTestResults.set('cred-1', 'error');

		expect(h.selections.isCredentialTestFailed(h.cardA)).toBe(false);

		credentialTest.testableTypes.add('httpBasicAuth');
		expect(h.selections.isCredentialTestFailed(h.cardA)).toBe(true);
		expect(h.selections.isCredentialTestFailed(h.cardB)).toBe(false);
	});

	it('marks and clears skipped cards idempotently with immutable sets', () => {
		const h = setupHarness();
		const initialSet = h.selections.skippedCardIds.value;

		h.selections.markCardSkipped(h.cardA);
		const markedSet = h.selections.skippedCardIds.value;
		h.selections.markCardSkipped(h.cardA);

		expect(markedSet).not.toBe(initialSet);
		expect(h.selections.skippedCardIds.value).toBe(markedSet);
		expect(h.selections.isCardSkipped(h.cardA)).toBe(true);

		h.selections.clearCardSkipped(h.cardA);
		const clearedSet = h.selections.skippedCardIds.value;
		h.selections.clearCardSkipped(h.cardA);

		expect(clearedSet).not.toBe(markedSet);
		expect(h.selections.skippedCardIds.value).toBe(clearedSet);
		expect(h.selections.isCardSkipped(h.cardA)).toBe(false);
	});

	it('builds all selections and only completed selections separately', () => {
		const h = setupHarness();
		credentialTest.testableTypes.add('httpBasicAuth');
		h.selections.setSelection('HTTP Request', 'httpBasicAuth', 'cred-1');
		h.selections.setSelection('Slack', 'slackApi', 'cred-2');

		expect(h.selections.allCardsComplete()).toBe(false);
		expect(h.selections.buildNodeCredentials()).toEqual({
			'HTTP Request': { httpBasicAuth: 'cred-1' },
			Slack: { slackApi: 'cred-2' },
		});
		expect(h.selections.buildCompletedNodeCredentials()).toEqual({
			Slack: { slackApi: 'cred-2' },
		});

		credentialsStore.credentialTestResults.set('cred-1', 'success');

		expect(h.selections.allCardsComplete()).toBe(true);
		expect(h.selections.buildCompletedNodeCredentials()).toEqual({
			'HTTP Request': { httpBasicAuth: 'cred-1' },
			Slack: { slackApi: 'cred-2' },
		});
	});

	it('seeds selections from current credentials and tests seeded credentials', async () => {
		addCredential({ id: 'current-cred', type: 'httpBasicAuth', name: 'Current credential' });
		const card = makeWorkflowSetupCard({
			targetNodeName: 'HTTP Request',
			credentialType: 'httpBasicAuth',
			currentCredentialId: 'current-cred',
		});

		const h = setupHarness([card]);
		await nextTick();

		expect(h.selections.selections.value).toEqual({
			'HTTP Request': { httpBasicAuth: 'current-cred' },
		});
		expect(credentialTest.testCredentialInBackground).toHaveBeenCalledWith(
			'current-cred',
			'Current credential',
			'httpBasicAuth',
		);
	});

	it('does not overwrite an existing user selection when cards refresh', async () => {
		const h = setupHarness();
		h.selections.setSelection('HTTP Request', 'httpBasicAuth', 'user-cred');

		h.cardsRef.value = [
			{
				...h.cardA,
				currentCredentialId: 'refreshed-current-cred',
			},
		];
		await nextTick();

		expect(h.selections.selections.value).toEqual({
			'HTTP Request': { httpBasicAuth: 'user-cred' },
		});
	});

	it('prunes skipped card ids that no longer correspond to a card', async () => {
		const h = setupHarness();
		h.selections.markCardSkipped(h.cardA);
		h.selections.markCardSkipped(h.cardB);

		h.cardsRef.value = [h.cardB];
		await nextTick();

		expect(h.selections.isCardSkipped(h.cardA)).toBe(false);
		expect(h.selections.isCardSkipped(h.cardB)).toBe(true);
	});

	it('clears a skip when the skipped card later becomes complete', async () => {
		const h = setupHarness();
		credentialTest.testableTypes.add('httpBasicAuth');
		h.selections.setSelection('HTTP Request', 'httpBasicAuth', 'cred-1');
		h.selections.markCardSkipped(h.cardA);

		credentialsStore.credentialTestResults.set('cred-1', 'success');
		h.cardsRef.value = [...h.cardsRef.value];
		await nextTick();

		expect(h.selections.isCardSkipped(h.cardA)).toBe(false);
	});

	it('selects a newly created credential for the active matching card', () => {
		const h = setupHarness();

		credentialListeners.current?.onCredentialCreated?.({
			id: 'created-cred',
			type: 'httpBasicAuth',
			name: 'Created credential',
		});

		expect(h.selections.selections.value).toEqual({
			'HTTP Request': { httpBasicAuth: 'created-cred' },
		});
	});

	it('ignores created credentials that do not match the active card type', () => {
		const h = setupHarness();

		credentialListeners.current?.onCredentialCreated?.({
			id: 'created-cred',
			type: 'slackApi',
			name: 'Created credential',
		});

		expect(h.selections.selections.value).toEqual({});
	});

	it('clears selections that reference a deleted credential', () => {
		const h = setupHarness();
		h.selections.setSelection('HTTP Request', 'httpBasicAuth', 'deleted-cred');
		h.selections.setSelection('Slack', 'slackApi', 'other-cred');

		credentialListeners.current?.onCredentialDeleted?.('deleted-cred');

		expect(h.selections.selections.value).toEqual({
			'HTTP Request': {},
			Slack: { slackApi: 'other-cred' },
		});
	});
});
