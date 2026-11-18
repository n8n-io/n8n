import { Command } from '@/app/models/history';

type Callback = () => void | Promise<void>;

/** Undo step for changes that have no command of their own, such as pinned data and node settings. */
export class CallbackCommand extends Command {
	constructor(
		name: string,
		private readonly onRevert: Callback,
		private readonly onReapply: Callback,
		timestamp: number,
	) {
		super(name, timestamp);
	}

	getReverseCommand(timestamp: number): Command {
		return new CallbackCommand(this.name, this.onReapply, this.onRevert, timestamp);
	}

	isEqualTo(): boolean {
		return false;
	}

	async revert(): Promise<void> {
		await this.onRevert();
	}
}
