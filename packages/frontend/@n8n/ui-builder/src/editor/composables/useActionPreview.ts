import cloneDeep from 'lodash/cloneDeep';
import { reactive, ref } from 'vue';

import { requestBody, writeState } from '../../core/binding';
import { readResponse } from '../../core/envelope';
import { resolveValue } from '../../core/expressions';
import type { UiActionStep, UiState, UiWebhookStep } from '../../core/types';
import type { UiBuilderHost } from '../host';
import type { WebhookTarget } from './useWebhookTargets';

/**
 * Filling the canvas with real data.
 *
 * The canvas renders against an empty state, so every bound prop shows blank
 * and an author composing a table has to imagine the rows. Both of these put an
 * action's actual response into that state, after which the canvas is a preview
 * of the running app rather than a wireframe.
 *
 * Three ways in, because they answer different questions. Running one step asks
 * "what does this return right now", and costs a real execution against a live
 * webhook. Running the chain asks "where does a whole interaction leave the
 * app", and costs one execution per call it makes. Reading the last execution
 * asks "what did it return", costs nothing, and works when the workflow is not
 * published.
 */
export function useActionPreview(
	host: UiBuilderHost,
	state: UiState,
	targetFor: (url: string, method?: UiWebhookStep['method']) => WebhookTarget | undefined,
	loadEligible: () => Promise<void>,
) {
	const previewStatus = ref('');

	/**
	 * Every reply previewed so far, by the key its step carries. Kept beyond the
	 * step that fetched it so the inspector's expressions complete against real
	 * values: `$responses.orders.` offers the keys the workflow actually returns.
	 */
	const responses = reactive<Record<string, unknown>>({});

	/** The scope a step resolves in: app state, plus what the chain has been told so far. */
	function scopeAt(response: unknown) {
		return { $state: state, $response: response, $responses: responses };
	}

	/** One call, as the running app would make it. Throws if the endpoint never answers. */
	async function call(step: UiWebhookStep, response: unknown): Promise<unknown> {
		const method = step.method ?? 'POST';

		const reply = await fetch(step.url, {
			method,
			headers: { 'content-type': 'application/json' },
			...(method === 'GET' ? {} : { body: JSON.stringify(requestBody(step, scopeAt(response))) }),
		});

		return await reply.json().catch(() => undefined);
	}

	function record(step: UiWebhookStep, payload: unknown): unknown {
		const response = readResponse(payload).body;
		if (step.key) responses[step.key] = response;
		return response;
	}

	function report(source: string, written: string[]) {
		previewStatus.value = written.length
			? `${source}: ${written.join(', ')}`
			: `${source}: nothing kept the reply`;
	}

	/**
	 * Walks steps in order, exactly as the running app would: each call's reply
	 * becomes `$response` for the `set` steps after it, and every reply so far is
	 * `$responses` for the ones after that.
	 *
	 * `notify` and `navigate` are passed over. Both act on the browser rather than
	 * on state, and moving the canvas off the page being edited is not what
	 * running a preview was asked for.
	 */
	async function runSteps(steps: UiActionStep[], source: string, seed?: unknown) {
		const written: string[] = [];
		let calls = 0;
		let response = seed;

		for (const step of steps) {
			if (step.kind === 'webhook') {
				if (!step.url) continue;

				previewStatus.value = calls ? `running… (call ${calls + 1})` : 'running…';

				try {
					response = record(step, await call(step, response));
				} catch (error) {
					console.error('[ui-builder] could not run the action', step.url, error);
					previewStatus.value = 'the action did not respond';
					return;
				}

				calls++;
				continue;
			}

			if (step.kind !== 'set') continue;

			const value = cloneDeep(resolveValue(step.value, scopeAt(response)));
			if (writeState(state, step.path, value)) written.push(step.path);
		}

		report(calls > 1 ? `ran ${calls} calls` : source, written);
	}

	/**
	 * Of the steps after a call, the ones that place its reply. The rest of a
	 * chain's `set` steps — the `{}` that empties a form once it has been saved —
	 * belong to the interaction, not to the reply, and running one on its own
	 * would clear the canvas state the very next preview reads its body from.
	 */
	function placingSteps(following: UiActionStep[]): UiActionStep[] {
		return following.filter(
			(step) =>
				step.kind === 'set' && typeof step.value === 'string' && step.value.includes('$response'),
		);
	}

	/** Call the step's endpoint from the canvas, exactly as the running app would. */
	async function runAction(step: UiWebhookStep, following: UiActionStep[]) {
		if (!step.url) return;

		// `following` stops at the next call, so this is the one step and the steps
		// its reply reaches — never a second call.
		await runSteps([step, ...placingSteps(following)], 'ran');
	}

	/**
	 * The whole chain, as one interaction: a save that then reloads the list fills
	 * the canvas with what the app looks like after the click, which running
	 * either call on its own cannot show.
	 */
	async function runChain(steps: UiActionStep[]) {
		if (!steps.some((step) => step.kind === 'webhook' && step.url)) {
			previewStatus.value = 'no step in this action calls anything';
			return;
		}

		await runSteps(steps, 'ran');
	}

	async function loadLastExecution(step: UiWebhookStep, following: UiActionStep[]) {
		const url = step.url;
		let target = targetFor(url, step.method);

		// A URL the document was saved with says nothing about which workflow
		// answers it, and executions are listed by workflow. One scan resolves it.
		if (target && !target.workflowId) {
			previewStatus.value = 'finding the workflow…';
			await loadEligible();
			target = targetFor(url, step.method);
		}

		if (!target?.workflowId) {
			previewStatus.value = 'pick an endpoint first';
			return;
		}

		previewStatus.value = 'loading…';

		try {
			const output = await host.lastExecutionOutput(target.workflowId);

			if (!output) {
				previewStatus.value = 'no executions yet';
				return;
			}

			if (output.json === undefined) {
				previewStatus.value = 'that execution returned nothing';
				return;
			}

			// The reply is already in hand, so the steps it reaches are walked with it
			// as their `$response` and nothing is called.
			await runSteps(
				placingSteps(following),
				output.node ?? 'execution',
				record(step, output.json),
			);
		} catch (error) {
			console.error('[ui-builder] could not read the last execution', target.workflowId, error);
			previewStatus.value = 'could not read the execution';
		}
	}

	return { previewStatus, responses, runAction, runChain, loadLastExecution };
}
