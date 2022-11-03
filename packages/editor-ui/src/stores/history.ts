import { COMMANDS, STORES } from "@/constants";
import { BulkCommands, Command, HistoryState, INodeUi, Undoable, XYPosition } from "@/Interface";
import { IConnection } from "n8n-workflow";
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
		pushUndoableToUndo(undoable: Undoable, clearRedo = true): void {
			if (this.currentBulkAction) {
				this.currentBulkAction.data.commands.push(undoable);
				return;
			}
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
		addConnection(connection: [IConnection, IConnection]) {
			this.pushUndoableToUndo({
				type: 'command',
				data: {
					action: COMMANDS.ADD_CONNECTION,
					options: {
						connection,
					},
				},
			});
		},
		addNode(node: INodeUi): void {
			this.pushUndoableToUndo({
				type: 'command',
				data: {
					action: COMMANDS.ADD_NODE,
					options: {
						node,
					},
				},
			});
		},
		removeNode(node: INodeUi): void {
			this.pushUndoableToUndo({
				type: 'command',
				data: {
					action: COMMANDS.REMOVE_NODE,
					options: {
						node,
					},
				},
			});
		},
		removeConnection(connection: [IConnection, IConnection]) {
			this.pushUndoableToUndo({
				type: 'command',
				data: {
					action: COMMANDS.REMOVE_CONNECTION,
					options: {
						connection,
					},
				},
			});
		},
	},
});
