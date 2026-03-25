//#region src/utils/stream.ts
var IterableReadableStream = class IterableReadableStream extends ReadableStream {
	reader;
	ensureReader() {
		if (!this.reader) this.reader = this.getReader();
	}
	async next() {
		this.ensureReader();
		try {
			const result = await this.reader.read();
			if (result.done) {
				this.reader.releaseLock();
				return {
					done: true,
					value: void 0
				};
			} else return {
				done: false,
				value: result.value
			};
		} catch (e) {
			this.reader.releaseLock();
			throw e;
		}
	}
	async return() {
		this.ensureReader();
		if (this.locked) {
			const cancelPromise = this.reader.cancel();
			this.reader.releaseLock();
			await cancelPromise;
		}
		return {
			done: true,
			value: void 0
		};
	}
	async throw(e) {
		this.ensureReader();
		if (this.locked) {
			const cancelPromise = this.reader.cancel();
			this.reader.releaseLock();
			await cancelPromise;
		}
		throw e;
	}
	async [Symbol.asyncDispose]() {
		await this.return();
	}
	[Symbol.asyncIterator]() {
		return this;
	}
	static fromReadableStream(stream) {
		const reader = stream.getReader();
		return new IterableReadableStream({
			start(controller) {
				return pump();
				function pump() {
					return reader.read().then(({ done, value }) => {
						if (done) {
							controller.close();
							return;
						}
						controller.enqueue(value);
						return pump();
					});
				}
			},
			cancel() {
				reader.releaseLock();
			}
		});
	}
	static fromAsyncGenerator(generator) {
		return new IterableReadableStream({
			async pull(controller) {
				const { value, done } = await generator.next();
				if (done) controller.close();
				controller.enqueue(value);
			},
			async cancel(reason) {
				await generator.return(reason);
			}
		});
	}
};

//#endregion
export { IterableReadableStream };
//# sourceMappingURL=stream.js.map