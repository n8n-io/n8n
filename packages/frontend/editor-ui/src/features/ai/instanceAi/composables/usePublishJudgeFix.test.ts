import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { PUBLISH_JUDGE_VIOLATION_KIND, type PolicyViolation } from '@n8n/api-types';
import { defineComponent } from 'vue';

import { usePublishJudgeFix } from './usePublishJudgeFix';

const mocks = vi.hoisted(() => ({
	startThread: vi.fn(),
	getPersonalProject: vi.fn(),
	getMyProjects: vi.fn(),
	ready: true,
	readyReads: 0,
	personalProject: null as { id: string } | null,
	myProjects: [] as Array<{ id: string }>,
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => ({
		get value() {
			mocks.readyReads++;
			return mocks.ready;
		},
	}),
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
		get myProjects() {
			return mocks.myProjects;
		},
		getPersonalProject: mocks.getPersonalProject,
		getMyProjects: mocks.getMyProjects,
	}),
}));

const denied: PolicyViolation = {
	kind: PUBLISH_JUDGE_VIOLATION_KIND.denied,
	checkId: 'publish-judge',
	message: 'The workflow sends customer emails to a personal address.',
};
const deniedToo: PolicyViolation = {
	...denied,
	message: 'The workflow stores an API key in a Set node.',
};
const unavailable: PolicyViolation = {
	kind: PUBLISH_JUDGE_VIOLATION_KIND.unavailable,
	checkId: 'publish-judge',
	message: 'The judge did not answer in time.',
};

function createFix() {
	let fix: ReturnType<typeof usePublishJudgeFix> | undefined;
	createComponentRenderer(
		defineComponent({
			setup() {
				fix = usePublishJudgeFix();
				return () => null;
			},
		}),
	)();
	if (!fix) throw new Error('The composable was not initialized.');
	return fix;
}

beforeEach(() => {
	vi.resetAllMocks();
	mocks.ready = true;
	mocks.readyReads = 0;
	mocks.personalProject = { id: 'personal-project' };
	mocks.myProjects = [{ id: 'team-project' }, { id: 'personal-project' }];
	mocks.getMyProjects.mockResolvedValue(undefined);
	mocks.startThread.mockResolvedValue('started');
});

describe('canFix', () => {
	it.each([
		['no violations', []],
		['only an unavailable judge', [unavailable]],
	])('is false for %s, without reading the Assistant readiness', (_label, violations) => {
		expect(createFix().canFix(violations)).toBe(false);
		expect(mocks.readyReads).toBe(0);
	});

	it('is false when the Assistant is not ready', () => {
		mocks.ready = false;

		expect(createFix().canFix([denied])).toBe(false);
	});

	it('is true when a refusal is present and the Assistant is ready', () => {
		expect(createFix().canFix([unavailable, denied])).toBe(true);
	});
});

describe('fix', () => {
	it('sends only the denied reasons', async () => {
		await createFix().fix({ type: 'workflow', id: 'wf-1', name: 'Invoice sync' }, [
			denied,
			unavailable,
			deniedToo,
		]);

		const message: string = mocks.startThread.mock.calls[0][1];
		expect(message).toContain(`- ${denied.message}\n- ${deniedToo.message}`);
		expect(message).not.toContain(unavailable.message);
		expect(message).toContain('Invoice sync');
		expect(message).toContain('wf-1');
	});

	it('starts a prefilled publish-judge thread with the workflow attached', async () => {
		const outcome = await createFix().fix(
			{ type: 'workflow', id: 'wf-1', name: 'Invoice sync', projectId: 'team-project' },
			[denied],
		);

		expect(outcome).toBe('started');
		expect(mocks.startThread).toHaveBeenCalledExactlyOnceWith(
			'team-project',
			expect.any(String),
			{ kind: 'prefill', prefillType: 'handoff_publish_judge_fix' },
			{ source: 'publish_judge_refusal', origin: 'internal' },
			[{ type: 'workflow', id: 'wf-1', name: 'Invoice sync' }],
		);
	});

	it('attaches an agent with its project id', async () => {
		await createFix().fix(
			{ type: 'agent', id: 'agent-1', name: 'Support bot', projectId: 'team-project' },
			[denied],
		);

		const [projectId, message, , , attachments] = mocks.startThread.mock.calls[0];
		expect(projectId).toBe('team-project');
		expect(message).toContain('agent-1');
		expect(attachments).toEqual([
			{ type: 'agent', id: 'agent-1', name: 'Support bot', projectId: 'team-project' },
		]);
	});

	it('returns failed and starts no thread when no project resolves', async () => {
		mocks.personalProject = null;
		mocks.getPersonalProject.mockRejectedValue(new Error('Offline'));

		const outcome = await createFix().fix({ type: 'workflow', id: 'wf-1' }, [denied]);

		expect(outcome).toBe('failed');
		expect(mocks.startThread).not.toHaveBeenCalled();
	});
});
