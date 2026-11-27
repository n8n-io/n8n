import { reactive, readonly } from 'vue';

// Module state, so that the project header of the shell can open the dialog of the list view.
const state = reactive<{ open: boolean; projectId: string | undefined }>({
	open: false,
	projectId: undefined,
});

/** Without a project id, the dialog lets the builder pick the project. */
export function openCreateMcpServerDialog(projectId?: string) {
	state.projectId = projectId;
	state.open = true;
}

export function useCreateMcpServerDialog() {
	return {
		state: readonly(state),
		open: openCreateMcpServerDialog,
		close: () => {
			state.open = false;
		},
	};
}
