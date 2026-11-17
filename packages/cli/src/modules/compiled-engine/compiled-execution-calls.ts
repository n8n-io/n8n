import { setWorkflowExecutionMetadata } from 'n8n-core';
import type { IRunExecutionData } from 'n8n-workflow';

import type { WfrtServiceEvent } from './compiled-engine.types';
import { isDataObject } from './compiled-engine.types';
import type { CompiledRunRecorder } from './compiled-run-recorder';
import type { ServiceAnswer } from './compiled-service-calls';

/**
 * Runs a call of the `execution` service (spec section 9.9) on the data of the execution.
 *
 * `setCustomData` (`items`: the values of each item of an Execution Data node) saves custom
 * data with the code of v1, so the limits and the errors are those of v1: each item is one
 * `customData.setAll` call, which sets every valid value and then throws its first error.
 * The lifecycle hooks save `resultData.metadata` when the execution ends, as for v1.
 *
 * `setTimeSaved` (`minutes`) records the minutes of a Time Saved node on the run of its node.
 */
export function runExecutionCall(
	state: {
		runExecutionData: IRunExecutionData;
		recorder: Pick<CompiledRunRecorder, 'setTimeSaved'>;
	},
	event: WfrtServiceEvent,
): ServiceAnswer {
	const args = isDataObject(event.args) ? event.args : {};
	try {
		if (event.op === 'setCustomData') {
			for (const values of Array.isArray(args.items) ? args.items : []) {
				if (!isDataObject(values)) continue;
				const errors: unknown[] = [];
				for (const [key, value] of Object.entries(values)) {
					try {
						setWorkflowExecutionMetadata(state.runExecutionData, key, value);
					} catch (error) {
						errors.push(error);
					}
				}
				if (errors.length > 0) throw errors[0];
			}
			return { ok: true, result: null };
		}
		if (event.op === 'setTimeSaved') {
			const { minutes } = args;
			if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) {
				return { ok: false, error: { message: 'The minutes saved are not a number' } };
			}
			if (!state.recorder.setTimeSaved(event.step, minutes)) {
				return { ok: false, error: { message: 'The step of the call is not a node' } };
			}
			return { ok: true, result: null };
		}
		return { ok: false, error: { message: `Unknown execution operation "${event.op}"` } };
	} catch (error) {
		return {
			ok: false,
			error: { message: error instanceof Error ? error.message : String(error) },
		};
	}
}
