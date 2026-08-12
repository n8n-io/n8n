import { computed, ref, watch } from 'vue';

import type { UiHttpMethod } from '../../core/types';
import type { HostEndpoint, HostWorkflow, UiBuilderHost } from '../host';

/** An endpoint a step can point at, ready to show in a dropdown. */
export interface WebhookTarget {
	label: string;
	url: string;
	method: UiHttpMethod;
	workflowId?: string;
}

/** A workflow's endpoints, for the cross-workflow picker. */
export interface EligibleWorkflow extends HostWorkflow {
	triggers: WebhookTarget[];
}

function lastSegment(url: string): string {
	return url.split('/').filter(Boolean).pop() ?? url;
}

/**
 * A step names one endpoint, and a path alone does not: an API Router serves
 * `GET /orders` and `POST /orders` from the same URL. Everything that has to
 * tell two targets apart — the dropdown's value, the lookup a preview does —
 * goes through this.
 */
export function targetKey(url: string, method: UiHttpMethod | undefined): string {
	return `${method ?? 'POST'} ${url}`;
}

/** `POST /orders-app/orders`, or the name the node gave it in front of that. */
function endpointLabel(endpoint: HostEndpoint, suffix?: string): string {
	const route = `${endpoint.method} /${endpoint.path}`;
	const named = endpoint.name ? `${endpoint.name} — ${route}` : route;

	return suffix ? `${named} — ${suffix}` : named;
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
		host.localEndpoints().map((endpoint) => ({
			label: endpointLabel(endpoint),
			url: host.webhookUrlFor(endpoint.path),
			method: endpoint.method,
			workflowId: host.workflowId(),
		})),
	);

	/**
	 * Endpoints picked out of another workflow, remembered for the session so that
	 * a URL the document already holds reads as a name rather than as itself.
	 */
	const knownTargets = ref<Record<string, WebhookTarget>>({});

	function targetFor(url: string, method?: UiHttpMethod): WebhookTarget | undefined {
		if (!url) return undefined;

		const key = targetKey(url, method);

		return (
			localTargets.value.find((target) => targetKey(target.url, target.method) === key) ??
			knownTargets.value[key] ??
			// Same URL, some other method: still this workflow, and saying so beats
			// claiming it lives elsewhere.
			localTargets.value.find((target) => target.url === url) ?? {
				// Nothing has told us which workflow answers this URL yet. The path is
				// still the useful half of the label, and opening the picker fills the
				// rest in.
				label: `${method ?? 'POST'} ${lastSegment(url)} — another workflow`,
				url,
				method: method ?? 'POST',
			}
		);
	}

	function labelFor(url: string, method?: UiHttpMethod): string {
		return targetFor(url, method)?.label ?? url;
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
					triggers: workflow.endpoints.map((endpoint) => ({
						label: endpointLabel(endpoint, workflow.name),
						url: host.webhookUrlFor(endpoint.path),
						method: endpoint.method,
						workflowId: workflow.id,
					})),
				}))
				.filter((workflow) => workflow.triggers.length > 0);

			eligible.value = found;

			// Anything the document already points at now has a name to show, and a
			// workflow id to read executions from.
			for (const workflow of found) {
				for (const trigger of workflow.triggers) {
					knownTargets.value[targetKey(trigger.url, trigger.method)] = trigger;
				}
			}
		} catch (error) {
			console.error('[ui-builder] could not list webhook triggers', error);
			eligible.value = [];
		} finally {
			pickerLoading.value = false;
		}
	}

	/**
	 * Matches on the workflow's name or on the endpoint's own label, which holds
	 * its method, path and name — all three are how you would look for it.
	 */
	const pickerResults = computed<EligibleWorkflow[]>(() => {
		const query = pickerQuery.value.trim().toLowerCase();
		if (!query) return eligible.value;

		return eligible.value
			.map((workflow) => ({
				...workflow,
				triggers: workflow.name.toLowerCase().includes(query)
					? workflow.triggers
					: workflow.triggers.filter((trigger) => trigger.label.toLowerCase().includes(query)),
			}))
			.filter((workflow) => workflow.triggers.length > 0);
	});

	/**
	 * Resolves a promise rather than writing anywhere, so the step editor owns
	 * its own steps and this stays a dialog the panel happens to host.
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
		knownTargets.value[targetKey(target.url, target.method)] = target;
		closePicker(target);
	}

	// Dismissing the dialog any other way (Escape, the close button, a click
	// outside) has to settle the promise too, or the caller waits forever.
	watch(pickerOpen, (isOpen) => {
		if (!isOpen) closePicker(undefined);
	});

	return {
		localTargets,
		targetFor,
		labelFor,
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
