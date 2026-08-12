import { isPlainObject } from 'lodash';
import { ref } from 'vue';

import { readResponse } from '../../core/envelope';
import { deepMerge } from '../../core/state';
import type { UiState } from '../../core/types';
import type { UiBuilderHost } from '../host';
import type { WebhookTarget } from './useWebhookTargets';

function isRecord(value: unknown): value is Record<string, unknown> {
	return isPlainObject(value);
}

/**
 * Filling the canvas with real data.
 *
 * The canvas renders against an empty state, so every bound prop shows blank
 * and an author composing a table has to imagine the rows. Both of these put an
 * action's actual response into that state, after which the canvas is a preview
 * of the running app rather than a wireframe.
 *
 * Two ways in, because they answer different questions. Running the step asks
 * "what does this return right now", and costs a real execution against a live
 * webhook. Reading the last execution asks "what did it return", costs nothing,
 * and works when the workflow is not published.
 */
export function useActionPreview(
	host: UiBuilderHost,
	state: UiState,
	targetForUrl: (url: string) => WebhookTarget | undefined,
	loadEligible: () => Promise<void>,
) {
	const previewStatus = ref('');

	function apply(payload: unknown, source: string) {
		const merged = readResponse(payload).state;

		// lodash's `isPlainObject` is typed as a plain boolean, so it narrows nothing.
		if (!isRecord(merged)) {
			previewStatus.value = `${source}: nothing to preview`;
			return;
		}

		deepMerge(state, merged);
		previewStatus.value = `${source}: ${Object.keys(merged).join(', ')}`;
	}

	/** Call the step's trigger with its configured method, exactly as the running app would. */
	async function runAction(url: string, method: 'GET' | 'POST' = 'POST') {
		if (!url) return;

		previewStatus.value = 'running…';

		try {
			const response = await fetch(url, {
				method,
				headers: { 'content-type': 'application/json' },
				// A GET carrying a body is refused by the browser before it is sent.
				...(method === 'GET' ? {} : { body: JSON.stringify(state) }),
			});

			apply(await response.json(), 'ran');
		} catch (error) {
			console.error('[ui-builder] could not run the action', url, error);
			previewStatus.value = 'the action did not respond';
		}
	}

	async function loadLastExecution(url: string) {
		let target = targetForUrl(url);

		// A URL the document was saved with says nothing about which workflow
		// answers it, and executions are listed by workflow. One scan resolves it.
		if (target && !target.workflowId) {
			previewStatus.value = 'finding the workflow…';
			await loadEligible();
			target = targetForUrl(url);
		}

		if (!target?.workflowId) {
			previewStatus.value = 'pick a trigger first';
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

			apply(output.json, output.node ?? 'execution');
		} catch (error) {
			console.error('[ui-builder] could not read the last execution', target.workflowId, error);
			previewStatus.value = 'could not read the execution';
		}
	}

	return { previewStatus, runAction, loadLastExecution };
}
