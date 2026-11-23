/**
 * Runs one job for each key at a time. A call with a key that is running waits for that job, and a
 * key that finished well is not run again. A failed job is forgotten, so a later call can try again.
 */
export class OnceByKey {
	private readonly jobs = new Map<string, Promise<boolean>>();

	/** `job` returns true when it did its work. */
	async run(key: string, job: () => Promise<boolean>): Promise<void> {
		let running = this.jobs.get(key);
		if (!running) {
			running = job().catch(() => false);
			this.jobs.set(key, running);
			void running.then((ok) => {
				if (!ok) this.jobs.delete(key);
			});
		}
		await running;
	}
}
