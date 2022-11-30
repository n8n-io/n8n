import { BulkCommand } from '@/models/history';
import { useHistoryStore } from '@/stores/history';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { deviceSupportHelpers } from '@/mixins/deviceSupportHelpers';
import { Command } from '@/models/history';

export const historyHelper = mixins(deviceSupportHelpers).extend({
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
					this.redo();
				} else {
					this.undo();
				}
			}
		},
		revertCommand(command: Command) {
			const eventData = command.getRevertEventData();
			if (eventData) {
				this.$root.$emit(eventData.eventName, eventData.data);
			}
		},
		async undo() {
			const command = this.historyStore.popUndoableToUndo();
			if (!command) {
				return;
			}
			if (command instanceof BulkCommand) {
				const commands = command.commands;
				const reverseCommands: Command[] = [];
				for (let i = commands.length - 1; i >= 0; i--) {
					this.revertCommand(commands[i]);
					const reverse = commands[i].getReverseCommand();
					if (reverse) {
						reverseCommands.push(reverse);
					}
				}
				this.historyStore.pushUndoableToRedo(new BulkCommand(reverseCommands));
				return;
			}
			if (command instanceof Command) {
				this.revertCommand(command);
				const reverse = command.getReverseCommand();
				if (reverse) {
					this.historyStore.pushUndoableToRedo(reverse);
				}
				this.uiStore.stateIsDirty = true;
			}
		},
		async redo() {
			const command = this.historyStore.popUndoableToRedo();
			if (!command) {
				return;
			}
			if (command instanceof BulkCommand) {
				const commands = command.commands;
				const reverseCommands = [];
				for (let i = commands.length - 1; i >= 0; i--) {
					this.revertCommand(commands[i]);
					const reverse = commands[i].getReverseCommand();
					if (reverse) {
						reverseCommands.push(reverse);
					}
				}
				this.historyStore.pushBulkCommandToUndo(new BulkCommand(reverseCommands), false);
				return;
			}
			if (command instanceof Command) {
				this.revertCommand(command);
				const reverse = command.getReverseCommand();
				if (reverse) {
					this.historyStore.pushCommandToUndo(reverse, false);
				}
				this.uiStore.stateIsDirty = true;
			}
		},
	},
});
