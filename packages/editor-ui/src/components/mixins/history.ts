import { COMMANDS } from '@/constants';
import { Command, Undoable } from '@/Interface';
import { useHistoryStore } from '@/stores/history';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { mapStores } from 'pinia';
import Vue from 'vue';

function getReversedCommand(command: Command): Command | undefined {
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
	else if (command.data.action === COMMANDS.ADD_NODE) {
		return {
			type: 'command',
			data: {
				action: COMMANDS.REMOVE_NODE,
				options: command.data.options,
			},
		};
	}
	else if (command.data.action === COMMANDS.REMOVE_NODE) {
		return {
			type: 'command',
			data: {
				action: COMMANDS.ADD_NODE,
				options: command.data.options,
			},
		};
	}

	if (command.data.action === COMMANDS.ADD_CONNECTION) {
		return {
			type: 'command',
			data: {
				action: COMMANDS.REMOVE_CONNECTION,
				options: {
					...command.data.options,
				},
			},
		};
	}

	if (command.data.action === COMMANDS.REMOVE_CONNECTION) {
		return {
			type: 'command',
			data: {
				action: COMMANDS.ADD_CONNECTION,
				options: {
					...command.data.options,
				},
			},
		};
	}

	return undefined;
}

export const historyHelper = Vue.extend({
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
			if (event.metaKey && event.key === 'z') {
				event.preventDefault();
				if (event.shiftKey) {
					this.redo();
				} else {
					this.undo();
				}
			}
		},
		revertCommand(command: Command) {
			if (command.data.action === COMMANDS.POSITION_CHANGE) {
				this.$root.$emit('nodeMove', { nodeName: command.data.options.nodeName, position: command.data.options.oldPosition });
			}
			else if (command.data.action === COMMANDS.ADD_CONNECTION) {
				this.$root.$emit('removeConnection', command.data.options);
			}
			else if (command.data.action === COMMANDS.REMOVE_CONNECTION) {
				this.$root.$emit('addConnection', command.data.options);
			}
			else if (command.data.action === COMMANDS.ADD_NODE) {
				this.$root.$emit('removeNode', command.data.options);
			}
			else if (command.data.action === COMMANDS.REMOVE_NODE) {
				this.$root.$emit('addNode', command.data.options);
			}
		},
		async undo() {
			const command = this.historyStore.popUndoableToUndo();
			if (!command) {
				return;
			}
			if (command.type === 'bulk') {
				const commands = command.data.commands;
				const reverseCommands = [];
				for (let i = commands.length - 1; i >= 0; i--) {
					this.revertCommand(commands[i]);
					const reverse = getReversedCommand(commands[i]);
					if (reverse) {
						reverseCommands.push(reverse);
					}
				}
				this.historyStore.pushUndoableToRedo({
					type: 'bulk',
					data: {
						name: command.data.name,
						commands: reverseCommands,
					},
				});
				return;
			}
			if (command.type === 'command') {
				this.revertCommand(command);
				const reverse = getReversedCommand(command);
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
			if (command.type === 'bulk') {
				const commands = command.data.commands;
				const reverseCommands = [];
				for (let i = commands.length - 1; i >= 0; i--) {
					this.revertCommand(commands[i]);
					const reverse = getReversedCommand(commands[i]);
					if (reverse) {
						reverseCommands.push(reverse);
					}
				}
				this.historyStore.pushBulkCommandToUndo({
					type: 'bulk',
					data: {
						name: command.data.name,
						commands: reverseCommands,
					},
				});
				return;
			}
			if (command.type === 'command') {
				this.revertCommand(command);
				const reverse = getReversedCommand(command);
				if (reverse) {
					this.historyStore.pushCommandToUndo(reverse, false);
				}
				this.uiStore.stateIsDirty = true;
			}
		},
	},
});
