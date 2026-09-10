import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	documentStore: {
		value: {
			documentId: 'temporary-workflow-id',
			workflowId: 'temporary-workflow-id',
			homeProject: { id: 'team-project-id' } as { id: string } | undefined,
		},
	},
	personalProject: { id: 'personal-project-id' } as { id: string } | undefined,
	getWorkflowById: vi.fn(),
	handoffContext: { source: 'credential-modal' },
	routerPush: vi.fn(),
	startThread: vi.fn(),
	telemetryTrack: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: {}, query: {} }),
	useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => mocks.documentStore,
}));

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ getWorkflowById: mocks.getWorkflowById }),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		get personalProject() {
			return mocks.personalProject;
		},
	}),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mocks.telemetryTrack }),
}));

vi.mock('../useInstanceAiHandoff', () => ({
	buildInstanceAiCredentialHandoffContext: vi.fn(() => mocks.handoffContext),
	buildInstanceAiCredentialQuestion: vi.fn(() => 'credential question'),
	useInstanceAiHandoff: () => ({ startThread: mocks.startThread }),
}));

vi.mock('../../instanceAi.store', () => ({
	useInstanceAiStore: () => ({}),
}));

import {
	INSTANCE_AI_PROJECT_ID_QUERY,
	INSTANCE_AI_SOURCE_QUERY,
	INSTANCE_AI_VIEW,
} from '../../constants';
import { useInstanceAiHandoffCapability } from '../useInstanceAiHandoffCapability';

async function openWorkflowFromCanvas() {
	await useInstanceAiHandoffCapability().openWorkflow?.('canvas_choice_prompt');
}

async function openCredentialHelp() {
	return await useInstanceAiHandoffCapability().openCredential?.(
		{ credentialType: 'gmailOAuth2', displayName: 'Gmail OAuth2 API' },
		'credential_edit',
	);
}

function expectCredentialThread(projectId: string) {
	expect(mocks.startThread).toHaveBeenCalledWith(
		projectId,
		'credential question',
		{ source: 'credential_edit', origin: 'internal' },
		undefined,
		undefined,
		{ newTab: true, context: mocks.handoffContext },
	);
}

describe('useInstanceAiHandoffCapability', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// No entry in the list store → the editor's workflow reads as unsaved.
		mocks.getWorkflowById.mockReset();
		mocks.documentStore.value.homeProject = { id: 'team-project-id' };
		mocks.personalProject = { id: 'personal-project-id' };
	});

	describe('openWorkflow', () => {
		it('carries the editor project into the empty view for an unsaved workflow', async () => {
			await openWorkflowFromCanvas();

			expect(mocks.routerPush).toHaveBeenCalledWith({
				name: INSTANCE_AI_VIEW,
				query: {
					[INSTANCE_AI_PROJECT_ID_QUERY]: 'team-project-id',
					[INSTANCE_AI_SOURCE_QUERY]: 'canvas_choice_prompt',
				},
			});
		});

		it('falls back to the personal project when the workflow has no home project', async () => {
			mocks.documentStore.value.homeProject = undefined;

			await openWorkflowFromCanvas();

			expect(mocks.routerPush).toHaveBeenCalledWith({
				name: INSTANCE_AI_VIEW,
				query: {
					[INSTANCE_AI_PROJECT_ID_QUERY]: 'personal-project-id',
					[INSTANCE_AI_SOURCE_QUERY]: 'canvas_choice_prompt',
				},
			});
		});

		it('omits the project query when no project can be resolved', async () => {
			mocks.documentStore.value.homeProject = undefined;
			mocks.personalProject = undefined;

			await openWorkflowFromCanvas();

			expect(mocks.routerPush).toHaveBeenCalledWith({
				name: INSTANCE_AI_VIEW,
				query: { [INSTANCE_AI_SOURCE_QUERY]: 'canvas_choice_prompt' },
			});
		});
	});

	describe('openCredential', () => {
		it('starts the thread in the editor project for an unsaved workflow', async () => {
			await openCredentialHelp();

			expectCredentialThread('team-project-id');
		});

		it('starts the thread in the editor project for a saved workflow', async () => {
			mocks.getWorkflowById.mockReturnValue({ id: 'temporary-workflow-id' });

			await openCredentialHelp();

			expectCredentialThread('team-project-id');
		});

		it('falls back to the personal project when the workflow has no home project', async () => {
			mocks.documentStore.value.homeProject = undefined;

			await openCredentialHelp();

			expectCredentialThread('personal-project-id');
		});

		it('navigates to the empty view when no project can be resolved', async () => {
			mocks.documentStore.value.homeProject = undefined;
			mocks.personalProject = undefined;

			const keepModalOpen = await openCredentialHelp();

			expect(mocks.startThread).not.toHaveBeenCalled();
			expect(mocks.routerPush).toHaveBeenCalledWith({
				name: INSTANCE_AI_VIEW,
				query: { [INSTANCE_AI_SOURCE_QUERY]: 'credential_edit' },
			});
			expect(keepModalOpen).toBe(false);
		});
	});
});
