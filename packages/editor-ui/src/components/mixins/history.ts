import { COMMANDS } from '@/constants';
import { Undoable } from '@/Interface';
import { useHistoryStore } from '@/stores/history';
import { useWorkflowsStore } from '@/stores/workflows';
import { mapStores } from 'pinia';
import Vue from 'vue';

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
	methods: {
		handleKeyDown(event: KeyboardEvent) {
			if (event.metaKey && event.key === 'z') {
				event.preventDefault();
				const command = this.historyStore.popUndoableToUndo();
				if (command) {
					// this.historyStore.pushUndoableToRedo(command);
					this.undo(command);
				}
			}
			// else if (event.ctrlKey && event.key === 'y') {
			// 	console.log('REDO');

			// }
		},
		async undo(command: Undoable) {
			// todo
			if (command.type === 'command') {
				if (command.data.action === COMMANDS.POSITION_CHANGE) {
					this.$root.$emit('nodeMove', { nodeName: command.data.options.nodeName, position: command.data.options.oldPosition });
				}
			}
		},
		async redo() {
			// todo
		},
	},
});
