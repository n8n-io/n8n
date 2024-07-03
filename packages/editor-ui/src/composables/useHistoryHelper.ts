import { MAIN_HEADER_TABS } from '@/constants';
import { useNDVStore } from '@/stores/ndv.store';
import type { Undoable } from '@/models/history';
import { BulkCommand, Command } from '@/models/history';
import { useHistoryStore } from '@/stores/history.store';
import { useUIStore } from '@/stores/ui.store';

import { onMounted, onUnmounted, nextTick } from 'vue';
import { useDeviceSupport } from 'n8n-design-system';
import { getNodeViewTab } from '@/utils/canvasUtils';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { useTelemetry } from './useTelemetry';
import { useDebounce } from '@/composables/useDebounce';

const UNDO_REDO_DEBOUNCE_INTERVAL = 100;
const ELEMENT_UI_OVERLAY_SELECTOR = '.el-overlay';

export function useHistoryHelper(activeRoute: RouteLocationNormalizedLoaded) {
	const telemetry = useTelemetry();

	const ndvStore = useNDVStore();
	const historyStore = useHistoryStore();
	const uiStore = useUIStore();

	const { callDebounced } = useDebounce();
	const { isCtrlKeyPressed } = useDeviceSupport();

	const undo = async () =>
		await callDebounced(
			async () => {
				const command = historyStore.popUndoableToUndo();
				if (!command) {
					return;
				}
				if (command instanceof BulkCommand) {
					historyStore.bulkInProgress = true;
					const commands = command.commands;
					const reverseCommands: Command[] = [];
					for (let i = commands.length - 1; i >= 0; i--) {
						await commands[i].revert();
						reverseCommands.push(commands[i].getReverseCommand());
					}
					historyStore.pushUndoableToRedo(new BulkCommand(reverseCommands));
					await nextTick();
					historyStore.bulkInProgress = false;
				}
				if (command instanceof Command) {
					await command.revert();
					historyStore.pushUndoableToRedo(command.getReverseCommand());
					uiStore.stateIsDirty = true;
				}
				trackCommand(command, 'undo');
			},
			{ debounceTime: UNDO_REDO_DEBOUNCE_INTERVAL },
		);

	const redo = async () =>
		await callDebounced(
			async () => {
				const command = historyStore.popUndoableToRedo();
				if (!command) {
					return;
				}
				if (command instanceof BulkCommand) {
					historyStore.bulkInProgress = true;
					const commands = command.commands;
					const reverseCommands = [];
					for (let i = commands.length - 1; i >= 0; i--) {
						await commands[i].revert();
						reverseCommands.push(commands[i].getReverseCommand());
					}
					historyStore.pushBulkCommandToUndo(new BulkCommand(reverseCommands), false);
					await nextTick();
					historyStore.bulkInProgress = false;
				}
				if (command instanceof Command) {
					await command.revert();
					historyStore.pushCommandToUndo(command.getReverseCommand(), false);
					uiStore.stateIsDirty = true;
				}
				trackCommand(command, 'redo');
			},
			{ debounceTime: UNDO_REDO_DEBOUNCE_INTERVAL },
		);

	function trackCommand(command: Undoable, type: 'undo' | 'redo'): void {
		if (command instanceof Command) {
			telemetry.track(`User hit ${type}`, { commands_length: 1, commands: [command.name] });
		} else if (command instanceof BulkCommand) {
			telemetry.track(`User hit ${type}`, {
				commands_length: command.commands.length,
				commands: command.commands.map((c) => c.name),
			});
		}
	}

	function trackUndoAttempt() {
		const activeNode = ndvStore.activeNode;
		if (activeNode) {
			telemetry?.track('User hit undo in NDV', { node_type: activeNode.type });
		}
	}

	/**
	 * Checks if there is a Element UI dialog open by querying
	 * for the visible overlay element.
	 */
	function isMessageDialogOpen(): boolean {
		return (
			document.querySelector(`${ELEMENT_UI_OVERLAY_SELECTOR}:not([style*="display: none"])`) !==
			null
		);
	}

	function handleKeyDown(event: KeyboardEvent) {
		const currentNodeViewTab = getNodeViewTab(activeRoute);
		const isNDVOpen = ndvStore.isNDVOpen;
		const isAnyModalOpen = uiStore.isAnyModalOpen || isMessageDialogOpen();
		const undoKeysPressed = isCtrlKeyPressed(event) && event.key.toLowerCase() === 'z';

		if (event.repeat || currentNodeViewTab !== MAIN_HEADER_TABS.WORKFLOW) return;
		if (isNDVOpen || isAnyModalOpen) {
			if (isNDVOpen && undoKeysPressed && !event.shiftKey) {
				trackUndoAttempt();
			}
			return;
		}
		if (undoKeysPressed) {
			event.preventDefault();
			if (event.shiftKey) {
				void redo();
			} else {
				void undo();
			}
		}
	}

	onMounted(() => {
		document.addEventListener('keydown', handleKeyDown);
	});

	onUnmounted(() => {
		document.removeEventListener('keydown', handleKeyDown);
	});

	return {
		undo,
		redo,
	};
}
