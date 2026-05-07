import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeWorkflowSetupSection } from '../__tests__/factories';
import type { WorkflowSetupSection } from '../workflowSetup.types';
import { useWorkflowSetupInputs } from './useWorkflowSetupInputs';

interface TestCredential {
	id: string;
	type: string;
	name: string;
}

const credentialsStore = vi.hoisted(() => ({
	credentials: new Map<string, TestCredential>(),
	credentialTestResults: new Map<string, string>(),
	getCredentialById: vi.fn((id: string) => credentialsStore.credentials.get(id)),
	isCredentialTestedOk: vi.fn(
		(id: string) => credentialsStore.credentialTestResults.get(id) === 'success',
	),
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
	sectionA: WorkflowSetupSection;
	sectionB: WorkflowSetupSection;
	sectionsRef: Ref<WorkflowSetupSection[]>;
	sections: ComputedRef<WorkflowSetupSection[]>;
	inputs: ReturnType<typeof useWorkflowSetupInputs>;
}

function addCredential(credential: TestCredential): void {
	credentialsStore.credentials.set(credential.id, credential);
}

function setupHarness(sections?: WorkflowSetupSection[]): Harness {
	const sectionA = makeWorkflowSetupSection({
		id: 'HTTP Request:httpBasicAuth',
		targetNodeName: 'HTTP Request',
		credentialType: 'httpBasicAuth',
	});
	const sectionB = makeWorkflowSetupSection({
		id: 'Slack:slackApi',
		targetNodeName: 'Slack',
		credentialType: 'slackApi',
	});
	const sectionsRef = ref(sections ?? [sectionA, sectionB]);
	const sectionsComputed = computed(() => sectionsRef.value);

	const inputs = useWorkflowSetupInputs({
		sections: sectionsComputed,
	});

	return {
		sectionA,
		sectionB,
		sectionsRef,
		sections: sectionsComputed,
		inputs,
	};
}

describe('useWorkflowSetupInputs', () => {
	beforeEach(() => {
		credentialsStore.credentials.clear();
		credentialsStore.credentialTestResults.clear();
		credentialsStore.getCredentialById.mockClear();
		credentialsStore.isCredentialTestedOk.mockClear();
		credentialTest.testableTypes.clear();
		credentialTest.isCredentialTypeTestable.mockClear();
		credentialTest.testCredentialInBackground.mockClear();
		nodeTypesStore.getNodeType.mockReset();
		nodeTypesStore.getNodeType.mockReturnValue(null);
	});

	it('sets a selection, tests it in the background, and clears a previous skip', () => {
		addCredential({ id: 'cred-1', type: 'httpBasicAuth', name: 'HTTP credential' });
		const h = setupHarness();
		h.inputs.markSectionSkipped(h.sectionA);

		h.inputs.setCredential(h.sectionA, 'cred-1');

		expect(h.inputs.credentialSelections.value).toEqual({
			'HTTP Request': { httpBasicAuth: 'cred-1' },
		});
		expect(credentialTest.testCredentialInBackground).toHaveBeenCalledWith(
			'cred-1',
			'HTTP credential',
			'httpBasicAuth',
		);
		expect(h.inputs.isSectionSkipped(h.sectionA)).toBe(false);
	});

	it('removes a selected credential when set to null', () => {
		const h = setupHarness();
		h.inputs.setCredential(h.sectionA, 'cred-1');

		h.inputs.setCredential(h.sectionA, null);

		expect(h.inputs.credentialSelections.value).toEqual({ 'HTTP Request': {} });
		expect(h.inputs.buildCompletedSetupPayload()).toEqual({});
	});

	it('reports section completion based on testability and credential test result', () => {
		const h = setupHarness();

		expect(h.inputs.isSectionComplete(h.sectionA)).toBe(false);

		h.inputs.setCredential(h.sectionA, 'cred-1');
		expect(h.inputs.isSectionComplete(h.sectionA)).toBe(true);

		credentialTest.testableTypes.add('httpBasicAuth');
		expect(h.inputs.isSectionComplete(h.sectionA)).toBe(false);

		credentialsStore.credentialTestResults.set('cred-1', 'success');
		expect(h.inputs.isSectionComplete(h.sectionA)).toBe(true);
	});

	it('reports credential test failures only for selected testable credentials', () => {
		const h = setupHarness();
		h.inputs.setCredential(h.sectionA, 'cred-1');
		credentialsStore.credentialTestResults.set('cred-1', 'error');

		expect(h.inputs.isCredentialTestFailed(h.sectionA)).toBe(false);

		credentialTest.testableTypes.add('httpBasicAuth');
		expect(h.inputs.isCredentialTestFailed(h.sectionA)).toBe(true);
		expect(h.inputs.isCredentialTestFailed(h.sectionB)).toBe(false);
	});

	it('marks skipped sections idempotently and clears them when input is provided', () => {
		const h = setupHarness();

		h.inputs.markSectionSkipped(h.sectionA);
		h.inputs.markSectionSkipped(h.sectionA);

		expect(h.inputs.isSectionSkipped(h.sectionA)).toBe(true);
		expect(h.inputs.skippedSectionIds.value).toEqual(new Set([h.sectionA.id]));

		h.inputs.setCredential(h.sectionA, 'cred-1');

		expect(h.inputs.isSectionSkipped(h.sectionA)).toBe(false);
		expect(h.inputs.skippedSectionIds.value).toEqual(new Set());
	});

	it('builds only completed selections into the payload', () => {
		const h = setupHarness();
		credentialTest.testableTypes.add('httpBasicAuth');
		h.inputs.setCredential(h.sectionA, 'cred-1');
		h.inputs.setCredential(h.sectionB, 'cred-2');

		expect(h.inputs.buildCompletedSetupPayload()).toEqual({
			nodeCredentials: {
				Slack: { slackApi: 'cred-2' },
			},
		});

		credentialsStore.credentialTestResults.set('cred-1', 'success');

		expect(h.inputs.buildCompletedSetupPayload()).toEqual({
			nodeCredentials: {
				'HTTP Request': { httpBasicAuth: 'cred-1' },
				Slack: { slackApi: 'cred-2' },
			},
		});
	});

	it('seeds selections from current credentials and tests seeded credentials', async () => {
		addCredential({ id: 'current-cred', type: 'httpBasicAuth', name: 'Current credential' });
		const section = makeWorkflowSetupSection({
			targetNodeName: 'HTTP Request',
			credentialType: 'httpBasicAuth',
			currentCredentialId: 'current-cred',
		});

		const h = setupHarness([section]);
		await nextTick();

		expect(h.inputs.credentialSelections.value).toEqual({
			'HTTP Request': { httpBasicAuth: 'current-cred' },
		});
		expect(credentialTest.testCredentialInBackground).toHaveBeenCalledWith(
			'current-cred',
			'Current credential',
			'httpBasicAuth',
		);
	});

	it('does not overwrite an existing user selection when sections refresh', async () => {
		const h = setupHarness();
		h.inputs.setCredential(h.sectionA, 'user-cred');

		h.sectionsRef.value = [
			{
				...h.sectionA,
				currentCredentialId: 'refreshed-current-cred',
			},
		];
		await nextTick();

		expect(h.inputs.credentialSelections.value).toEqual({
			'HTTP Request': { httpBasicAuth: 'user-cred' },
		});
	});

	it('does not re-seed a credential after the user explicitly clears it', async () => {
		addCredential({ id: 'current-cred', type: 'httpBasicAuth', name: 'Current credential' });
		const section = makeWorkflowSetupSection({
			targetNodeName: 'HTTP Request',
			credentialType: 'httpBasicAuth',
			currentCredentialId: 'current-cred',
		});

		const h = setupHarness([section]);
		await nextTick();

		expect(h.inputs.credentialSelections.value).toEqual({
			'HTTP Request': { httpBasicAuth: 'current-cred' },
		});

		h.inputs.setCredential(section, null);
		expect(h.inputs.credentialSelections.value).toEqual({ 'HTTP Request': {} });

		// Sections re-emit with the same content (e.g. due to upstream reactive recomputation).
		h.sectionsRef.value = [...h.sectionsRef.value];
		await nextTick();

		expect(h.inputs.credentialSelections.value).toEqual({ 'HTTP Request': {} });
	});

	it('seeds only newly added sections without overwriting existing user selections', async () => {
		addCredential({ id: 'b-cred', type: 'slackApi', name: 'B credential' });
		const h = setupHarness();

		h.inputs.setCredential(h.sectionA, 'user-cred-a');

		const sectionC = makeWorkflowSetupSection({
			id: 'GitHub:githubApi',
			targetNodeName: 'GitHub',
			credentialType: 'githubApi',
			currentCredentialId: 'github-cred',
		});
		addCredential({ id: 'github-cred', type: 'githubApi', name: 'GitHub credential' });

		h.sectionsRef.value = [...h.sectionsRef.value, sectionC];
		await nextTick();

		expect(h.inputs.credentialSelections.value).toEqual({
			'HTTP Request': { httpBasicAuth: 'user-cred-a' },
			GitHub: { githubApi: 'github-cred' },
		});
	});

	it('re-seeds a section that is removed and later added back', async () => {
		addCredential({ id: 'current-cred', type: 'httpBasicAuth', name: 'Current credential' });
		const section = makeWorkflowSetupSection({
			targetNodeName: 'HTTP Request',
			credentialType: 'httpBasicAuth',
			currentCredentialId: 'current-cred',
		});

		const h = setupHarness([section]);
		await nextTick();

		h.inputs.setCredential(section, null);
		expect(h.inputs.credentialSelections.value).toEqual({ 'HTTP Request': {} });

		h.sectionsRef.value = [];
		await nextTick();

		h.sectionsRef.value = [section];
		await nextTick();

		expect(h.inputs.credentialSelections.value).toEqual({
			'HTTP Request': { httpBasicAuth: 'current-cred' },
		});
	});

	it('prunes skipped section ids that no longer correspond to a section', async () => {
		const h = setupHarness();
		h.inputs.markSectionSkipped(h.sectionA);
		h.inputs.markSectionSkipped(h.sectionB);

		h.sectionsRef.value = [h.sectionB];
		await nextTick();

		expect(h.inputs.isSectionSkipped(h.sectionA)).toBe(false);
		expect(h.inputs.isSectionSkipped(h.sectionB)).toBe(true);
	});

	it('clears a skip when the skipped section later becomes complete', async () => {
		const h = setupHarness();
		credentialTest.testableTypes.add('httpBasicAuth');
		h.inputs.setCredential(h.sectionA, 'cred-1');
		h.inputs.markSectionSkipped(h.sectionA);

		credentialsStore.credentialTestResults.set('cred-1', 'success');
		h.sectionsRef.value = [...h.sectionsRef.value];
		await nextTick();

		expect(h.inputs.isSectionSkipped(h.sectionA)).toBe(false);
	});

	it('tracks parameter values and builds nodeParameters after issues clear', () => {
		nodeTypesStore.getNodeType.mockReturnValue({
			name: 'n8n-nodes-base.httpRequest',
			properties: [
				{ displayName: 'URL', name: 'url', type: 'string', default: '', required: true },
			],
		});
		const parameterSection = makeWorkflowSetupSection({
			id: 'HTTP Request:parameters',
			credentialType: undefined,
			parameterNames: ['url'],
			node: { parameters: { url: '' } },
		});
		const h = setupHarness([parameterSection]);

		expect(h.inputs.isSectionComplete(parameterSection)).toBe(false);

		h.inputs.setParameterValue(parameterSection, 'url', 'https://example.com/api');

		expect(h.inputs.isSectionComplete(parameterSection)).toBe(true);
		expect(h.inputs.buildCompletedSetupPayload()).toEqual({
			nodeParameters: {
				'HTTP Request': { url: 'https://example.com/api' },
			},
		});
	});

	it('updates nested parameter values without flattening the path', () => {
		const parameterSection = makeWorkflowSetupSection({
			id: 'HTTP Request:parameters',
			credentialType: undefined,
			parameterNames: ['options'],
			node: { parameters: { options: { path: 'old', keep: true } } },
		});
		const h = setupHarness([parameterSection]);

		h.inputs.setParameterValue(parameterSection, 'options.path', 'new');

		expect(h.inputs.getDisplayNode(parameterSection).parameters).toEqual({
			options: { path: 'new', keep: true },
		});
		expect(parameterSection.node.parameters).toEqual({ options: { path: 'old', keep: true } });
		expect(h.inputs.buildCompletedSetupPayload()).toEqual({
			nodeParameters: {
				'HTTP Request': { options: { path: 'new', keep: true } },
			},
		});
	});

	it('mirrors a primary credential selection across grouped target nodes', () => {
		const groupedSection = makeWorkflowSetupSection({
			id: 'Primary:httpBasicAuth',
			targetNodeName: 'Primary',
			credentialType: 'httpBasicAuth',
			credentialTargetNodes: [
				{ id: 'primary', name: 'Primary', type: 'n8n-nodes-base.httpRequest' },
				{ id: 'follower', name: 'Follower', type: 'n8n-nodes-base.httpRequest' },
			],
		});
		const h = setupHarness([groupedSection]);

		h.inputs.setCredential(groupedSection, 'cred-1');

		expect(h.inputs.credentialSelections.value).toEqual({
			Primary: { httpBasicAuth: 'cred-1' },
			Follower: { httpBasicAuth: 'cred-1' },
		});
		expect(h.inputs.buildCompletedSetupPayload()).toEqual({
			nodeCredentials: {
				Primary: { httpBasicAuth: 'cred-1' },
				Follower: { httpBasicAuth: 'cred-1' },
			},
		});
	});

	it('clears mirrored credential selections across grouped target nodes', () => {
		const groupedSection = makeWorkflowSetupSection({
			id: 'Primary:httpBasicAuth',
			targetNodeName: 'Primary',
			credentialType: 'httpBasicAuth',
			credentialTargetNodes: [
				{ id: 'primary', name: 'Primary', type: 'n8n-nodes-base.httpRequest' },
				{ id: 'follower', name: 'Follower', type: 'n8n-nodes-base.httpRequest' },
			],
		});
		const h = setupHarness([groupedSection]);
		h.inputs.setCredential(groupedSection, 'cred-1');

		h.inputs.setCredential(groupedSection, null);

		expect(h.inputs.credentialSelections.value).toEqual({
			Primary: {},
			Follower: {},
		});
		expect(h.inputs.buildCompletedSetupPayload()).toEqual({});
	});

	it('seeds current credentials across grouped target nodes', async () => {
		addCredential({ id: 'current-cred', type: 'httpBasicAuth', name: 'Current credential' });
		const groupedSection = makeWorkflowSetupSection({
			id: 'Primary:httpBasicAuth',
			targetNodeName: 'Primary',
			credentialType: 'httpBasicAuth',
			currentCredentialId: 'current-cred',
			credentialTargetNodes: [
				{ id: 'primary', name: 'Primary', type: 'n8n-nodes-base.httpRequest' },
				{ id: 'follower', name: 'Follower', type: 'n8n-nodes-base.httpRequest' },
			],
		});

		const h = setupHarness([groupedSection]);
		await nextTick();

		expect(h.inputs.credentialSelections.value).toEqual({
			Primary: { httpBasicAuth: 'current-cred' },
			Follower: { httpBasicAuth: 'current-cred' },
		});
	});

	it('writes only to an independent params-bearing section target', () => {
		const groupedSection = makeWorkflowSetupSection({
			id: 'Primary:httpBasicAuth',
			targetNodeName: 'Primary',
			credentialType: 'httpBasicAuth',
			credentialTargetNodes: [
				{ id: 'primary', name: 'Primary', type: 'n8n-nodes-base.httpRequest' },
				{ id: 'follower', name: 'Follower', type: 'n8n-nodes-base.httpRequest' },
			],
		});
		const paramsSection = makeWorkflowSetupSection({
			id: 'Params:httpBasicAuth',
			targetNodeName: 'Params',
			credentialType: 'httpBasicAuth',
			parameterNames: ['url'],
			credentialTargetNodes: [{ id: 'params', name: 'Params', type: 'n8n-nodes-base.httpRequest' }],
		});
		const h = setupHarness([groupedSection, paramsSection]);

		h.inputs.setCredential(paramsSection, 'cred-params');

		expect(h.inputs.credentialSelections.value).toEqual({
			Params: { httpBasicAuth: 'cred-params' },
		});
	});

	it('excludes skipped grouped sections from completed setup payloads', () => {
		const groupedSection = makeWorkflowSetupSection({
			id: 'Primary:httpBasicAuth',
			targetNodeName: 'Primary',
			credentialType: 'httpBasicAuth',
			credentialTargetNodes: [
				{ id: 'primary', name: 'Primary', type: 'n8n-nodes-base.httpRequest' },
				{ id: 'follower', name: 'Follower', type: 'n8n-nodes-base.httpRequest' },
			],
		});
		const h = setupHarness([groupedSection]);
		h.inputs.setCredential(groupedSection, 'cred-1');
		h.inputs.markSectionSkipped(groupedSection);

		expect(h.inputs.buildCompletedSetupPayload()).toEqual({});
	});
});
