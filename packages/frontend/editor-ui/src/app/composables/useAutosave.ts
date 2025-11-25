import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useWorkflowSaving } from './useWorkflowSaving';
import { useMessage } from './useMessage';
import { useI18n } from '@n8n/i18n';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/app/constants';
import { getResourcePermissions } from '@n8n/permissions';

const AUTOSAVE_INTERVAL_MS = 60000; // 60 seconds

export function useAutosave() {
	const router = useRouter();
	const uiStore = useUIStore();
	const workflowsStore = useWorkflowsStore();
	const usersStore = useUsersStore();
	const sourceControlStore = useSourceControlStore();
	const { saveCurrentWorkflow } = useWorkflowSaving({ router });
	const message = useMessage();
	const i18n = useI18n();

	// State
	const isAutosaving = ref(false);
	const lastAutosaveTime = ref<Date | null>(null);
	const autosaveTimerId = ref<ReturnType<typeof setTimeout> | null>(null);

	// Computed
	const isAutosaveEnabled = computed(() => {
		const setting = usersStore.currentUser?.settings?.autosaveEnabled;
		// Default to true if undefined
		return setting !== false;
	});

	const canAutosave = computed(() => {
		const workflowId = workflowsStore.workflowId;
		const isNewWorkflow =
			!workflowId || workflowId === 'new' || workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID;
		const isExecuting = workflowsStore.isWorkflowRunning;
		const isDirty = uiStore.stateIsDirty;
		const isSaving = uiStore.activeActions.includes('workflowSaving');
		const isReadOnly = sourceControlStore.preferences.branchReadOnly;
		const isArchived = workflowsStore.workflow.isArchived;
		const hasUpdatePermission = getResourcePermissions(workflowsStore.workflow.scopes).workflow
			.update;

		return (
			isAutosaveEnabled.value &&
			!isNewWorkflow &&
			!isExecuting &&
			isDirty &&
			!isSaving &&
			!isReadOnly &&
			!isArchived &&
			hasUpdatePermission
		);
	});

	// Methods
	async function performAutosave(): Promise<boolean> {
		if (!canAutosave.value) {
			return false;
		}

		isAutosaving.value = true;

		try {
			// Pass redirect=false to avoid navigation, forceSave=false for normal save
			const success = await saveCurrentWorkflow({}, false, false);

			if (success) {
				lastAutosaveTime.value = new Date();
			} else {
				// Show error modal
				await message.alert(
					i18n.baseText('autosave.error.message'),
					i18n.baseText('autosave.error.title'),
					{ type: 'error' },
				);
			}

			return success;
		} catch (error) {
			await message.alert(
				i18n.baseText('autosave.error.message'),
				i18n.baseText('autosave.error.title'),
				{ type: 'error' },
			);
			return false;
		} finally {
			isAutosaving.value = false;
		}
	}

	function startAutosaveTimer() {
		stopAutosaveTimer();

		if (!isAutosaveEnabled.value) {
			return;
		}

		autosaveTimerId.value = setTimeout(async () => {
			await performAutosave();
			// Always restart timer if autosave is enabled
			// The watch will stop it when workflow becomes clean
			if (isAutosaveEnabled.value) {
				startAutosaveTimer();
			}
		}, AUTOSAVE_INTERVAL_MS);
	}

	function stopAutosaveTimer() {
		if (autosaveTimerId.value) {
			clearTimeout(autosaveTimerId.value);
			autosaveTimerId.value = null;
		}
	}

	function resetAutosaveTimer() {
		// Called after manual save - just stop the timer
		// The watch will restart it when workflow becomes dirty again
		stopAutosaveTimer();
	}

	// Watch for dirty state changes to manage timer
	watch(
		() => uiStore.stateIsDirty,
		(isDirty) => {
			if (isDirty && isAutosaveEnabled.value) {
				// Only start timer if not already running
				if (!autosaveTimerId.value) {
					startAutosaveTimer();
				}
			} else if (!isDirty) {
				stopAutosaveTimer();
			}
		},
	);

	// Watch for autosave setting changes
	watch(isAutosaveEnabled, (enabled) => {
		if (enabled && uiStore.stateIsDirty) {
			startAutosaveTimer();
		} else if (!enabled) {
			stopAutosaveTimer();
		}
	});

	// Cleanup on unmount
	onBeforeUnmount(() => {
		stopAutosaveTimer();
	});

	return {
		isAutosaving,
		lastAutosaveTime,
		isAutosaveEnabled,
		canAutosave,
		startAutosaveTimer,
		stopAutosaveTimer,
		resetAutosaveTimer,
		performAutosave,
	};
}
