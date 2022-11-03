import { COMMANDS } from '@/constants';
import { Command, Undoable } from '@/Interface';
import { useHistoryStore } from '@/stores/history';
import { useWorkflowsStore } from '@/stores/workflows';
import { mapStores } from 'pinia';
import Vue from 'vue';

function getReversedCommand(command: Command): Undoable | undefined {
	if (command.data.action === COMMANDS.POSITION_CHANGE) {
		return {
			type: 'command',
			data: {
				action: COMMANDS.POSITION_CHANGE,
				options: {
					nodeName: command.data.options.nodeName,
					oldPosition: command.data.options.newPosition,
					newPosition: command.data.options.oldPosition,
				},
			},
		};
	}

	return undefined;
}

export const historyHelper = Vue.extend({
	computed: {
		...mapStores(
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
			if (event.metaKey && event.key === 'z') {
				event.preventDefault();
				if (event.shiftKey) {
					this.redo();
				} else {
					this.undo();
				}
			}
		},
		executeCommand(command: Command) {
			if (command.data.action === COMMANDS.POSITION_CHANGE) {
				this.$root.$emit('nodeMove', { nodeName: command.data.options.nodeName, position: command.data.options.oldPosition });
			}
		},
		async undo() {
			const command = this.historyStore.popUndoableToUndo();
			if (!command) {
				return;
			}
			if (command.type === 'bulk') {
				// todo
				return;
			}
			if (command.type === 'command') {
				this.executeCommand(command);
				const reverse = getReversedCommand(command);
				if (reverse) {
					this.historyStore.pushUndoableToRedo(reverse);
				}
			}
		},
		async redo() {
			const command = this.historyStore.popUndoableToRedo();
			if (!command) {
				return;
			}
			if (command.type === 'bulk') {
				// todo
				return;
			}
			if (command.type === 'command') {
				this.executeCommand(command);
				const reverse = getReversedCommand(command);
				if (reverse) {
					this.historyStore.pushUndoableToUndo(reverse, false);
				}
			}
		},
	},
});
