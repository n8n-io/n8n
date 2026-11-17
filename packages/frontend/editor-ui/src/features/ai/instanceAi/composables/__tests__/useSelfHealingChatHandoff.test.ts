import type { SelfHealingChatHandoff, SelfHealingChatInput } from '@n8n/frontend-module-sdk';
import { createComponentRenderer, mockedStore } from '@n8n/frontend-test-utils';
import type { Scope } from '@n8n/permissions';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useUsersStore } from '@n8n/stores/users.store';
import { createTestingPinia } from '@pinia/testing';
import { computed, defineComponent, getCurrentInstance, ref } from 'vue';

import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { useSelfHealingChatHandoff } from '../useSelfHealingChatHandoff';

const mocks = vi.hoisted(() => ({
	startThread: vi.fn(),
	useHandoff: vi.fn(),
}));
const ready = ref(true);

vi.mock('../useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => computed(() => ready.value),
}));
vi.mock('../useInstanceAiHandoff', async (importOriginal) => ({
	...(await importOriginal<typeof import('../useInstanceAiHandoff')>()),
	useInstanceAiHandoff: mocks.useHandoff,
}));
const result: SelfHealingChatInput = {
	resultId: 'result-1',
	workflowId: 'workflow-1',
	outcome: 'needs_you',
	reviewState: 'dismissed',
	report: 'The request failed. Check the connection settings.',
	execution: { status: 'available', id: 'execution-1' },
};

function createHandoff() {
	let handoff: SelfHealingChatHandoff | undefined;
	createComponentRenderer(
		defineComponent({
			setup() {
				handoff = useSelfHealingChatHandoff();
				return () => null;
			},
		}),
	)();
	if (!handoff) throw new Error('The handoff was not initialized.');
	return handoff;
}

function setAccess(globalScopes: Scope[], myProjects: Array<{ id: string; scopes: Scope[] }>) {
	mockedStore(useUsersStore).currentUser = { globalScopes } as IUser;
	mockedStore(useProjectsStore).myProjects = myProjects as ProjectListItem[];
}

beforeEach(() => {
	vi.resetAllMocks();
	createTestingPinia();
	setAccess([], [{ id: 'team-project', scopes: ['project:read'] }]);
	ready.value = true;
	mocks.useHandoff.mockImplementation(() => {
		expect(getCurrentInstance()).not.toBeNull();
		return { startThread: mocks.startThread };
	});
});

it('starts the chat in the supplied team project with the full report and execution attachment', async () => {
	mocks.startThread.mockResolvedValue('started');
	const handoff = createHandoff();
	await expect(handoff.start('team-project', result)).resolves.toBe('started');

	expect(mocks.startThread).toHaveBeenCalledExactlyOnceWith(
		'team-project',
		`Continue from this investigation report. Help me resolve the remaining issues.\n\n${result.report}`,
		{ kind: 'prefill', prefillType: 'handoff_self_healing_report' },
		{
			source: 'self_healing_result',
			origin: 'internal',
			sourceContext: { resultId: 'result-1', outcome: 'needs_you' },
		},
		[{ type: 'workflow', id: 'workflow-1', executionId: 'execution-1' }],
	);
});

it('tells the Assistant that the suggested changes are applied without a publication state', async () => {
	await createHandoff().start('team-project', { ...result, reviewState: 'applied' });

	const message = mocks.startThread.mock.calls[0]?.[1];
	expect(message).toBe(
		`Continue from this investigation report. Help me resolve the remaining issues.\n\nThe suggested changes have already been applied to the workflow.\n\n${result.report}`,
	);
	expect(message).not.toMatch(/publish/i);
});

it('omits an unavailable execution from the workflow attachment', async () => {
	await createHandoff().start('team-project', {
		...result,
		execution: { status: 'unavailable' },
	});

	expect(mocks.startThread.mock.calls[0]?.[4]).toEqual([{ type: 'workflow', id: 'workflow-1' }]);
});

it.each([
	{ handoff: 'busy', outcome: 'busy' },
	{ handoff: 'failed', outcome: 'failed' },
	{ handoff: 'setup', outcome: 'unavailable' },
] as const)('reports a $handoff handoff as $outcome', async ({ handoff, outcome }) => {
	mocks.startThread.mockResolvedValue(handoff);

	await expect(createHandoff().start('team-project', result)).resolves.toBe(outcome);
});

it('requires the Assistant to be ready before starting a conversation', async () => {
	const handoff = createHandoff();
	expect(handoff.available.value).toBe(true);
	ready.value = false;
	await expect(handoff.start('team-project', result)).resolves.toBe('unavailable');

	expect(handoff.available.value).toBe(false);
	expect(mocks.startThread).not.toHaveBeenCalled();
});

it.each<{ name: string; globalScopes: Scope[]; scopes: Scope[] }>([
	{ name: 'a team project the user can read', globalScopes: [], scopes: ['project:read'] },
	{ name: 'any project through a global scope', globalScopes: ['project:read'], scopes: [] },
])('allows a chat in $name', ({ globalScopes, scopes }) => {
	setAccess(globalScopes, scopes.length ? [{ id: 'team-project', scopes }] : []);

	expect(createHandoff().canStart('team-project')).toBe(true);
});

it.each<{ name: string; myProjects: Array<{ id: string; scopes: Scope[] }> }>([
	{ name: 'the user is not a member', myProjects: [] },
	{ name: 'the user lacks read access', myProjects: [{ id: 'team-project', scopes: [] }] },
	{
		name: 'only another project grants read access',
		myProjects: [{ id: 'other-project', scopes: ['project:read'] }],
	},
])('denies a chat when $name', async ({ myProjects }) => {
	setAccess([], myProjects);
	const handoff = createHandoff();

	expect(handoff.canStart('team-project')).toBe(false);
	await expect(handoff.start('team-project', result)).resolves.toBe('unavailable');
	expect(mocks.startThread).not.toHaveBeenCalled();
});

it('re-evaluates chat access when readiness or project access changes', () => {
	setAccess([], []);
	const handoff = createHandoff();
	const canStart = computed(() => handoff.canStart('team-project'));
	expect(canStart.value).toBe(false);

	setAccess([], [{ id: 'team-project', scopes: ['project:read'] }]);
	expect(canStart.value).toBe(true);

	ready.value = false;
	expect(canStart.value).toBe(false);
});
