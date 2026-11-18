import { useToast } from '@n8n/composables/useToast';
import { useMessage } from '@n8n/design-system';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { deleteTaskBoard } from '../../task-board.api';
import { TASK_BOARDS_VIEW } from '../../task-board.constants';
import { useTaskBoardStore } from '../../task-board.store';

/** The Settings page: the details of the board on screen, and "Delete board". */
export function useTaskBoardSettingsView() {
	const { board } = storeToRefs(useTaskBoardStore());
	const rootStore = useRootStore();
	const router = useRouter();
	const toast = useToast();
	const message = useMessage();
	const i18n = useI18n();
	const permissions = capabilityRegistry.use(capabilities.projectPermissions);

	const deleting = ref(false);

	// The endpoint needs the workflow delete scope, as a board owns a workflow.
	const canDelete = computed(() => {
		if (!board.value || permissions.isReadOnly()) return false;
		const scopes = permissions.scopesFor(board.value.projectId);
		return getResourcePermissions(scopes).workflow?.delete === true;
	});

	/** Asks first. After the delete, the Tasks area opens another board. */
	async function deleteBoard() {
		const target = board.value;
		if (!target) return;
		const answer = await message.confirm(
			i18n.baseText('taskBoard.settings.delete.message', { interpolate: { name: target.name } }),
			i18n.baseText('taskBoard.settings.delete.title'),
			{
				confirmButtonText: i18n.baseText('taskBoard.settings.delete.confirm'),
				cancelButtonText: i18n.baseText('generic.cancel'),
				type: 'warning',
			},
		);
		if (answer !== 'confirm') return;

		deleting.value = true;
		try {
			await deleteTaskBoard(rootStore.restApiContext, {
				projectId: target.projectId,
				boardId: target.id,
			});
			toast.showMessage({
				title: i18n.baseText('taskBoard.settings.delete.success', {
					interpolate: { name: target.name },
				}),
				type: 'success',
			});
			await router.push({ name: TASK_BOARDS_VIEW });
		} catch (error) {
			toast.showError(error, i18n.baseText('taskBoard.settings.delete.error'));
		} finally {
			deleting.value = false;
		}
	}

	return { board, canDelete, deleting, deleteBoard };
}
