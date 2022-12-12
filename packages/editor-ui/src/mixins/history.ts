import { MAIN_HEADER_TABS } from './../constants';
import { useNDVStore } from '@/stores/ndv';
import { BulkCommand, Undoable } from '@/models/history';
import { useHistoryStore } from '@/stores/history';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { Command } from '@/models/history';
import { debounceHelper } from '@/mixins/debounce';
import { deviceSupportHelpers } from '@/mixins/deviceSupportHelpers';
import Vue from 'vue';
import { getNodeViewTab } from '@/utils';

const UNDO_REDO_DEBOUNCE_INTERVAL = 100;

export const historyHelper = mixins(debounceHelper, deviceSupportHelpers).extend({
	computed: {
		...mapStores(
			useNDVStore,
			useHistoryStore,
			useUIStore,
			useWorkflowsStore,
		),
		isNDVOpen(): boolean {
			return this.ndvStore.activeNodeName !== null;
		},
	},
	mounted() {
		document.addEventListener('keydown', this.handleKeyDown);
	},
	destroyed() {
		document.removeEventListener('keydown', this.handleKeyDown);
	},
	methods: {
		handleKeyDown(event: KeyboardEvent) {
			const currentNodeViewTab = getNodeViewTab(this.$route);

			if (event.repeat || currentNodeViewTab !== MAIN_HEADER_TABS.WORKFLOW) return;
			if (this.isCtrlKeyPressed(event) && event.key === 'z') {
				event.preventDefault();
				if (!this.isNDVOpen) {
					if (event.shiftKey) {
						this.callDebounced('redo', { debounceTime: UNDO_REDO_DEBOUNCE_INTERVAL, trailing: true  });
					} else {
						this.callDebounced('undo', { debounceTime: UNDO_REDO_DEBOUNCE_INTERVAL, trailing: true  });
					}
				} else if (!event.shiftKey) {
					this.trackUndoAttempt(event);
				}
			}
		},
		async undo() {
			const command = this.historyStore.popUndoableToUndo();
			if (!command) {
				return;
			}
			if (command instanceof BulkCommand) {
				this.historyStore.bulkInProgress = true;
				const commands = command.commands;
				const reverseCommands: Command[] = [];
				for (let i = commands.length - 1; i >= 0; i--) {
					await commands[i].revert();
					reverseCommands.push(commands[i].getReverseCommand());
				}
				this.historyStore.pushUndoableToRedo(new BulkCommand(reverseCommands));
				await Vue.nextTick();
				this.historyStore.bulkInProgress = false;
			}
			if (command instanceof Command) {
				await command.revert();
				this.historyStore.pushUndoableToRedo(command.getReverseCommand());
				this.uiStore.stateIsDirty = true;
			}
			this.trackCommand(command, 'undo');
		},
		async redo() {
			const command = this.historyStore.popUndoableToRedo();
			if (!command) {
				return;
			}
			if (command instanceof BulkCommand) {
				this.historyStore.bulkInProgress = true;
				const commands = command.commands;
				const reverseCommands = [];
				for (let i = commands.length - 1; i >= 0; i--) {
					await commands[i].revert();
					reverseCommands.push(commands[i].getReverseCommand());
				}
				this.historyStore.pushBulkCommandToUndo(new BulkCommand(reverseCommands), false);
				await Vue.nextTick();
				this.historyStore.bulkInProgress = false;
			}
			if (command instanceof Command) {
				await command.revert();
				this.historyStore.pushCommandToUndo(command.getReverseCommand(), false);
				this.uiStore.stateIsDirty = true;
			}
			this.trackCommand(command, 'redo');
		},
		trackCommand(command: Undoable, type: 'undo'|'redo'): void {
			if (command instanceof Command) {
				this.$telemetry.track(`User hit ${type}`, { commands_length: 1, commands: [ command.name ] });
			} else if (command instanceof BulkCommand) {
				this.$telemetry.track(`User hit ${type}`, { commands_length: command.commands.length, commands: command.commands.map(c => c.name) });
			}
		},
		trackUndoAttempt(event: KeyboardEvent) {
			if (this.isNDVOpen && !event.shiftKey) {
				const activeNode = this.ndvStore.activeNode;
				if (activeNode) {
					this.$telemetry.track(`User hit undo in NDV`, { node_type: activeNode.type });
				}
			}
		},
	},
});
