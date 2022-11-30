import { INodeUi } from '@/Interface';
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
	abstract revert(): void;
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

	revert(): void {
		this.eventBus.$root.$emit('nodeMove', { nodeName: this.nodeName, position: this.oldPosition });
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

	revert(): void {
		this.eventBus.$root.$emit('revertAddNode', { node: this.node });
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

	revert(): void {
		this.eventBus.$root.$emit('revertRemoveNode', { node: this.node });
	}
}
