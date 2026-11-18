import type { TaskBoardSummary } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import type { ProjectSharingData } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';
import { useRouter } from 'vue-router';

import {
	createTaskBoardFromTemplate,
	fetchAllTaskBoards,
	fetchMyProjects,
} from '../task-board.api';
import { TASK_BOARD_VIEW } from '../task-board.constants';
import type { CreateTaskBoardPayload, TaskBoardListItem } from '../task-board.types';

/**
 * Lists every board the user can see and creates a board from a template.
 * A new board goes to the given project. Without one it goes to the user's personal project.
 */
export function useTaskBoards(projectId: MaybeRefOrGetter<string | undefined>) {
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();
	const router = useRouter();
	const permissions = capabilityRegistry.use(capabilities.projectPermissions);

	const boards = ref<TaskBoardSummary[]>([]);
	const projects = ref<ProjectSharingData[]>([]);
	const loading = ref(true);
	const creating = ref(false);

	const personalProjectId = computed(
		() => projects.value.find((project) => project.type === 'personal')?.id,
	);

	/** Where "New board" creates the board. */
	const targetProjectId = computed(
		() => toValue(projectId) ?? personalProjectId.value ?? permissions.defaultProjectId?.(),
	);

	// A board owns a dispatcher workflow, so creating one needs the workflow create scope.
	const canCreate = computed(() => {
		const id = targetProjectId.value;
		if (!id || permissions.isReadOnly()) return false;
		return getResourcePermissions(permissions.scopesFor(id)).workflow?.create === true;
	});

	const items = computed<TaskBoardListItem[]>(() =>
		boards.value.map((board) => ({
			...board,
			projectName: projects.value.find((project) => project.id === board.projectId)?.name ?? null,
		})),
	);

	async function loadProjects() {
		try {
			projects.value = await fetchMyProjects(rootStore.restApiContext);
		} catch {
			// Only the project names on the cards need this list. Without it the cards show no
			// project name, and "New board" falls back to the shell's default project.
			projects.value = [];
		}
	}

	async function load() {
		loading.value = true;
		try {
			const [list] = await Promise.all([
				fetchAllTaskBoards(rootStore.restApiContext),
				loadProjects(),
			]);
			boards.value = list;
		} catch (error) {
			toast.showError(error, i18n.baseText('taskBoard.list.error'));
		} finally {
			loading.value = false;
		}
	}

	/** Creates the board and opens it. Resolves `false` when the request fails. */
	async function createBoard(payload: CreateTaskBoardPayload): Promise<boolean> {
		const id = targetProjectId.value;
		if (!id) return false;
		creating.value = true;
		try {
			const board = await createTaskBoardFromTemplate(rootStore.restApiContext, id, payload);
			boards.value = [...boards.value, board];
			await router.push({
				name: TASK_BOARD_VIEW,
				params: { projectId: board.projectId, boardId: board.id },
			});
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('taskBoard.create.error'));
			return false;
		} finally {
			creating.value = false;
		}
	}

	return { items, loading, creating, canCreate, load, createBoard };
}
