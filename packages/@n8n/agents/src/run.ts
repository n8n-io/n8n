import type {
	AgentResult,
	RunState,
	RunEvent,
	RunEventMap,
	StepEvent,
	ToolCallEvent,
	MessageEvent,
	StateChangeEvent,
	EvalEvent,
	ErrorEvent,
	Run,
} from './types';

type EventHandler<T> = (data: T) => void;

export class AgentRun implements Run {
	private currentState: RunState = 'running';

	private handlers = new Map<string, Array<EventHandler<unknown>>>();

	private resultPromise: Promise<AgentResult>;

	private abortReason?: string;

	constructor(resultPromise: Promise<AgentResult>) {
		this.resultPromise = resultPromise.then(
			(result) => {
				// If abort() was called before the promise resolved, keep the
				// failed state rather than overwriting it with completed.
				if (this.currentState !== 'failed') {
					this.transition('completed');
				}
				return result;
			},
			(error: unknown) => {
				this.transition('failed');
				throw error;
			},
		);
	}

	get state(): RunState {
		return this.currentState;
	}

	get result(): Promise<AgentResult> {
		return this.resultPromise;
	}

	on<E extends RunEvent>(event: E, handler: EventHandler<RunEventMap[E]>): void {
		const existingHandlers = this.handlers.get(event) ?? [];
		existingHandlers.push(handler as EventHandler<unknown>);
		this.handlers.set(event, existingHandlers);
	}

	// --- Control methods (called by engine) ---

	// eslint-disable-next-line @typescript-eslint/require-await
	async approve(_approvalId: string): Promise<void> {
		this.transition('running');
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async deny(_approvalId: string, _reason?: string): Promise<void> {
		this.transition('failed');
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async resume(_pauseId: string, _data: unknown): Promise<void> {
		this.transition('running');
	}

	abort(reason?: string): void {
		this.abortReason = reason;
		this.transition('failed');
	}

	// --- Internal event emitters (called by runtime adapter) ---

	emitStep(data: StepEvent): void {
		this.emit('step', data);
	}

	emitToolCall(data: ToolCallEvent): void {
		this.emit('toolCall', data);
	}

	emitMessage(data: MessageEvent): void {
		this.emit('message', data);
	}

	emitEval(data: EvalEvent): void {
		this.emit('eval', data);
	}

	emitError(data: ErrorEvent): void {
		this.emit('error', data);
	}

	// --- Private ---

	private transition(to: RunState): void {
		if (this.currentState === to) return;
		const from = this.currentState;
		this.currentState = to;
		this.emit('stateChange', {
			from,
			to,
			context: { reason: this.abortReason },
		} satisfies StateChangeEvent);
	}

	private emit<E extends RunEvent>(event: E, data: RunEventMap[E]): void {
		const eventHandlers = this.handlers.get(event) ?? [];
		for (const handler of eventHandlers) {
			handler(data);
		}
	}
}
