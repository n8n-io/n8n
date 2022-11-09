import { COMMANDS } from '@/constants';
import { Command, Undoable } from '@/Interface';
import { useHistoryStore } from '@/stores/history';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { deviceSupportHelpers } from '@/components/mixins/deviceSupportHelpers';

interface WaitForCommand {
	type: 'waitForIt';
}

function getReversedCommand(command: Command): Command | WaitForCommand {
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

	return {
		type: 'waitForIt',
	};
}

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

				this.historyStore.waitForRedo();
				this.historyStore.startRecordingUndo(command.data.name);

				for (let i = commands.length - 1; i >= 0; i--) {
					const reverse = getReversedCommand(commands[i]);
					if (reverse.type !== 'waitForIt') {
						this.historyStore.trackHistoryEvent(reverse, true);
					}

					this.revertCommand(commands[i]);
				}

				this.historyStore.stopRecordingUndo();
				return;
			}

			if (command.type === 'command') {
				const reverse = getReversedCommand(command);
				if (reverse.type === 'waitForIt') {
					this.historyStore.waitForRedo();
				}
				else {
					this.historyStore.trackHistoryEvent(reverse, true);
				}
				this.revertCommand(command);
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

				this.historyStore.startRecordingUndo(command.data.name);

				for (let i = commands.length - 1; i >= 0; i--) {
					const reverse = getReversedCommand(commands[i]);
					if (reverse.type !== 'waitForIt') {
						this.historyStore.trackHistoryEvent(reverse);
					}
				}

				this.historyStore.stopRecordingUndo();
				return;
			}

			if (command.type === 'command') {
				this.revertCommand(command);
				const reverse = getReversedCommand(command);
				if (reverse.type !== 'waitForIt') {
					this.historyStore.trackHistoryEvent(reverse);
				}
				this.uiStore.stateIsDirty = true;
			}
		},
	},
});
