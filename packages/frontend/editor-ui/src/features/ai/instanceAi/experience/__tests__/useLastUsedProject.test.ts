import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import type { Scope } from '@n8n/permissions';
import { useUsersStore } from '@n8n/stores/users.store';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type {
	Project,
	ProjectListItem,
	ProjectType,
} from '@/features/collaboration/projects/projects.types';
import { useLastUsedProject } from '../useLastUsedProject';

const keyFor = (userId: string) => `n8n:instance-ai:last-project:${userId}`;
const storage = new Map<string, string>();

let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;

function listItem(id: string, type: ProjectType, scopes: Scope[] = []): ProjectListItem {
	return {
		id,
		type,
		name: id,
		icon: null,
		role: 'project:editor',
		scopes,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	};
}

function signIn(id: string | null) {
	useUsersStore().currentUserId = id;
}

function stubStorage() {
	vi.stubGlobal('localStorage', {
		getItem: vi.fn((key: string) => storage.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => {
			storage.set(key, value);
		}),
		removeItem: vi.fn((key: string) => {
			storage.delete(key);
		}),
	});
}

function stubThrowingStorage() {
	vi.stubGlobal('localStorage', {
		getItem: vi.fn(() => {
			throw new Error('storage blocked');
		}),
		setItem: vi.fn(() => {
			throw new Error('storage blocked');
		}),
		removeItem: vi.fn(),
	});
}

describe('useLastUsedProject', () => {
	beforeEach(() => {
		createTestingPinia();
		storage.clear();
		stubStorage();
		projectsStore = mockedStore(useProjectsStore);
		projectsStore.isTeamProjectFeatureEnabled = true;
		projectsStore.personalProject = { id: 'personal-1' } as Project;
		projectsStore.myProjects = [
			listItem('personal-1', 'personal', ['workflow:create']),
			listItem('team-a', 'team', ['workflow:read', 'workflow:create']),
			listItem('team-b', 'team', ['workflow:read', 'workflow:create']),
		];
		signIn('user-1');
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('rememberChatProject', () => {
		it('remembers a team project for each user', () => {
			const { rememberChatProject, lastUsedProjectId } = useLastUsedProject();

			rememberChatProject('team-a');
			signIn('user-2');
			rememberChatProject('team-b');

			expect(storage.get(keyFor('user-1'))).toBe('team-a');
			expect(storage.get(keyFor('user-2'))).toBe('team-b');
			expect(lastUsedProjectId()).toBe('team-b');
			signIn('user-1');
			expect(lastUsedProjectId()).toBe('team-a');
		});

		it('replaces the remembered project with the newer one', () => {
			const { rememberChatProject, lastUsedProjectId } = useLastUsedProject();

			rememberChatProject('team-a');
			rememberChatProject('team-b');

			expect(lastUsedProjectId()).toBe('team-b');
		});

		it.each([
			['the personal project', 'personal-1'],
			['a project that the user cannot see', 'team-unknown'],
		])('keeps the remembered project for a chat in %s', (_case, projectId) => {
			storage.set(keyFor('user-1'), 'team-a');
			const { rememberChatProject } = useLastUsedProject();

			rememberChatProject(projectId);

			expect(storage.get(keyFor('user-1'))).toBe('team-a');
		});

		it('stores nothing without a signed-in user', () => {
			signIn(null);
			const { rememberChatProject, lastUsedProjectId } = useLastUsedProject();

			rememberChatProject('team-a');

			expect(storage.size).toBe(0);
			expect(localStorage.getItem).not.toHaveBeenCalled();
			expect(lastUsedProjectId()).toBeUndefined();
		});
	});

	describe('lastUsedProjectId', () => {
		it.each(['', '   '])('ignores the stored value %j', (value) => {
			storage.set(keyFor('user-1'), value);

			expect(useLastUsedProject().lastUsedProjectId()).toBeUndefined();
		});

		it('reads a value that another tab stored', () => {
			const { lastUsedProjectId } = useLastUsedProject();
			expect(lastUsedProjectId()).toBeUndefined();

			storage.set(keyFor('user-1'), 'team-b');

			expect(lastUsedProjectId()).toBe('team-b');
		});
	});

	describe('with storage that throws', () => {
		beforeEach(stubThrowingStorage);

		it('remembers nothing and does not throw', () => {
			const { rememberChatProject, lastUsedProjectId, simpleDefaultProjectId } =
				useLastUsedProject();

			expect(() => rememberChatProject('team-a')).not.toThrow();
			expect(lastUsedProjectId()).toBeUndefined();
			expect(simpleDefaultProjectId()).toBe('personal-1');
		});
	});

	describe('simpleDefaultProjectId', () => {
		it('gives the last-used team project', () => {
			storage.set(keyFor('user-1'), 'team-b');

			expect(useLastUsedProject().simpleDefaultProjectId()).toBe('team-b');
		});

		it('gives the personal project when nothing is remembered', () => {
			expect(useLastUsedProject().simpleDefaultProjectId()).toBe('personal-1');
		});

		it('checks the project list again on each call, so a lost create right counts at once', () => {
			storage.set(keyFor('user-1'), 'team-a');
			const { simpleDefaultProjectId } = useLastUsedProject();
			expect(simpleDefaultProjectId()).toBe('team-a');

			projectsStore.myProjects = [
				listItem('personal-1', 'personal', ['workflow:create']),
				listItem('team-a', 'team', ['workflow:read']),
			];

			expect(simpleDefaultProjectId()).toBe('personal-1');
		});

		it('gives the personal project when the remembered project was deleted', () => {
			storage.set(keyFor('user-1'), 'team-deleted');

			expect(useLastUsedProject().simpleDefaultProjectId()).toBe('personal-1');
		});

		it('gives the personal project when team projects are not licensed', () => {
			storage.set(keyFor('user-1'), 'team-a');
			projectsStore.isTeamProjectFeatureEnabled = false;

			expect(useLastUsedProject().simpleDefaultProjectId()).toBe('personal-1');
		});

		it("does not use another user's remembered project", () => {
			storage.set(keyFor('user-2'), 'team-a');

			expect(useLastUsedProject().simpleDefaultProjectId()).toBe('personal-1');
		});
	});

	describe('in a computed value', () => {
		// The storage listener of the composable ends with the scope, as in a component.
		let scope = effectScope();
		const inScope = () => {
			const result = scope.run(useLastUsedProject);
			if (!result) throw new Error('The effect scope is not active');
			return result;
		};

		beforeEach(() => {
			scope = effectScope();
		});

		afterEach(() => scope.stop());

		function storeInOtherTab(key: string | null, value: string | null) {
			if (key !== null && value !== null) storage.set(key, value);
			window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }));
		}

		it('follows a chat that starts in a team project', () => {
			const { rememberChatProject, simpleDefaultProjectId } = inScope();
			const projectId = computed(() => simpleDefaultProjectId());
			expect(projectId.value).toBe('personal-1');

			rememberChatProject('team-a');

			expect(projectId.value).toBe('team-a');
		});

		it('follows a lost create right', () => {
			storage.set(keyFor('user-1'), 'team-a');
			const { simpleDefaultProjectId } = inScope();
			const projectId = computed(() => simpleDefaultProjectId());
			expect(projectId.value).toBe('team-a');

			projectsStore.myProjects = [listItem('team-a', 'team', ['workflow:read'])];

			expect(projectId.value).toBe('personal-1');
		});

		it.each([
			['a chat that started in another tab', keyFor('user-1')],
			['another tab that cleared the storage', null],
		])('follows %s', (_case, key) => {
			const { lastUsedProjectId } = inScope();
			const projectId = computed(() => lastUsedProjectId());
			expect(projectId.value).toBeUndefined();

			storage.set(keyFor('user-1'), 'team-b');
			storeInOtherTab(key, key ? 'team-b' : null);

			expect(projectId.value).toBe('team-b');
		});

		it('does not run again for a change of another stored value', () => {
			const { lastUsedProjectId } = inScope();
			const read = vi.fn(lastUsedProjectId);
			const projectId = computed(() => read());
			expect(projectId.value).toBeUndefined();

			storeInOtherTab('n8n:sidebar:workspace-open', 'true');

			expect(projectId.value).toBeUndefined();
			expect(read).toHaveBeenCalledTimes(1);
		});
	});
});
