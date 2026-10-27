/** The HTTP response operations that a streaming webhook response uses. */
export interface ResponseStream {
	readonly writableEnded: boolean;
	readonly destroyed?: boolean;
	write(chunk: string): void;
	end(): void;
	flush?: () => void;
	once(event: 'finish' | 'close', listener: () => void): void;
	off(event: 'finish' | 'close', listener: () => void): void;
}

const STREAMING_HEARTBEAT_INTERVAL_MS = 30_000;
const STREAMING_KEEPALIVE_CHUNK = '{"type":"keepalive"}\n';

/** Keeps a streaming webhook response open until it ends or disconnects. */
export class StreamingWebhookResponseHeartbeat {
	private stopped = false;

	private readonly timer: NodeJS.Timeout;

	constructor(private readonly stream: ResponseStream) {
		this.timer = setInterval(() => {
			if (this.stream.writableEnded || this.stream.destroyed) {
				this.stop();
				return;
			}
			this.stream.write(STREAMING_KEEPALIVE_CHUNK);
			this.stream.flush?.();
		}, STREAMING_HEARTBEAT_INTERVAL_MS);
		this.stream.once('finish', this.stop);
		this.stream.once('close', this.stop);
	}

	readonly stop = () => {
		if (this.stopped) return;
		this.stopped = true;
		clearInterval(this.timer);
		this.stream.off('finish', this.stop);
		this.stream.off('close', this.stop);
	};
}
