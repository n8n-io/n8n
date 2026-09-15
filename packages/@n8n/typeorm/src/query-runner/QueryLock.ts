export class QueryLock {
	private readonly queue: Promise<void>[] = [];

	async acquire(): Promise<() => void> {
		let release: Function;
		const waitingPromise = new Promise<void>((ok) => (release = ok));

		// Get track of everyone we need to wait on..
		const otherWaitingPromises = [...this.queue];
		// Put ourselves onto the end of the queue
		this.queue.push(waitingPromise);

		if (otherWaitingPromises.length > 0) {
			await Promise.all(otherWaitingPromises);
		}

		return () => {
			release();

			if (this.queue.includes(waitingPromise)) {
				this.queue.splice(this.queue.indexOf(waitingPromise), 1);
			}
		};
	}
}
