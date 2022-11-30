import { XYPosition } from "../Interface";

export abstract class Undoable { }

export abstract class Command extends Undoable {
	abstract getRevertEventData(): { eventName: string, data: Object };
	abstract getReverseCommand(): Command;
}

export class BulkCommand extends Undoable {
	commands: Command[];

	constructor (commands: Command[]) {
		super();
		this.commands = commands;
	}
}

export class MoveNodeCommand extends Undoable {
	nodeName: string;
	oldPosition: XYPosition;
	newPosition: XYPosition;

	constructor (nodeName: string, oldPosition: XYPosition, newPosition: XYPosition) {
		super();
		this.nodeName = nodeName;
		this.newPosition = newPosition;
		this.oldPosition = oldPosition;
	}

	getRevertEventData(): { eventName: string, data: Object } {
		return {
			eventName: 'nodeMove',
			data: {
				nodeName: this.nodeName,
				position: this.oldPosition,
			},
		};
	}
	getReverseCommand(): Command {
		return new MoveNodeCommand(
			this.nodeName,
			this.newPosition,
			this.oldPosition,
		);
	}
}
