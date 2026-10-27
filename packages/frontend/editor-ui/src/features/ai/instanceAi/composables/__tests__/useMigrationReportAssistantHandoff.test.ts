import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { computed, defineComponent, ref } from 'vue';

import {
	useMigrationReportAssistantHandoff,
	type MigrationReportFindingInput,
} from '../useMigrationReportAssistantHandoff';

const mocks = vi.hoisted(() => ({
	startThread: vi.fn(),
	getPersonalProject: vi.fn(),
	personalProject: null as { id: string } | null,
}));
const available = ref(true);

vi.mock('../useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => computed(() => available.value),
}));
vi.mock('../useInstanceAiHandoff', async (importOriginal) => ({
	...(await importOriginal<typeof import('../useInstanceAiHandoff')>()),
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

const finding: MigrationReportFindingInput = {
	ruleId: 'function-removed-v3',
	ruleTitle: 'Function node removed',
	workflow: { id: 'workflow-1', name: 'Invoice sync', homeProjectId: 'team-project' },
};

function createHandoff() {
	let handoff: ReturnType<typeof useMigrationReportAssistantHandoff> | undefined;
	createComponentRenderer(
		defineComponent({
			setup() {
				handoff = useMigrationReportAssistantHandoff();
				return () => null;
			},
		}),
	)();
	if (!handoff) throw new Error('The handoff was not initialized.');
	return handoff;
}

beforeEach(() => {
	vi.resetAllMocks();
	available.value = true;
	mocks.personalProject = { id: 'personal-project' };
	mocks.startThread.mockResolvedValue('started');
});

it('opens a new tab in the workflow project with the workflow and the finding', async () => {
	await expect(createHandoff().start(finding)).resolves.toBe('started');

	expect(mocks.startThread).toHaveBeenCalledExactlyOnceWith(
		'team-project',
		'Help me fix "Function node removed" in this workflow so it keeps working on n8n v3.',
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
});

it('passes on what an automated migration left behind', async () => {
	const automatedMigration = {
		outcome: 'refused' as const,
		message: 'The fields to split by use an expression.',
		nodeName: 'Split',
	};

	await createHandoff().start({ ...finding, automatedMigration });

	const [, message, , launch, , , options] = mocks.startThread.mock.calls[0];
	expect(message).toBe(
		'The automated migration couldn\'t finish. Help me fix "Function node removed" in this workflow so it keeps working on n8n v3.',
	);
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
});

it('clamps what the automated migration left to the hand-off limits', async () => {
	await createHandoff().start({
		...finding,
		automatedMigration: {
			outcome: 'partial',
			notes: ['n'.repeat(1500), ' ', ...Array.from({ length: 60 }, (_, index) => `note ${index}`)],
			unmapped: ['u'.repeat(600)],
		},
	});

	const { automatedMigration } = mocks.startThread.mock.calls[0][6].context;
	expect(automatedMigration.notes).toHaveLength(50);
	expect(automatedMigration.notes[0]).toHaveLength(1000);
	expect(automatedMigration.notes).not.toContain(' ');
	expect(automatedMigration.unmapped).toEqual(['u'.repeat(500)]);
});

it('falls back to the personal project when the workflow has no home project', async () => {
	await createHandoff().start({
		...finding,
		workflow: { id: 'workflow-1', name: 'Invoice sync' },
	});

	expect(mocks.startThread.mock.calls[0][0]).toBe('personal-project');
});

it('does not open a thread when no project can be resolved', async () => {
	mocks.personalProject = null;
	mocks.getPersonalProject.mockRejectedValue(new Error('Offline'));

	await expect(
		createHandoff().start({ ...finding, workflow: { id: 'workflow-1', name: 'Invoice sync' } }),
	).resolves.toBe('failed');
	expect(mocks.startThread).not.toHaveBeenCalled();
});

it('does nothing when n8n Assistant is unavailable', async () => {
	available.value = false;
	const handoff = createHandoff();

	expect(handoff.available.value).toBe(false);
	await expect(handoff.start(finding)).resolves.toBe('unavailable');
	expect(mocks.startThread).not.toHaveBeenCalled();
});
