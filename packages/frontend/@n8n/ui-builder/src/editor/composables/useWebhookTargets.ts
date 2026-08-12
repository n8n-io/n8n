import { computed, ref, watch } from 'vue';

import type { HostWorkflow, UiBuilderHost } from '../host';

/** A Webhook trigger a step can point at, ready to show in a dropdown. */
export interface WebhookTarget {
	label: string;
	url: string;
	/** The method the underlying Webhook node is configured for. Unknown until resolved. */
	method?: 'GET' | 'POST';
	workflowId?: string;
}

/** A workflow's triggers, for the cross-workflow picker. */
export interface EligibleWorkflow extends HostWorkflow {
	triggers: WebhookTarget[];
}

function lastSegment(url: string): string {
	return url.split('/').filter(Boolean).pop() ?? url;
}

/**
 * Which triggers a webhook step can be pointed at, and the picker for reaching
 * past the workflow being edited.
 */
export function useWebhookTargets(host: UiBuilderHost) {
	/**
	 * The workflow being edited, and nothing else, including triggers added a
	 * moment ago and not yet saved.
	 *
	 * A path therefore needs no qualifying. A step nearly always talks to a
	 * trigger sitting beside it, and listing every webhook on the instance buried
	 * those few among strangers. Reaching further afield is the picker's job.
	 */
	const localTargets = computed<WebhookTarget[]>(() =>
		host.localWebhookPaths().map((entry) => ({
			label: entry.path,
			url: host.webhookUrlFor(entry.path),
			method: entry.method,
			workflowId: host.workflowId(),
		})),
	);

	/**
	 * Triggers picked out of another workflow, remembered for the session so that
	 * a URL the document already holds reads as a name rather than as itself.
	 */
	const knownTargets = ref<Record<string, WebhookTarget>>({});

	function targetForUrl(url: string): WebhookTarget | undefined {
		if (!url) return undefined;

		return (
			localTargets.value.find((target) => target.url === url) ??
			knownTargets.value[url] ?? {
				// Nothing has told us which workflow answers this URL yet. The path is
				// still the useful half of the label, and opening the picker fills the
				// rest in.
				label: `${lastSegment(url)} — another workflow`,
				url,
			}
		);
	}

	function labelForUrl(url: string): string {
		return targetForUrl(url)?.label ?? url;
	}

	const pickerOpen = ref(false);
	const pickerQuery = ref('');
	const pickerLoading = ref(false);
	const eligible = ref<EligibleWorkflow[]>([]);

	let settle: ((target: WebhookTarget | undefined) => void) | undefined;
	let scanning: Promise<void> | undefined;

	/**
	 * One scan at a time, and a second caller waits for it rather than being told
	 * there is nothing: reading a trigger's last execution asks for this to
	 * resolve a workflow, and an early return there reads as "pick a trigger
	 * first", which is wrong.
	 *
	 * It runs when the picker opens rather than when the builder does, because
	 * reaching outside the workflow is the rare case and should be the only one
	 * paying for a scan of the instance.
	 */
	async function loadEligible(): Promise<void> {
		scanning ??= scan().finally(() => {
			scanning = undefined;
		});

		await scanning;
	}

	async function scan(): Promise<void> {
		pickerLoading.value = true;

		try {
			const workflows = await host.listWebhookWorkflows();

			const found = workflows
				.map((workflow) => ({
					...workflow,
					triggers: workflow.paths.map((entry) => ({
						label: `${entry.path} — ${workflow.name}`,
						url: host.webhookUrlFor(entry.path),
						method: entry.method,
						workflowId: workflow.id,
					})),
				}))
				.filter((workflow) => workflow.triggers.length > 0);

			eligible.value = found;

			// Anything the document already points at now has a name to show, and a
			// workflow id to read executions from.
			for (const workflow of found) {
				for (const trigger of workflow.triggers) knownTargets.value[trigger.url] = trigger;
			}
		} catch (error) {
			console.error('[ui-builder] could not list webhook triggers', error);
			eligible.value = [];
		} finally {
			pickerLoading.value = false;
		}
	}

	/** Matches on the workflow's name or on a trigger's path, since both are how you would look. */
	const pickerResults = computed<EligibleWorkflow[]>(() => {
		const query = pickerQuery.value.trim().toLowerCase();
		if (!query) return eligible.value;

		return eligible.value
			.map((workflow) => ({
				...workflow,
				triggers: workflow.name.toLowerCase().includes(query)
					? workflow.triggers
					: workflow.triggers.filter((trigger) =>
							lastSegment(trigger.url).toLowerCase().includes(query),
						),
			}))
			.filter((workflow) => workflow.triggers.length > 0);
	});

	/**
	 * Resolves a promise rather than writing anywhere, so the step editor owns
	 * its own steps and this stays a dialog the panel happens to host. Resolves
	 * with the whole target, not just its URL, so the method it is configured
	 * for travels with the pick rather than being looked up separately.
	 */
	async function pickExternal(): Promise<WebhookTarget | undefined> {
		pickerQuery.value = '';
		pickerOpen.value = true;
		void loadEligible();

		return await new Promise<WebhookTarget | undefined>((resolve) => {
			settle = resolve;
		});
	}

	function closePicker(target?: WebhookTarget) {
		pickerOpen.value = false;
		settle?.(target);
		settle = undefined;
	}

	function pickTarget(target: WebhookTarget) {
		knownTargets.value[target.url] = target;
		closePicker(target);
	}

	// Dismissing the dialog any other way (Escape, the close button, a click
	// outside) has to settle the promise too, or the caller waits forever.
	watch(pickerOpen, (isOpen) => {
		if (!isOpen) closePicker(undefined);
	});

	return {
		localTargets,
		targetForUrl,
		labelForUrl,
		loadEligible,
		pickerOpen,
		pickerQuery,
		pickerLoading,
		pickerResults,
		pickExternal,
		closePicker,
		pickTarget,
	};
}
