import { INodeUi } from '@/Interface';
import { IConnection } from 'n8n-workflow';
import { XYPosition } from '../Interface';
import { createEventBus } from '@/event-bus';

// Command names don't serve any particular purpose in the app
// but they make it easier to identify each command on stack
// when debugging
export enum COMMANDS {
	MOVE_NODE = 'moveNode',
	ADD_NODE = 'addNode',
	REMOVE_NODE = 'removeNode',
	ADD_CONNECTION = 'addConnection',
	REMOVE_CONNECTION = 'removeConnection',
	ENABLE_NODE_TOGGLE = 'enableNodeToggle',
	RENAME_NODE = 'renameNode',
}

// Triggering multiple canvas actions in sequence leaves
// canvas out of sync with store state, so we are adding
// this timeout in between canvas actions
// (0 is usually enough but leaving this just in case)
const CANVAS_ACTION_TIMEOUT = 10;
export const historyBus = createEventBus();

export abstract class Undoable {}

export abstract class Command extends Undoable {
	readonly name: string;

	constructor(name: string) {
		super();
		this.name = name;
	}
	abstract getReverseCommand(): Command;
	abstract isEqualTo(anotherCommand: Command): boolean;
	abstract revert(): Promise<void>;
}

export class BulkCommand extends Undoable {
	commands: Command[];

	constructor(commands: Command[]) {
		super();
		this.commands = commands;
	}
}

export class MoveNodeCommand extends Command {
	nodeName: string;
	oldPosition: XYPosition;
	newPosition: XYPosition;

	constructor(nodeName: string, oldPosition: XYPosition, newPosition: XYPosition) {
		super(COMMANDS.MOVE_NODE);
		this.nodeName = nodeName;
		this.newPosition = newPosition;
		this.oldPosition = oldPosition;
	}

	getReverseCommand(): Command {
		return new MoveNodeCommand(this.nodeName, this.newPosition, this.oldPosition);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return (
			anotherCommand instanceof MoveNodeCommand &&
			anotherCommand.nodeName === this.nodeName &&
			anotherCommand.oldPosition[0] === this.oldPosition[0] &&
			anotherCommand.oldPosition[1] === this.oldPosition[1] &&
			anotherCommand.newPosition[0] === this.newPosition[0] &&
			anotherCommand.newPosition[1] === this.newPosition[1]
		);
	}

	async revert(): Promise<void> {
		return new Promise<void>((resolve) => {
			historyBus.emit('nodeMove', {
				nodeName: this.nodeName,
				position: this.oldPosition,
			});
			resolve();
		});
	}
}

export class AddNodeCommand extends Command {
	node: INodeUi;

	constructor(node: INodeUi) {
		super(COMMANDS.ADD_NODE);
		this.node = node;
	}

	getReverseCommand(): Command {
		return new RemoveNodeCommand(this.node);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return anotherCommand instanceof AddNodeCommand && anotherCommand.node.name === this.node.name;
	}

	async revert(): Promise<void> {
		return new Promise<void>((resolve) => {
			historyBus.emit('revertAddNode', { node: this.node });
			resolve();
		});
	}
}

export class RemoveNodeCommand extends Command {
	node: INodeUi;

	constructor(node: INodeUi) {
		super(COMMANDS.REMOVE_NODE);
		this.node = node;
	}

	getReverseCommand(): Command {
		return new AddNodeCommand(this.node);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return anotherCommand instanceof AddNodeCommand && anotherCommand.node.name === this.node.name;
	}

	async revert(): Promise<void> {
		return new Promise<void>((resolve) => {
			historyBus.emit('revertRemoveNode', { node: this.node });
			resolve();
		});
	}
}

export class AddConnectionCommand extends Command {
	connectionData: [IConnection, IConnection];

	constructor(connectionData: [IConnection, IConnection]) {
		super(COMMANDS.ADD_CONNECTION);
		this.connectionData = connectionData;
	}

	getReverseCommand(): Command {
		return new RemoveConnectionCommand(this.connectionData);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return (
			anotherCommand instanceof AddConnectionCommand &&
			anotherCommand.connectionData[0].node === this.connectionData[0].node &&
			anotherCommand.connectionData[1].node === this.connectionData[1].node &&
			anotherCommand.connectionData[0].index === this.connectionData[0].index &&
			anotherCommand.connectionData[1].index === this.connectionData[1].index
		);
	}

	async revert(): Promise<void> {
		return new Promise<void>((resolve) => {
			historyBus.emit('revertAddConnection', { connection: this.connectionData });
			resolve();
		});
	}
}

export class RemoveConnectionCommand extends Command {
	connectionData: [IConnection, IConnection];

	constructor(connectionData: [IConnection, IConnection]) {
		super(COMMANDS.REMOVE_CONNECTION);
		this.connectionData = connectionData;
	}

	getReverseCommand(): Command {
		return new AddConnectionCommand(this.connectionData);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return (
			anotherCommand instanceof RemoveConnectionCommand &&
			anotherCommand.connectionData[0].node === this.connectionData[0].node &&
			anotherCommand.connectionData[1].node === this.connectionData[1].node &&
			anotherCommand.connectionData[0].index === this.connectionData[0].index &&
			anotherCommand.connectionData[1].index === this.connectionData[1].index
		);
	}

	async revert(): Promise<void> {
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				historyBus.emit('revertRemoveConnection', { connection: this.connectionData });
				resolve();
			}, CANVAS_ACTION_TIMEOUT);
		});
	}
}

export class EnableNodeToggleCommand extends Command {
	nodeName: string;
	oldState: boolean;
	newState: boolean;

	constructor(nodeName: string, oldState: boolean, newState: boolean) {
		super(COMMANDS.ENABLE_NODE_TOGGLE);
		this.nodeName = nodeName;
		this.newState = newState;
		this.oldState = oldState;
	}

	getReverseCommand(): Command {
		return new EnableNodeToggleCommand(this.nodeName, this.newState, this.oldState);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return (
			anotherCommand instanceof EnableNodeToggleCommand && anotherCommand.nodeName === this.nodeName
		);
	}

	async revert(): Promise<void> {
		return new Promise<void>((resolve) => {
			historyBus.emit('enableNodeToggle', {
				nodeName: this.nodeName,
				isDisabled: this.oldState,
			});
			resolve();
		});
	}
}

export class RenameNodeCommand extends Command {
	currentName: string;
	newName: string;

	constructor(currentName: string, newName: string) {
		super(COMMANDS.RENAME_NODE);
		this.currentName = currentName;
		this.newName = newName;
	}

	getReverseCommand(): Command {
		return new RenameNodeCommand(this.newName, this.currentName);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return (
			anotherCommand instanceof RenameNodeCommand &&
			anotherCommand.currentName === this.currentName &&
			anotherCommand.newName === this.newName
		);
	}

	async revert(): Promise<void> {
		return new Promise<void>((resolve) => {
			historyBus.emit('revertRenameNode', {
				currentName: this.currentName,
				newName: this.newName,
			});
			resolve();
		});
	}
}
