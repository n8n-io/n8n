import { UnexpectedError } from 'n8n-workflow';

/**
 * What a decorator collects at module-load time, for a single consumer to
 * subscribe to. Subscribing replays everything registered so far, so the
 * consumer can be wired regardless of when the decorated class's module loads.
 */
export class ReplayableRegistry<T> {
	private readonly entries: T[] = [];

	private onRegister?: (entry: T) => void;

	/**
	 * @param entryName What the registry holds, e.g. `system task`, for error messages.
	 * @param describe Names a single entry, for error messages.
	 */
	constructor(
		private readonly entryName: string,
		private readonly describe: (entry: T) => string,
	) {}

	register(entry: T) {
		this.entries.push(entry);
		if (this.onRegister) this.notify(this.onRegister, entry);
	}

	subscribe(listener: (entry: T) => void) {
		if (this.onRegister) {
			throw new UnexpectedError(
				`A listener is already subscribed to ${this.entryName} registrations`,
			);
		}

		// Subscribe only after the replay: iterating the live array already picks up
		// anything a listener registers re-entrantly, and holding off means a throwing
		// listener does not lock the subscription shut.
		for (const entry of this.entries) {
			this.notify(listener, entry);
		}

		this.onRegister = listener;
	}

	protected getEntries() {
		return [...this.entries];
	}

	/**
	 * A listener runs while the decorator that registered the entry is still
	 * evaluating, so a failure surfaces as a module-load error. Name the entry it
	 * came from, or the stack points only at the decorator.
	 */
	private notify(listener: (entry: T) => void, entry: T) {
		try {
			listener(entry);
		} catch (error) {
			throw new UnexpectedError(
				`Failed to handle the registration of ${this.entryName} "${this.describe(entry)}"`,
				{ cause: error },
			);
		}
	}
}
