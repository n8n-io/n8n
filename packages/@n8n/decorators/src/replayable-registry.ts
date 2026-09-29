import { UnexpectedError } from 'n8n-workflow';

/**
 * What a decorator collects at module-load time, for a single consumer to
 * subscribe to. Subscribing replays everything registered so far, so the
 * consumer can be wired regardless of when the decorated class's module loads.
 *
 * Not exported from the package index: a consumer injects the concrete registry
 * (`SystemTaskMetadata`, `MultiMainMetadata`), which carries the DI token and
 * the entry type.
 */
export class ReplayableRegistry<T> {
	private readonly entries: T[] = [];

	private onRegister?: (entry: T) => void;

	/**
	 * @param entryName What the registry holds, as a lowercase singular noun
	 * (`system task`), so the error messages read as prose.
	 * @param describe Identifies one entry in those messages, e.g. its class name.
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

		for (const entry of this.entries) {
			this.notify(listener, entry);
		}

		// Assigned after the replay: the loop over the live array already reaches
		// anything the listener registers re-entrantly, and a listener that throws
		// mid-replay leaves the subscription open for a retry.
		this.onRegister = listener;
	}

	protected getEntries() {
		return [...this.entries];
	}

	/**
	 * A failure has to name the entry: a decorator often registers during module
	 * evaluation, where the listener runs inside the decorator and the stack
	 * points at it rather than at the entry being handled.
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
