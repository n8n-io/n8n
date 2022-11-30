import { BulkCommand, Command, Undoable, MoveNodeCommand } from "@/classes";
import { STORES } from "@/constants";
import { HistoryState, XYPosition } from "@/Interface";
import { defineStore } from "pinia";

const STACK_LIMIT = 100;

export const useHistoryStore = defineStore(STORES.HISTORY, {
	state: (): HistoryState => ({
		undoStack: [],
		redoStack: [],
		currentBulkAction: null,
	}),
	actions: {
		popUndoableToUndo(): Undoable | undefined {
			if (this.undoStack.length > 0) {
				return this.undoStack.pop();
			}

			return undefined;
		},
		pushCommandToUndo(undoable: Command, clearRedo = true): void {
			if (this.currentBulkAction) {
				this.currentBulkAction.commands.push(undoable);
				return;
			}
			this.undoStack.push(undoable);
			this.checkUndoStackLimit();
			if (clearRedo) {
				this.clearRedoStack();
			}
		},
		pushBulkCommandToUndo(undoable: BulkCommand, clearRedo = true): void {
			this.undoStack.push(undoable);
			this.checkUndoStackLimit();
			if (clearRedo) {
				this.clearRedoStack();
			}
		},
		checkUndoStackLimit() {
			if (this.undoStack.length > STACK_LIMIT) {
				this.undoStack.shift();
			}
		},
		checkRedoStackLimit() {
			if (this.redoStack.length > STACK_LIMIT) {
				this.redoStack.shift();
			}
		},
		clearUndoStack() {
			this.undoStack = [];
		},
		clearRedoStack() {
			this.redoStack = [];
		},
		reset() {
			this.clearRedoStack();
			this.clearUndoStack();
		},
		popUndoableToRedo(): Undoable | undefined {
			if (this.redoStack.length > 0) {
				return this.redoStack.pop();
			}
			return undefined;
		},
		pushUndoableToRedo(undoable: Undoable): void {
			this.redoStack.push(undoable);
			this.checkRedoStackLimit();
		},
		startRecordingUndo() {
			this.currentBulkAction = new BulkCommand([]);
		},
		stopRecordingUndo() {
			if (this.currentBulkAction) {
				this.undoStack.push(this.currentBulkAction);
				this.checkUndoStackLimit();
				this.clearRedoStack();
				this.currentBulkAction = null;
			}
		},
	},
});
