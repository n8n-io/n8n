import { VIEWS } from '@n8n/frontend-constants/views';
import type { IMenuItem, SelectItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useLocalStorage } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useTaskBoards } from '../../composables/useTaskBoards';
import { useTaskInbox } from '../../composables/useTaskInbox';
import {
	LAST_BOARD_STORAGE_KEY,
	NEW_BOARD_VALUE,
	TASK_BOARD_INBOX_VIEW,
	TASK_BOARD_PAGE_VIEWS,
	TASK_BOARD_SETTINGS_VIEW,
	TASK_BOARD_TEAM_VIEW,
	TASK_BOARD_VIEW,
} from '../../task-board.constants';
import type { CreateTaskBoardPayload, TaskBoardRef } from '../../task-board.types';
import { groupBoardsByProject, pickBoardToOpen } from '../../task-board.utils';

function stringParam(value: unknown): string | undefined {
	return typeof value === 'string' && value ? value : undefined;
}

/**
 * The Tasks area: the board select, the page links of the sidebar, and the board to open
 * when the route names none.
 */
export function useTasksShell() {
	const route = useRoute();
	const router = useRouter();
	const i18n = useI18n();

	const projectId = computed(() => stringParam(route.params.projectId));
	const boardId = computed(() => stringParam(route.params.boardId));
	const boardRef = computed<TaskBoardRef | undefined>(() =>
		projectId.value && boardId.value
			? { projectId: projectId.value, boardId: boardId.value }
			: undefined,
	);

	const boards = useTaskBoards(projectId);
	const inbox = useTaskInbox();
	const lastBoardId = useLocalStorage<string | null>(LAST_BOARD_STORAGE_KEY, null);
	const newBoardDialogOpen = ref(false);

	async function openBoard(target: TaskBoardRef, replace = false) {
		const name = TASK_BOARD_PAGE_VIEWS.find((view) => view === route.name) ?? TASK_BOARD_VIEW;
		const to = { name, params: target };
		await (replace ? router.replace(to) : router.push(to));
	}

	async function selectBoard(id: string) {
		const board = boards.items.value.find((item) => item.id === id);
		if (board && board.id !== boardId.value) {
			await openBoard({ projectId: board.projectId, boardId: board.id });
		}
	}

	watch(
		[boardId, boards.loading],
		async ([id, loading]) => {
			if (id) {
				lastBoardId.value = id;
				return;
			}
			if (loading) return;
			const board = pickBoardToOpen(boards.items.value, {
				projectId: projectId.value,
				lastBoardId: lastBoardId.value,
			});
			if (board) await openBoard({ projectId: board.projectId, boardId: board.id }, true);
		},
		{ immediate: true },
	);

	onMounted(boards.load);

	const boardItems = computed<SelectItem[]>(() => {
		const groups = groupBoardsByProject(boards.items.value);
		return [
			...groups,
			...(groups.length > 0 ? [{ type: 'separator' as const }] : []),
			{
				value: NEW_BOARD_VALUE,
				label: i18n.baseText('taskBoard.list.newBoard'),
				icon: 'plus',
				disabled: !boards.canCreate.value,
				// An action, not a board: the select keeps its value.
				onSelect: (event: Event) => {
					event.preventDefault();
					newBoardDialogOpen.value = true;
				},
			},
		];
	});

	function pageItem(name: string, label: string, icon: IMenuItem['icon']): IMenuItem {
		return {
			id: name,
			label,
			icon,
			disabled: !boardRef.value,
			route: boardRef.value ? { to: { name, params: boardRef.value } } : undefined,
		};
	}

	const pageItems = computed<IMenuItem[]>(() => [
		{
			...pageItem(TASK_BOARD_INBOX_VIEW, i18n.baseText('taskBoard.nav.inbox'), 'inbox'),
			notification: inbox.tasks.value.length > 0,
		},
		pageItem(TASK_BOARD_VIEW, i18n.baseText('taskBoard.nav.issues'), 'list-checks'),
		pageItem(TASK_BOARD_TEAM_VIEW, i18n.baseText('taskBoard.nav.team'), 'users'),
	]);

	const footerItems = computed<IMenuItem[]>(() => [
		pageItem(TASK_BOARD_SETTINGS_VIEW, i18n.baseText('taskBoard.nav.settings'), 'settings'),
		{
			id: 'task-board-back',
			label: i18n.baseText('taskBoard.nav.back'),
			icon: 'arrow-left',
			route: { to: { name: VIEWS.HOMEPAGE } },
		},
	]);

	const activePage = computed(() => (typeof route.name === 'string' ? route.name : undefined));

	async function createBoard(payload: CreateTaskBoardPayload) {
		if (await boards.createBoard(payload)) newBoardDialogOpen.value = false;
	}

	return {
		boardRef,
		boardId,
		boardItems,
		pageItems,
		footerItems,
		activePage,
		loading: boards.loading,
		creating: boards.creating,
		canCreate: boards.canCreate,
		newBoardDialogOpen,
		selectBoard,
		createBoard,
	};
}
