export interface PendingCall {
	toolName: string;
	arguments: Record<string, unknown>;
	resolve: (result: unknown) => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

export class PendingCallsManager {
	private pendingCalls: Record<string, PendingCall> = {};

	async waitForResult(
		callId: string,
		toolName: string,
		args: Record<string, unknown>,
		timeoutMs: number,
	): Promise<unknown> {
		return await new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				if (this.pendingCalls[callId]) {
					this.reject(callId, new Error('Worker tool execution timeout'));
				}
			}, timeoutMs);

			this.pendingCalls[callId] = {
				toolName,
				arguments: args,
				resolve,
				reject,
				timer,
			};
		});
	}

	resolve(callId: string, result: unknown): boolean {
		const pending = this.pendingCalls[callId];
		if (pending) {
			clearTimeout(pending.timer);
			pending.resolve(result);
			delete this.pendingCalls[callId];
			return true;
		}
		return false;
	}

	reject(callId: string, error: Error): boolean {
		const pending = this.pendingCalls[callId];
		if (pending) {
			clearTimeout(pending.timer);
			pending.reject(error);
			delete this.pendingCalls[callId];
			return true;
		}
		return false;
	}

	get(callId: string): PendingCall | undefined {
		return this.pendingCalls[callId];
	}

	has(callId: string): boolean {
		return callId in this.pendingCalls;
	}

	remove(callId: string): void {
		delete this.pendingCalls[callId];
	}

	cleanupBySessionId(sessionId: string): void {
		for (const callId of Object.keys(this.pendingCalls)) {
			if (callId.startsWith(`${sessionId}_`)) {
				const pending = this.pendingCalls[callId];
				if (pending) {
					clearTimeout(pending.timer);
					pending.resolve(undefined);
				}
				delete this.pendingCalls[callId];
			}
		}
	}
}
