export class TimeoutTimer {
	private timeoutTimerId: NodeJS.Timeout;
	private timerPromise: Promise<void>;

	constructor(timeout: number) {
		this.timerPromise = new Promise((resolve) => {
			this.timeoutTimerId = setTimeout(resolve, timeout);
		});
	}

	public get promise() {
		return this.timerPromise;
	}

	public clear() {
		clearTimeout(this.timeoutTimerId);
	}

	public static start(timeout: number) {
		return new TimeoutTimer(timeout);
	}
}
