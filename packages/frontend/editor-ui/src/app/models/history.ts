import type { INodeUi, XYPosition } from '@/Interface';
import type { IConnection, INodeParameters, IWorkflowGroup } from 'n8n-workflow';
import { createEventBus } from '@n8n/utils/event-bus';

// Command names don't serve any particular purpose in the app
// but they make it easier to identify each command on stack
// when debugging
export const enum COMMANDS {
	MOVE_NODE = 'moveNode',
	ADD_NODE = 'addNode',
	REMOVE_NODE = 'removeNode',
	ADD_CONNECTION = 'addConnection',
	REMOVE_CONNECTION = 'removeConnection',
	ENABLE_NODE_TOGGLE = 'enableNodeToggle',
	RENAME_NODE = 'renameNode',
	REPLACE_NODE_PARAMETERS = 'replaceNodeParameters',
	ADD_NODE_GROUP = 'addNodeGroup',
	REMOVE_NODE_GROUP = 'removeNodeGroup',
	UPDATE_NODE_GROUP = 'updateNodeGroup',
}

// Triggering multiple canvas actions in sequence leaves
// canvas out of sync with store state, so we are adding
// this timeout in between canvas actions
// (0 is usually enough but leaving this just in case)
const CANVAS_ACTION_TIMEOUT = 10;
export const historyBus = createEventBus();

export abstract class Undoable {
	abstract getTimestamp(): number;
}

export abstract class Command extends Undoable {
	readonly name: string;

	readonly timestamp: number;

	constructor(name: string, timestamp: number) {
		super();
		this.name = name;
		this.timestamp = timestamp;
	}
	abstract getReverseCommand(timestamp: number): Command;
	abstract isEqualTo(anotherCommand: Command): boolean;
	abstract revert(): Promise<void>;

	getTimestamp(): number {
		return this.timestamp;
	}
}

export class BulkCommand extends Undoable {
	commands: Command[];

	constructor(commands: Command[]) {
		super();
		this.commands = commands;
	}

	getTimestamp(): number {
		return Math.max(0, ...this.commands.map((command) => command.timestamp));
	}
}

export class MoveNodeCommand extends Command {
	nodeName: string;

	oldPosition: XYPosition;

	newPosition: XYPosition;

	constructor(
		nodeName: string,
		oldPosition: XYPosition,
		newPosition: XYPosition,
		timestamp: number,
	) {
		super(COMMANDS.MOVE_NODE, timestamp);
		this.nodeName = nodeName;
		this.newPosition = newPosition;
		this.oldPosition = oldPosition;
	}

	getReverseCommand(timestamp: number): Command {
		return new MoveNodeCommand(this.nodeName, this.newPosition, this.oldPosition, timestamp);
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
		return await new Promise<void>((resolve) => {
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

	constructor(node: INodeUi, timestamp: number) {
		super(COMMANDS.ADD_NODE, timestamp);
		this.node = node;
	}

	getReverseCommand(timestamp: number): Command {
		return new RemoveNodeCommand(this.node, timestamp);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return anotherCommand instanceof AddNodeCommand && anotherCommand.node.name === this.node.name;
	}

	async revert(): Promise<void> {
		return await new Promise<void>((resolve) => {
			historyBus.emit('revertAddNode', { node: this.node });
			resolve();
		});
	}
}

export class RemoveNodeCommand extends Command {
	node: INodeUi;

	constructor(node: INodeUi, timestamp: number) {
		super(COMMANDS.REMOVE_NODE, timestamp);
		this.node = node;
	}

	getReverseCommand(timestamp: number): Command {
		return new AddNodeCommand(this.node, timestamp);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return anotherCommand instanceof AddNodeCommand && anotherCommand.node.name === this.node.name;
	}

	async revert(): Promise<void> {
		return await new Promise<void>((resolve) => {
			historyBus.emit('revertRemoveNode', { node: this.node });
			resolve();
		});
	}
}

export class AddConnectionCommand extends Command {
	connectionData: [IConnection, IConnection];

	constructor(connectionData: [IConnection, IConnection], timestamp: number) {
		super(COMMANDS.ADD_CONNECTION, timestamp);
		this.connectionData = connectionData;
	}

	getReverseCommand(timestamp: number): Command {
		return new RemoveConnectionCommand(this.connectionData, timestamp);
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
		return await new Promise<void>((resolve) => {
			historyBus.emit('revertAddConnection', { connection: this.connectionData });
			resolve();
		});
	}
}

export class RemoveConnectionCommand extends Command {
	connectionData: [IConnection, IConnection];

	constructor(connectionData: [IConnection, IConnection], timestamp: number) {
		super(COMMANDS.REMOVE_CONNECTION, timestamp);
		this.connectionData = connectionData;
	}

	getReverseCommand(timestamp: number): Command {
		return new AddConnectionCommand(this.connectionData, timestamp);
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
		return await new Promise<void>((resolve) => {
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

	constructor(nodeName: string, oldState: boolean, newState: boolean, timestamp: number) {
		super(COMMANDS.ENABLE_NODE_TOGGLE, timestamp);
		this.nodeName = nodeName;
		this.newState = newState;
		this.oldState = oldState;
	}

	getReverseCommand(timestamp: number): Command {
		return new EnableNodeToggleCommand(this.nodeName, this.newState, this.oldState, timestamp);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return (
			anotherCommand instanceof EnableNodeToggleCommand && anotherCommand.nodeName === this.nodeName
		);
	}

	async revert(): Promise<void> {
		return await new Promise<void>((resolve) => {
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

	constructor(currentName: string, newName: string, timestamp: number) {
		super(COMMANDS.RENAME_NODE, timestamp);
		this.currentName = currentName;
		this.newName = newName;
	}

	getReverseCommand(timestamp: number): Command {
		return new RenameNodeCommand(this.newName, this.currentName, timestamp);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return (
			anotherCommand instanceof RenameNodeCommand &&
			anotherCommand.currentName === this.currentName &&
			anotherCommand.newName === this.newName
		);
	}

	async revert(): Promise<void> {
		return await new Promise<void>((resolve) => {
			historyBus.emit('revertRenameNode', {
				currentName: this.currentName,
				newName: this.newName,
			});
			resolve();
		});
	}
}

export class ReplaceNodeParametersCommand extends Command {
	constructor(
		private nodeId: string,
		private currentParameters: INodeParameters,
		private newParameters: INodeParameters,
		timestamp: number,
	) {
		super(COMMANDS.REPLACE_NODE_PARAMETERS, timestamp);
	}

	getReverseCommand(timestamp: number): Command {
		return new ReplaceNodeParametersCommand(
			this.nodeId,
			this.newParameters,
			this.currentParameters,
			timestamp,
		);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return (
			anotherCommand instanceof ReplaceNodeParametersCommand &&
			anotherCommand.nodeId === this.nodeId &&
			anotherCommand.currentParameters === this.currentParameters &&
			anotherCommand.newParameters === this.newParameters
		);
	}

	async revert(): Promise<void> {
		return await new Promise<void>((resolve) => {
			historyBus.emit('revertReplaceNodeParameters', {
				nodeId: this.nodeId,
				currentProperties: this.currentParameters,
				newProperties: this.newParameters,
			});
			resolve();
		});
	}
}

function cloneGroup(group: IWorkflowGroup): IWorkflowGroup {
	return { ...group, nodeIds: [...group.nodeIds] };
}

function groupsAreEqual(a: IWorkflowGroup, b: IWorkflowGroup): boolean {
	return (
		a.id === b.id &&
		a.name === b.name &&
		a.description === b.description &&
		a.nodeIds.length === b.nodeIds.length &&
		a.nodeIds.every((nodeId, index) => nodeId === b.nodeIds[index])
	);
}

export class AddNodeGroupCommand extends Command {
	group: IWorkflowGroup;

	constructor(group: IWorkflowGroup, timestamp: number) {
		super(COMMANDS.ADD_NODE_GROUP, timestamp);
		this.group = cloneGroup(group);
	}

	getReverseCommand(timestamp: number): Command {
		return new RemoveNodeGroupCommand(this.group, timestamp);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return (
			anotherCommand instanceof AddNodeGroupCommand && anotherCommand.group.id === this.group.id
		);
	}

	async revert(): Promise<void> {
		return await new Promise<void>((resolve) => {
			historyBus.emit('revertAddNodeGroup', { group: this.group });
			resolve();
		});
	}
}

export class RemoveNodeGroupCommand extends Command {
	group: IWorkflowGroup;

	constructor(group: IWorkflowGroup, timestamp: number) {
		super(COMMANDS.REMOVE_NODE_GROUP, timestamp);
		this.group = cloneGroup(group);
	}

	getReverseCommand(timestamp: number): Command {
		return new AddNodeGroupCommand(this.group, timestamp);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return (
			anotherCommand instanceof RemoveNodeGroupCommand && anotherCommand.group.id === this.group.id
		);
	}

	async revert(): Promise<void> {
		return await new Promise<void>((resolve) => {
			historyBus.emit('revertRemoveNodeGroup', { group: this.group });
			resolve();
		});
	}
}

export class UpdateNodeGroupCommand extends Command {
	before: IWorkflowGroup;

	after: IWorkflowGroup;

	constructor(before: IWorkflowGroup, after: IWorkflowGroup, timestamp: number) {
		super(COMMANDS.UPDATE_NODE_GROUP, timestamp);
		this.before = cloneGroup(before);
		this.after = cloneGroup(after);
	}

	getReverseCommand(timestamp: number): Command {
		return new UpdateNodeGroupCommand(this.after, this.before, timestamp);
	}

	isEqualTo(anotherCommand: Command): boolean {
		return (
			anotherCommand instanceof UpdateNodeGroupCommand &&
			groupsAreEqual(anotherCommand.before, this.before) &&
			groupsAreEqual(anotherCommand.after, this.after)
		);
	}

	async revert(): Promise<void> {
		return await new Promise<void>((resolve) => {
			historyBus.emit('revertUpdateNodeGroup', { group: this.before });
			resolve();
		});
	}
}
