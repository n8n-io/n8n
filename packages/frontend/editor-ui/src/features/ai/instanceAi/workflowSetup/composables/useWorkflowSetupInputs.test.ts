import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeWorkflowSetupCard } from '../__tests__/factories';
import type { WorkflowSetupCard } from '../workflowSetup.types';
import { useWorkflowSetupInputs } from './useWorkflowSetupInputs';

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

const nodeTypesStore = vi.hoisted(() => ({
	getNodeType: vi.fn((): unknown => null),
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

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => nodeTypesStore,
}));

interface Harness {
	cardA: WorkflowSetupCard;
	cardB: WorkflowSetupCard;
	cardsRef: Ref<WorkflowSetupCard[]>;
	cards: ComputedRef<WorkflowSetupCard[]>;
	activeIndex: Ref<number>;
	inputs: ReturnType<typeof useWorkflowSetupInputs>;
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

	const inputs = useWorkflowSetupInputs({
		cards: cardsComputed,
		activeCard,
	});

	return {
		cardA,
		cardB,
		cardsRef,
		cards: cardsComputed,
		activeIndex,
		inputs,
	};
}

describe('useWorkflowSetupInputs', () => {
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
		nodeTypesStore.getNodeType.mockReset();
		nodeTypesStore.getNodeType.mockReturnValue(null);
	});

	it('sets a selection, tests it in the background, and clears a previous skip', () => {
		addCredential({ id: 'cred-1', type: 'httpBasicAuth', name: 'HTTP credential' });
		const h = setupHarness();
		h.inputs.markCardSkipped(h.cardA);

		h.inputs.setSelection('HTTP Request', 'httpBasicAuth', 'cred-1');

		expect(h.inputs.selections.value).toEqual({
			'HTTP Request': { httpBasicAuth: 'cred-1' },
		});
		expect(credentialTest.testCredentialInBackground).toHaveBeenCalledWith(
			'cred-1',
			'HTTP credential',
			'httpBasicAuth',
		);
		expect(h.inputs.isCardSkipped(h.cardA)).toBe(false);
	});

	it('removes a selected credential when set to null', () => {
		const h = setupHarness();
		h.inputs.setSelection('HTTP Request', 'httpBasicAuth', 'cred-1');

		h.inputs.setSelection('HTTP Request', 'httpBasicAuth', null);

		expect(h.inputs.selections.value).toEqual({ 'HTTP Request': {} });
		expect(h.inputs.buildCompletedSetupPayload()).toEqual({});
	});

	it('reports card completion based on testability and credential test result', () => {
		const h = setupHarness();

		expect(h.inputs.isCardComplete(h.cardA)).toBe(false);

		h.inputs.setSelection('HTTP Request', 'httpBasicAuth', 'cred-1');
		expect(h.inputs.isCardComplete(h.cardA)).toBe(true);

		credentialTest.testableTypes.add('httpBasicAuth');
		expect(h.inputs.isCardComplete(h.cardA)).toBe(false);

		credentialsStore.credentialTestResults.set('cred-1', 'success');
		expect(h.inputs.isCardComplete(h.cardA)).toBe(true);
	});

	it('reports credential test failures only for selected testable credentials', () => {
		const h = setupHarness();
		h.inputs.setSelection('HTTP Request', 'httpBasicAuth', 'cred-1');
		credentialsStore.credentialTestResults.set('cred-1', 'error');

		expect(h.inputs.isCredentialTestFailed(h.cardA)).toBe(false);

		credentialTest.testableTypes.add('httpBasicAuth');
		expect(h.inputs.isCredentialTestFailed(h.cardA)).toBe(true);
		expect(h.inputs.isCredentialTestFailed(h.cardB)).toBe(false);
	});

	it('marks and clears skipped cards idempotently', () => {
		const h = setupHarness();

		h.inputs.markCardSkipped(h.cardA);
		h.inputs.markCardSkipped(h.cardA);

		expect(h.inputs.isCardSkipped(h.cardA)).toBe(true);
		expect(h.inputs.skippedCardIds.value).toEqual(new Set([h.cardA.id]));

		h.inputs.clearCardSkipped(h.cardA);
		h.inputs.clearCardSkipped(h.cardA);

		expect(h.inputs.isCardSkipped(h.cardA)).toBe(false);
		expect(h.inputs.skippedCardIds.value).toEqual(new Set());
	});

	it('builds only completed selections into the payload', () => {
		const h = setupHarness();
		credentialTest.testableTypes.add('httpBasicAuth');
		h.inputs.setSelection('HTTP Request', 'httpBasicAuth', 'cred-1');
		h.inputs.setSelection('Slack', 'slackApi', 'cred-2');

		expect(h.inputs.allCardsComplete()).toBe(false);
		expect(h.inputs.buildCompletedSetupPayload()).toEqual({
			nodeCredentials: {
				Slack: { slackApi: 'cred-2' },
			},
		});

		credentialsStore.credentialTestResults.set('cred-1', 'success');

		expect(h.inputs.allCardsComplete()).toBe(true);
		expect(h.inputs.buildCompletedSetupPayload()).toEqual({
			nodeCredentials: {
				'HTTP Request': { httpBasicAuth: 'cred-1' },
				Slack: { slackApi: 'cred-2' },
			},
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

		expect(h.inputs.selections.value).toEqual({
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
		h.inputs.setSelection('HTTP Request', 'httpBasicAuth', 'user-cred');

		h.cardsRef.value = [
			{
				...h.cardA,
				currentCredentialId: 'refreshed-current-cred',
			},
		];
		await nextTick();

		expect(h.inputs.selections.value).toEqual({
			'HTTP Request': { httpBasicAuth: 'user-cred' },
		});
	});

	it('prunes skipped card ids that no longer correspond to a card', async () => {
		const h = setupHarness();
		h.inputs.markCardSkipped(h.cardA);
		h.inputs.markCardSkipped(h.cardB);

		h.cardsRef.value = [h.cardB];
		await nextTick();

		expect(h.inputs.isCardSkipped(h.cardA)).toBe(false);
		expect(h.inputs.isCardSkipped(h.cardB)).toBe(true);
	});

	it('clears a skip when the skipped card later becomes complete', async () => {
		const h = setupHarness();
		credentialTest.testableTypes.add('httpBasicAuth');
		h.inputs.setSelection('HTTP Request', 'httpBasicAuth', 'cred-1');
		h.inputs.markCardSkipped(h.cardA);

		credentialsStore.credentialTestResults.set('cred-1', 'success');
		h.cardsRef.value = [...h.cardsRef.value];
		await nextTick();

		expect(h.inputs.isCardSkipped(h.cardA)).toBe(false);
	});

	it('selects a newly created credential for the active matching card', () => {
		const h = setupHarness();

		credentialListeners.current?.onCredentialCreated?.({
			id: 'created-cred',
			type: 'httpBasicAuth',
			name: 'Created credential',
		});

		expect(h.inputs.selections.value).toEqual({
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

		expect(h.inputs.selections.value).toEqual({});
	});

	it('clears selections that reference a deleted credential', () => {
		const h = setupHarness();
		h.inputs.setSelection('HTTP Request', 'httpBasicAuth', 'deleted-cred');
		h.inputs.setSelection('Slack', 'slackApi', 'other-cred');

		credentialListeners.current?.onCredentialDeleted?.('deleted-cred');

		expect(h.inputs.selections.value).toEqual({
			'HTTP Request': {},
			Slack: { slackApi: 'other-cred' },
		});
	});

	it('tracks parameter values and builds nodeParameters after issues clear', () => {
		nodeTypesStore.getNodeType.mockReturnValue({
			name: 'n8n-nodes-base.httpRequest',
			properties: [
				{ displayName: 'URL', name: 'url', type: 'string', default: '', required: true },
			],
		});
		const parameterCard = makeWorkflowSetupCard({
			id: 'HTTP Request:parameters',
			credentialType: undefined,
			parameterNames: ['url'],
			node: { parameters: { url: '' } },
		});
		const h = setupHarness([parameterCard]);

		expect(h.inputs.isCardComplete(parameterCard)).toBe(false);

		h.inputs.setParameterValue(parameterCard, 'url', 'https://example.com/api');

		expect(h.inputs.isCardComplete(parameterCard)).toBe(true);
		expect(h.inputs.buildCompletedSetupPayload()).toEqual({
			nodeParameters: {
				'HTTP Request': { url: 'https://example.com/api' },
			},
		});
	});

	it('updates nested parameter values without flattening the path', () => {
		const parameterCard = makeWorkflowSetupCard({
			id: 'HTTP Request:parameters',
			credentialType: undefined,
			parameterNames: ['options'],
			node: { parameters: { options: { path: 'old', keep: true } } },
		});
		const h = setupHarness([parameterCard]);

		h.inputs.setParameterValue(parameterCard, 'options.path', 'new');

		expect(h.inputs.getDisplayNode(parameterCard).parameters).toEqual({
			options: { path: 'new', keep: true },
		});
		expect(
			Object.prototype.hasOwnProperty.call(
				h.inputs.parameterValues.value['HTTP Request'],
				'options.path',
			),
		).toBe(false);
		expect(parameterCard.node.parameters).toEqual({ options: { path: 'old', keep: true } });
		expect(h.inputs.buildCompletedSetupPayload()).toEqual({
			nodeParameters: {
				'HTTP Request': { options: { path: 'new', keep: true } },
			},
		});
	});
});
