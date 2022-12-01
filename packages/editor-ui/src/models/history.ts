import { INodeUi } from '@/Interface';
import { IConnection } from 'n8n-workflow';
import Vue from "vue";
import { XYPosition } from "../Interface";

// Command names don't serve any particular purpose in the app
// but they make it easier to identify each command on stack
// when debugging
enum COMMANDS {
	MOVE_NODE = 'moveNode',
	ADD_NODE = 'addNode',
	REMOVE_NODE = 'removeNode',
	ADD_CONNECTION = 'addConnection',
	REMOVE_CONNECtiON = 'removeConnection',
	ENABLE_NODE = 'enableNode',
	DISABLE_NODE = 'disableNode',
	RENAME_NODE = 'renameNode',
}

// Triggering multiple canvas actions in sequence leaves
// canvas out of sync with store state, so we are adding
// this timeout in between canvas actions
// (0 is usually enough but leaving 10ms just in case)
const CANVAS_ACTiON_TIMEOUT = 10;

export abstract class Undoable { }

export abstract class Command extends Undoable {
	readonly name: string;
	eventBus: Vue;

	constructor (name: string, eventBus: Vue) {
		super();
		this.name = name;
		this.eventBus = eventBus;
	}
	abstract getReverseCommand(): Command;
	abstract revert(): Promise<void>;
}

export class BulkCommand extends Undoable {
	commands: Command[];

	constructor (commands: Command[]) {
		super();
		this.commands = commands;
	}
}

export class MoveNodeCommand extends Command {
	nodeName: string;
	oldPosition: XYPosition;
	newPosition: XYPosition;

	constructor (nodeName: string, oldPosition: XYPosition, newPosition: XYPosition, eventBus: Vue) {
		super(COMMANDS.MOVE_NODE, eventBus);
		this.nodeName = nodeName;
		this.newPosition = newPosition;
		this.oldPosition = oldPosition;
	}

	getReverseCommand(): Command {
		return new MoveNodeCommand(
			this.nodeName,
			this.newPosition,
			this.oldPosition,
			this.eventBus,
		);
	}

	async revert(): Promise<void> {
		return new Promise<void>(resolve => {
			this.eventBus.$root.$emit('nodeMove', { nodeName: this.nodeName, position: this.oldPosition });
			resolve();
		});
	}
}

export class AddNodeCommand extends Command {
	node: INodeUi;

	constructor (node: INodeUi, eventBus: Vue) {
		super(COMMANDS.ADD_NODE, eventBus);
		this.node = node;
	}

	getReverseCommand(): Command {
		return new RemoveNodeCommand(this.node, this.eventBus);
	}

	async revert(): Promise<void> {
		return new Promise<void>(resolve => {
			setTimeout(() => {
				this.eventBus.$root.$emit('revertAddNode', { node: this.node });
				resolve();
			}, CANVAS_ACTiON_TIMEOUT);
		});
	}
}

export class RemoveNodeCommand extends Command {
	node: INodeUi;

	constructor (node: INodeUi, eventBus: Vue) {
		super(COMMANDS.REMOVE_NODE, eventBus);
		this.node = node;
	}

	getReverseCommand(): Command {
		return new AddNodeCommand(this.node, this.eventBus);
	}

	async revert(): Promise<void> {
		return new Promise<void>(resolve => {
			setTimeout(() => {
				this.eventBus.$root.$emit('revertRemoveNode', { node: this.node });
				resolve();
			}, CANVAS_ACTiON_TIMEOUT);
		});
	}
}

export class AddConnectionCommand extends Command {
	connectionData: [IConnection, IConnection];

	constructor(connectionData: [IConnection, IConnection], eventBus: Vue) {
		super(COMMANDS.ADD_CONNECTION, eventBus);
		this.connectionData = connectionData;
	}

	getReverseCommand(): Command {
		return new RemoveConnectionCommand(this.connectionData, this.eventBus);
	}

	async revert(): Promise<void> {
		return new Promise<void>(resolve => {
			setTimeout(() => {
				this.eventBus.$root.$emit('revertAddConnection', { connection: this.connectionData });
				resolve();
			}, CANVAS_ACTiON_TIMEOUT);
		});
	}
}

export class RemoveConnectionCommand extends Command {
	connectionData: [IConnection, IConnection];

	constructor(connectionData: [IConnection, IConnection], eventBus: Vue) {
		super(COMMANDS.REMOVE_CONNECtiON, eventBus);
		this.connectionData = connectionData;
	}

	getReverseCommand(): Command {
			return new AddConnectionCommand(this.connectionData, this.eventBus);
	}

	async revert(): Promise<void> {
		return new Promise<void>(resolve => {
			setTimeout(() => {
				this.eventBus.$root.$emit('revertRemoveConnection', { connection: this.connectionData });
				resolve();
			}, CANVAS_ACTiON_TIMEOUT);
		});
	}
}
