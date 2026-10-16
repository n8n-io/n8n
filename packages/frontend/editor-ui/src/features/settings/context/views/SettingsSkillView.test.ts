import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { SKILL_NAME_TAKEN_MESSAGE, type SkillDetail } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useUsersStore } from '@n8n/stores/users.store';
import { waitFor } from '@testing-library/vue';
import { mock } from 'vitest-mock-extended';
import { defineComponent, h } from 'vue';

import type { AgentSkillEditorData } from '@/features/agents/components/AgentSkillEditor.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';

import SettingsSkillView from './SettingsSkillView.vue';
import { useSkillsStore } from '../skills.store';

const push = vi.fn();
const routeParams: Record<string, string> = {};
const showMessageMock = vi.fn();
const showErrorMock = vi.fn();
const trackMock = vi.fn();

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock, showMessage: showMessageMock }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
	useRoute: () => ({ params: routeParams, query: {} }),
	RouterLink: vi.fn(),
}));

let editor: { data: AgentSkillEditorData; exitLabel: string; close: () => void } | undefined;

const AgentSkillEditorStub = defineComponent({
	name: 'AgentSkillEditor',
	props: { data: { type: Object, required: true }, layout: String, exitLabel: String },
	emits: ['close'],
	setup(props, { emit }) {
		editor = {
			data: props.data as AgentSkillEditorData,
			exitLabel: props.exitLabel ?? '',
			close: () => emit('close'),
		};
		return () => h('div', { 'data-testid': 'stub-skill-editor' });
	},
});

function detail(overrides: Partial<SkillDetail> = {}): SkillDetail {
	return {
		id: 's1',
		name: 'research-search',
		description: 'Find research and cite the evidence.',
		scope: 'instance',
		projectId: null,
		projectName: null,
		projectType: null,
		agentId: null,
		agentName: null,
		source: 'ui',
		createdBy: null,
		latestVersion: 1,
		usedByAgents: 0,
		canEdit: true,
		canDelete: true,
		createdAt: '2026-10-01T00:00:00.000Z',
		updatedAt: '2026-10-01T00:00:00.000Z',
		skill: {
			name: 'research-search',
			description: 'Find research and cite the evidence.',
			instructions: 'Cite every source.',
		},
		skillHash: 'hash-1',
		usedBy: { drafts: [], pins: [], hiddenAgents: 0 },
		...overrides,
	};
}

const renderView = createComponentRenderer(SettingsSkillView, {
	global: { stubs: { AgentSkillEditor: AgentSkillEditorStub } },
});

let skillsStore: MockedStore<typeof useSkillsStore>;

function setPermissions({
	instance = false,
	projects = [] as Array<Partial<ProjectListItem>>,
}: { instance?: boolean; projects?: Array<Partial<ProjectListItem>> } = {}) {
	mockedStore(useUsersStore).currentUser = mock<IUser>({
		id: 'user-1',
		globalScopes: instance ? ['skill:create'] : [],
	});
	const projectsStore = mockedStore(useProjectsStore);
	projectsStore.personalProject = {
		id: 'personal-1',
		name: 'Me <me@n8n.io>',
		type: 'personal',
		scopes: ['projectSkill:create'],
	} as never;
	projectsStore.myProjects = [
		{ id: 'personal-1', name: 'Me <me@n8n.io>', type: 'personal', scopes: ['projectSkill:create'] },
		...projects,
	] as ProjectListItem[];
	projectsStore.getMyProjects.mockResolvedValue(undefined);
}

async function renderReady() {
	const result = renderView();
	await waitFor(() => expect(editor).toBeDefined());
	return result;
}

function editorData(): AgentSkillEditorData {
	if (!editor) throw new Error('The editor was not rendered');
	return editor.data;
}

describe('SettingsSkillView', () => {
	beforeEach(() => {
		createTestingPinia();
		skillsStore = mockedStore(useSkillsStore);
		setPermissions();
		editor = undefined;
		for (const key of Object.keys(routeParams)) delete routeParams[key];
		window.history.replaceState(null, '');
		vi.clearAllMocks();
	});

	describe('create', () => {
		it('offers the personal project and the team projects the user can write to', async () => {
			setPermissions({
				projects: [
					{ id: 'team-1', name: 'Marketing', type: 'team', scopes: ['projectSkill:create'] },
					{ id: 'team-2', name: 'Read only', type: 'team', scopes: ['projectSkill:read'] },
				],
			});
			await renderReady();

			expect(editorData().scopeOptions).toEqual([
				{ value: 'project:personal-1', label: 'Personal project', icon: 'user' },
				{ value: 'project:team-1', label: 'Marketing', icon: 'layers' },
			]);
			expect(editor?.exitLabel).toBe('Back to Skills');
		});

		it('offers Global only to users who may create instance skills', async () => {
			setPermissions({ instance: true });
			await renderReady();

			expect(editorData().scopeOptions?.[0]).toEqual({
				value: 'instance',
				label: 'Global',
				icon: 'globe',
			});
		});

		it('returns to the list when the user may not create a skill anywhere', async () => {
			mockedStore(useProjectsStore).personalProject = null;
			mockedStore(useProjectsStore).myProjects = [];

			renderView();
			await waitFor(() =>
				expect(push).toHaveBeenCalledWith({ name: 'SettingsContextSkills', query: {} }),
			);
			expect(editor).toBeUndefined();
		});

		it('asks for a free default name in the scope the user picks', async () => {
			skillsStore.fetchNewSkillName.mockResolvedValue('New skill 2');
			await renderReady();

			const name = await editorData().getDefaultName?.('project:personal-1');

			expect(name).toBe('New skill 2');
			expect(skillsStore.fetchNewSkillName).toHaveBeenCalledWith({
				scope: 'project',
				projectId: 'personal-1',
				name: 'New skill',
			});
		});

		it('creates the skill in the chosen scope and returns to the filtered list', async () => {
			window.history.replaceState({ skillsListQuery: { search: 'brand' } }, '');
			skillsStore.createSkill.mockResolvedValue(detail({ id: 's-new' }));
			await renderReady();

			const content = {
				name: 'brand-voice',
				description: 'Write copy.',
				instructions: 'Be brief.',
			};
			const result = await editorData().onConfirm({
				skill: content,
				scope: 'project:personal-1',
				method: 'upload',
			});
			editor?.close();

			expect(result).toBeUndefined();
			expect(skillsStore.createSkill).toHaveBeenCalledWith({
				scope: 'project',
				projectId: 'personal-1',
				skill: content,
				method: 'upload',
			});
			expect(push).toHaveBeenCalledWith({
				name: 'SettingsContextSkills',
				query: { search: 'brand' },
				state: { savedSkill: { id: 's-new', created: true } },
			});
		});

		it('keeps the page open with the error on the name when the name is taken', async () => {
			skillsStore.createSkill.mockRejectedValue(
				new ResponseError(SKILL_NAME_TAKEN_MESSAGE, { httpStatusCode: 409 }),
			);
			await renderReady();

			const result = await editorData().onConfirm({
				skill: { name: 'brand-voice', description: 'Write copy.', instructions: 'Be brief.' },
				scope: 'project:personal-1',
			});

			expect(result).toEqual({ saved: false, nameError: SKILL_NAME_TAKEN_MESSAGE });
			expect(showErrorMock).not.toHaveBeenCalled();
		});
	});

	describe('edit', () => {
		beforeEach(() => {
			routeParams.skillId = 's1';
		});

		it('opens a skill read-only when the user cannot change it', async () => {
			skillsStore.fetchSkill.mockResolvedValue(detail({ canEdit: false }));
			await renderReady();

			expect(skillsStore.fetchSkill).toHaveBeenCalledWith('s1');
			expect(editorData().readOnly).toBe(true);
			expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_OPENED_SKILL, {
				skill_id: 's1',
				scope: 'instance',
				read_only: true,
			});
		});

		it('locks the scope while agents use the skill', async () => {
			skillsStore.fetchSkill.mockResolvedValue(
				detail({ scope: 'agent', agentId: 'a1', agentName: 'FirstClassDarwin', usedByAgents: 1 }),
			);
			await renderReady();

			// The agent scope is listed first because it is not a choice in Settings.
			expect(editorData().scopeOptions?.[0]).toEqual({
				value: 'agent',
				label: 'FirstClassDarwin only',
				icon: 'bot',
			});
			expect(editorData().initialScope).toBe('agent');
			expect(editorData().scopeLockedReason).toBe(
				'Used by 1 agent. Remove the skill from it to change where it is available.',
			);
		});

		it('locks the scope when the user may edit but not delete the skill', async () => {
			skillsStore.fetchSkill.mockResolvedValue(detail({ canEdit: true, canDelete: false }));
			await renderReady();

			expect(editorData().readOnly).toBe(false);
			expect(editorData().scopeLockedReason).toBe(
				'You need permission to delete this skill to move it, because moving removes it from where it is now.',
			);
		});

		it('moves an unused skill to the scope the user picks', async () => {
			skillsStore.fetchSkill.mockResolvedValue(detail({ scope: 'instance', usedByAgents: 0 }));
			skillsStore.saveSkill.mockResolvedValue({
				id: 's1',
				versionId: 'v1',
				version: 1,
				created: false,
				skill: detail().skill,
				skillHash: 'hash-1',
			});
			await renderReady();

			expect(editorData().scopeLockedReason).toBeUndefined();
			await editorData().onConfirm({
				id: 's1',
				skill: detail().skill,
				scope: 'project:personal-1',
			});
			editor?.close();

			expect(skillsStore.saveSkill).toHaveBeenCalledWith(
				's1',
				expect.objectContaining({ scope: 'project', projectId: 'personal-1' }),
			);
			// A move is a change even when the content stays the same: no "Nothing to save".
			expect(showMessageMock).not.toHaveBeenCalled();
			expect(push).toHaveBeenCalledWith({
				name: 'SettingsContextSkills',
				query: {},
				state: { savedSkill: { id: 's1', created: false } },
			});
		});

		it('says "Nothing to save" when the content matches the latest version', async () => {
			skillsStore.fetchSkill.mockResolvedValue(detail());
			skillsStore.saveSkill.mockResolvedValue({
				id: 's1',
				versionId: 'v1',
				version: 1,
				created: false,
				skill: detail().skill,
				skillHash: 'hash-1',
			});
			await renderReady();

			await editorData().onConfirm({ id: 's1', skill: detail().skill, scope: 'instance' });

			expect(skillsStore.saveSkill).toHaveBeenCalledWith('s1', {
				...detail().skill,
				references: [],
				baseSkillHash: 'hash-1',
			});
			expect(showMessageMock).toHaveBeenCalledWith({ title: 'Nothing to save', type: 'info' });
		});

		it('keeps the page open and shows a toast when a save fails for another reason', async () => {
			skillsStore.fetchSkill.mockResolvedValue(detail());
			skillsStore.saveSkill.mockRejectedValue(
				new ResponseError('The skill was changed somewhere else.', { httpStatusCode: 409 }),
			);
			await renderReady();

			const result = await editorData().onConfirm({ id: 's1', skill: detail().skill });

			expect(result).toEqual({ saved: false });
			expect(showErrorMock).toHaveBeenCalledWith(
				expect.any(ResponseError),
				'Could not save the skill',
			);
		});

		it('returns to the list when the skill cannot load', async () => {
			skillsStore.fetchSkill.mockRejectedValue(new Error('not found'));

			renderView();

			await waitFor(() =>
				expect(push).toHaveBeenCalledWith({ name: 'SettingsContextSkills', query: {} }),
			);
			expect(showErrorMock).toHaveBeenCalledWith(expect.any(Error), 'Could not load the skill');
		});

		it('returns to the list without a notice when the user leaves without saving', async () => {
			skillsStore.fetchSkill.mockResolvedValue(detail());
			await renderReady();

			editor?.close();

			expect(push).toHaveBeenCalledWith({ name: 'SettingsContextSkills', query: {} });
		});
	});
});
