import type { InstanceAiEventBus } from '../event-bus';
import { mapMastraChunkToEvent } from '../stream/map-chunk';
import { asResumable, parseSuspension } from '../utils/stream-helpers';
import type { SuspensionInfo } from '../utils/stream-helpers';

export interface ResumableStreamSource {
	runId?: string;
	fullStream: AsyncIterable<unknown>;
	text?: Promise<string>;
}

export interface ResumableStreamContext {
	threadId: string;
	runId: string;
	agentId: string;
	eventBus: InstanceAiEventBus;
	signal: AbortSignal;
}

export interface ManualSuspensionControl {
	mode: 'manual';
}

export interface AutoResumeControl {
	mode: 'auto';
	waitForConfirmation: (requestId: string) => Promise<Record<string, unknown>>;
	drainCorrections?: () => string[];
	onSuspension?: (suspension: SuspensionInfo) => void;
	buildResumeOptions?: (input: {
		mastraRunId: string;
		suspension: SuspensionInfo;
	}) => Record<string, unknown>;
}

export type ResumableStreamControl = ManualSuspensionControl | AutoResumeControl;

export interface ExecuteResumableStreamOptions {
	agent: unknown;
	stream: ResumableStreamSource;
	context: ResumableStreamContext;
	control: ResumableStreamControl;
	initialMastraRunId?: string;
}

export interface ExecuteResumableStreamResult {
	status: 'completed' | 'cancelled' | 'suspended';
	mastraRunId: string;
	text?: Promise<string>;
	suspension?: SuspensionInfo;
}

export async function executeResumableStream(
	options: ExecuteResumableStreamOptions,
): Promise<ExecuteResumableStreamResult> {
	let activeStream = options.stream.fullStream;
	let activeMastraRunId = options.stream.runId ?? options.initialMastraRunId ?? '';
	let text = options.stream.text;

	while (true) {
		let suspension: SuspensionInfo | undefined;

		for await (const chunk of activeStream) {
			if (options.context.signal.aborted) {
				return { status: 'cancelled', mastraRunId: activeMastraRunId, text };
			}

			const parsedSuspension = parseSuspension(chunk);
			if (parsedSuspension) {
				suspension = parsedSuspension;
				if (options.control.mode === 'auto') {
					options.control.onSuspension?.(parsedSuspension);
				}
			}

			const event = mapMastraChunkToEvent(options.context.runId, options.context.agentId, chunk);
			if (event) {
				options.context.eventBus.publish(options.context.threadId, event);
			}

			if (options.control.mode === 'auto' && options.control.drainCorrections) {
				publishCorrections(options.context, options.control.drainCorrections());
			}
		}

		if (options.context.signal.aborted) {
			return { status: 'cancelled', mastraRunId: activeMastraRunId, text };
		}

		if (!suspension) {
			return { status: 'completed', mastraRunId: activeMastraRunId, text };
		}

		if (options.control.mode === 'manual') {
			return {
				status: 'suspended',
				mastraRunId: activeMastraRunId,
				text,
				suspension,
			};
		}

		const resumeData = await waitForConfirmation(
			options.context.signal,
			options.control.waitForConfirmation,
			suspension.requestId,
		);
		const resumeOptions = options.control.buildResumeOptions?.({
			mastraRunId: activeMastraRunId,
			suspension,
		}) ?? {
			runId: activeMastraRunId,
			toolCallId: suspension.toolCallId,
		};
		const resumed = await asResumable(options.agent).resumeStream(resumeData, resumeOptions);

		activeMastraRunId =
			(typeof resumed.runId === 'string' ? resumed.runId : '') || activeMastraRunId;
		activeStream = resumed.fullStream;
		text = resumed.text;
	}
}

function publishCorrections(context: ResumableStreamContext, corrections: string[]): void {
	for (const correction of corrections) {
		context.eventBus.publish(context.threadId, {
			type: 'text-delta',
			runId: context.runId,
			agentId: context.agentId,
			payload: { text: `\n[USER CORRECTION]: ${correction}\n` },
		});
	}
}

async function waitForConfirmation(
	signal: AbortSignal,
	waitForConfirmation: (requestId: string) => Promise<Record<string, unknown>>,
	requestId: string,
): Promise<Record<string, unknown>> {
	if (signal.aborted) {
		throw new Error('Run cancelled while waiting for confirmation');
	}

	let abortHandler: (() => void) | undefined;

	try {
		return await Promise.race([
			waitForConfirmation(requestId),
			new Promise<never>((_, reject) => {
				abortHandler = () => reject(new Error('Run cancelled while waiting for confirmation'));
				signal.addEventListener('abort', abortHandler, { once: true });
			}),
		]);
	} finally {
		if (abortHandler) {
			signal.removeEventListener('abort', abortHandler);
		}
	}
}
