import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { computed, defineComponent } from 'vue';

import { useMigrationFindingAssistant } from './useMigrationFindingAssistant';

const mocks = vi.hoisted(() => ({
	startThread: vi.fn(),
	track: vi.fn(),
	getPersonalProject: vi.fn(),
	personalProject: null as { id: string } | null,
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => computed(() => true),
}));
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', async (importOriginal) => ({
	...(await importOriginal<
		typeof import('@/features/ai/instanceAi/composables/useInstanceAiHandoff')
	>()),
	useInstanceAiHandoff: () => ({ startThread: mocks.startThread }),
}));
vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		get personalProject() {
			return mocks.personalProject;
		},
		getPersonalProject: mocks.getPersonalProject,
	}),
}));
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mocks.track }),
}));

const EVENT = TELEMETRY_EVENT.MIGRATION_REPORT.USER_OPENED_MIGRATION_FINDING_IN_ASSISTANT;
const rule = { ruleId: 'function-removed-v3', ruleTitle: 'Function node removed' };
const workflow = {
	id: 'workflow-1',
	name: 'Invoice sync',
	active: true,
	numberOfExecutions: 3,
	lastUpdatedAt: new Date('2026-10-01'),
	issues: [],
	homeProjectId: 'team-project',
};

function createAssistant() {
	let assistant: ReturnType<typeof useMigrationFindingAssistant> | undefined;
	createComponentRenderer(
		defineComponent({
			setup() {
				assistant = useMigrationFindingAssistant();
				return () => null;
			},
		}),
	)();
	if (!assistant) throw new Error('The assistant was not initialized.');
	return assistant;
}

beforeEach(() => {
	vi.resetAllMocks();
	mocks.personalProject = { id: 'personal-project' };
	mocks.startThread.mockResolvedValue('started');
});

it('opens a new tab in the workflow project with the finding, and tracks the click', async () => {
	await createAssistant().open({ rule, workflow });

	expect(mocks.startThread).toHaveBeenCalledExactlyOnceWith(
		'team-project',
		'Help me resolve "Function node removed" in this workflow before the update to n8n v3.',
		{ kind: 'prefill', prefillType: 'handoff_migration_report' },
		{
			source: 'migration_report',
			origin: 'internal',
			sourceContext: { ruleId: 'function-removed-v3' },
		},
		[{ type: 'workflow', id: 'workflow-1', name: 'Invoice sync' }],
		undefined,
		{
			newTab: true,
			context: {
				source: 'migration-report',
				ruleId: 'function-removed-v3',
				workflowId: 'workflow-1',
			},
		},
	);
	expect(mocks.track).toHaveBeenCalledWith(EVENT, {
		rule_id: 'function-removed-v3',
		workflow_id: 'workflow-1',
		outcome: 'started',
	});
});

it('passes on what an automated migration left behind', async () => {
	mocks.startThread.mockResolvedValue('setup');
	const automatedMigration = {
		outcome: 'refused' as const,
		message: 'The fields to split by use an expression.',
		nodeName: 'Split',
	};

	await createAssistant().open({ rule, workflow, automatedMigration });

	const [, , , launch, , , options] = mocks.startThread.mock.calls[0];
	expect(launch.sourceContext).toEqual({
		ruleId: 'function-removed-v3',
		automatedMigration: 'refused',
	});
	expect(options.context).toEqual({
		source: 'migration-report',
		ruleId: 'function-removed-v3',
		workflowId: 'workflow-1',
		automatedMigration,
	});
	expect(mocks.track).toHaveBeenCalledWith(
		EVENT,
		expect.objectContaining({ automated_migration: 'refused', outcome: 'setup' }),
	);
});

it('falls back to the personal project when the workflow has no home project', async () => {
	await createAssistant().open({ rule, workflow: { ...workflow, homeProjectId: undefined } });

	expect(mocks.startThread.mock.calls[0][0]).toBe('personal-project');
});

it('tracks a failed hand-off when no project can be resolved', async () => {
	mocks.personalProject = null;
	mocks.getPersonalProject.mockRejectedValue(new Error('Offline'));

	await createAssistant().open({ rule, workflow: { ...workflow, homeProjectId: undefined } });

	expect(mocks.startThread).not.toHaveBeenCalled();
	expect(mocks.track).toHaveBeenCalledWith(EVENT, expect.objectContaining({ outcome: 'failed' }));
});
