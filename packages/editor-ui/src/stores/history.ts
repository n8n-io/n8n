import { AddConnectionCommand, COMMANDS, RemoveConnectionCommand } from './../models/history';
import { BulkCommand, Command, Undoable, MoveNodeCommand } from "@/models/history";
import { STORES } from "@/constants";
import { HistoryState } from "@/Interface";
import { defineStore } from "pinia";

const STACK_LIMIT = 100;

export const useHistoryStore = defineStore(STORES.HISTORY, {
	state: (): HistoryState => ({
		undoStack: [],
		redoStack: [],
		currentBulkAction: null,
		bulkInProgress: false,
	}),
	getters: {
		currentBulkContainsConnectionCommand() {
			return (command: AddConnectionCommand): boolean => {
				if (this.currentBulkAction) {
					const existing = this.currentBulkAction.commands.find(c =>
						(c instanceof AddConnectionCommand || c instanceof RemoveConnectionCommand) &&
						c.name === command.name &&
						c.connectionData[0].node === command.connectionData[0].node &&
						c.connectionData[1].node === command.connectionData[1].node &&
						c.connectionData[0].index === command.connectionData[0].index &&
						c.connectionData[1].index === command.connectionData[1].index,
					);
					console.log(existing);
					return existing !== undefined;
				}
				return false;
			};
		},
	},
	actions: {
		popUndoableToUndo(): Undoable | undefined {
			if (this.undoStack.length > 0) {
				return this.undoStack.pop();
			}

			return undefined;
		},
		pushCommandToUndo(undoable: Command, clearRedo = false): void {
			if (!this.bulkInProgress) {
				if (this.currentBulkAction) {
					this.currentBulkAction.commands.push(undoable);
					return;
				} else {
					this.undoStack.push(undoable);
				}
				this.checkUndoStackLimit();
				if (clearRedo) {
					this.clearRedoStack();
				}
			}
		},
		pushBulkCommandToUndo(undoable: BulkCommand, clearRedo = false): void {
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
			if (this.currentBulkAction && this.currentBulkAction.commands.length > 0) {
				this.undoStack.push(this.currentBulkAction);
				this.checkUndoStackLimit();
			}
			this.currentBulkAction = null;
		},
	},
});
