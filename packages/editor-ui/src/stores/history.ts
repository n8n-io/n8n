import { COMMANDS, STORES } from "@/constants";
import { BulkCommands, Command, HistoryState, Undoable, XYPosition } from "@/Interface";
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
		pushUndoableToUndo(undoable: Undoable): void {
			if (this.currentBulkAction) {
				this.currentBulkAction.data.commands.push(undoable);
				return;
			}
			this.undoStack.push(undoable);
			this.checkUndoStackLimit();
			this.clearRedoStack();
		},
		checkUndoStackLimit() {
			if (this.undoStack.length > STACK_LIMIT) {
				this.undoStack.shift();
			}
		},
		clearUndoStack() {
			this.undoStack = [];
		},
		clearRedoStack() {
			this.redoStack = [];
		},
		popUndoableToRedo(): Undoable | undefined {
			if (this.redoStack.length > 0) {
				return this.redoStack.pop();
			}

			return undefined;
		},
		pushUndoableToRedo(undoable: Undoable): void {
			this.redoStack.push(undoable);
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
		updateNodePosition(nodeName: string, oldPosition: XYPosition, newPosition: XYPosition) {
			this.pushUndoableToUndo({
				type: 'command',
				data: {
					action: COMMANDS.POSITION_CHANGE,
					options: {
						nodeName,
						oldPosition,
						newPosition,
					},
				},
			});
		},
	},
});
