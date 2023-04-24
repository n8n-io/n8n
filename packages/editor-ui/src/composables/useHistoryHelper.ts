import { MAIN_HEADER_TABS } from '@/constants';
import { useNDVStore } from '@/stores/ndv';
import type { Undoable } from '@/models/history';
import { BulkCommand } from '@/models/history';
import { useHistoryStore } from '@/stores/history';
import { useUIStore } from '@/stores/ui';

import { ref, onMounted, onUnmounted, Ref, nextTick, getCurrentInstance } from 'vue';
import { Command } from '@/models/history';
import { useDebounceHelper } from './useDebounce';
import useDeviceSupportHelpers from './useDeviceSupport';
import { getNodeViewTab } from '@/utils';
import type { Route } from 'vue-router';

const UNDO_REDO_DEBOUNCE_INTERVAL = 100;

export function useHistoryHelper(activeRoute: Route) {
	const instance = getCurrentInstance();
	const telemetry = instance?.proxy.$telemetry;

	const ndvStore = useNDVStore();
	const historyStore = useHistoryStore();
	const uiStore = useUIStore();

	const { callDebounced } = useDebounceHelper();
	const { isCtrlKeyPressed } = useDeviceSupportHelpers();

	const isNDVOpen = ref<boolean>(ndvStore.activeNodeName !== null);

	const undo = () =>
		callDebounced(
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

	const redo = () =>
		callDebounced(
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
			telemetry?.track(`User hit ${type}`, { commands_length: 1, commands: [command.name] });
		} else if (command instanceof BulkCommand) {
			telemetry?.track(`User hit ${type}`, {
				commands_length: command.commands.length,
				commands: command.commands.map((c) => c.name),
			});
		}
	}

	function trackUndoAttempt(event: KeyboardEvent) {
		if (isNDVOpen.value && !event.shiftKey) {
			const activeNode = ndvStore.activeNode;
			if (activeNode) {
				telemetry?.track('User hit undo in NDV', { node_type: activeNode.type });
			}
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		const currentNodeViewTab = getNodeViewTab(activeRoute);

		if (event.repeat || currentNodeViewTab !== MAIN_HEADER_TABS.WORKFLOW) return;
		if (isCtrlKeyPressed(event) && event.key.toLowerCase() === 'z') {
			event.preventDefault();
			if (!isNDVOpen.value) {
				if (event.shiftKey) {
					redo();
				} else {
					undo();
				}
			} else if (!event.shiftKey) {
				trackUndoAttempt(event);
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
