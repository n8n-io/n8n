import { BulkCommand } from '@/models/history';
import { useHistoryStore } from '@/stores/history';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { Command } from '@/models/history';
import { debounceHelper } from '@/mixins/debounce';
import { deviceSupportHelpers } from '@/mixins/deviceSupportHelpers';
import Vue from 'vue';

const UNDO_REDO_DEBOUNCE_INTERVAL = 100;

export const historyHelper = mixins(debounceHelper, deviceSupportHelpers).extend({
	computed: {
		...mapStores(
			useUIStore,
			useHistoryStore,
			useWorkflowsStore,
		),
	},
	mounted() {
		document.addEventListener('keydown', this.handleKeyDown);
	},
	destroyed() {
		document.removeEventListener('keydown', this.handleKeyDown);
	},
	methods: {
		handleKeyDown(event: KeyboardEvent) {
			if (this.isCtrlKeyPressed(event) && event.key === 'z') {
				event.preventDefault();
				if (event.shiftKey) {
					this.callDebounced('redo', { debounceTime: UNDO_REDO_DEBOUNCE_INTERVAL, trailing: true  });
				} else {
					this.callDebounced('undo', { debounceTime: UNDO_REDO_DEBOUNCE_INTERVAL, trailing: true  });
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
				return;
			}
			if (command instanceof Command) {
				await command.revert();
				this.historyStore.pushUndoableToRedo(command.getReverseCommand());
				this.uiStore.stateIsDirty = true;
			}
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
				this.historyStore.pushBulkCommandToUndo(new BulkCommand(reverseCommands));
				await Vue.nextTick();
				this.historyStore.bulkInProgress = false;
				return;
			}
			if (command instanceof Command) {
				await command.revert();
				this.historyStore.pushCommandToUndo(command.getReverseCommand());
				this.uiStore.stateIsDirty = true;
			}
		},
	},
});
