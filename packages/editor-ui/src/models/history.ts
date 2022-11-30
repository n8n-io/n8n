import Vue from "vue";
import { XYPosition } from "../Interface";

export abstract class Undoable { }

export abstract class Command extends Undoable {
	eventBus: Vue;

	constructor (eventBus: Vue) {
		super();
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
		super(eventBus);
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
