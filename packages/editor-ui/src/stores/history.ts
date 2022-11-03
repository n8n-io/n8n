import { STORES } from "@/constants";
import { BulkCommands, Command, HistoryState, Undoable } from "@/Interface";
import { defineStore } from "pinia";

const STACK_LIMIT = 100;

export const useHistoryStore = defineStore(STORES.HISTORY, {
	state: (): HistoryState => ({
		undoStack: [],
		redoStack: [],
		currentBulkAction: null,
	}),
	getters: {
	},
	actions: {
		popUndoableToUndo(): Undoable | undefined {
			if (this.undoStack.length > 0) {
				return this.undoStack.pop();
			}

			return undefined;
		},
		pushUndoableToUndo(command: Command): void {
			if (this.currentBulkAction) {
				this.currentBulkAction.data.commands.push(command);
				return;
			}
			this.undoStack.push(command);
			this.checkUndoStackLimit();
		},
		checkUndoStackLimit() {
			if (this.undoStack.length > STACK_LIMIT) {
				this.undoStack.shift();
			}
		},
		popUndoableToRedo(): Undoable | undefined {
			if (this.redoStack.length > 0) {
				return this.redoStack.pop();
			}

			return undefined;
		},
		pushUndoableToRedo(command: Command): void {
			this.redoStack.push(command);
			if (this.redoStack.length > STACK_LIMIT) {
				this.redoStack.shift();
			}
		},
		startRecordingUndo(name: BulkCommands["data"]["name"]) {
			this.currentBulkAction = {
				type: 'bulk',
				data: {
					name,
					commands: [],
				},
			};
		},
		stopRecordingUndo() {
			if (this.currentBulkAction) {
				this.undoStack.push(this.currentBulkAction);
				this.checkUndoStackLimit();
				this.currentBulkAction = null;
			}
		},
	},
});
