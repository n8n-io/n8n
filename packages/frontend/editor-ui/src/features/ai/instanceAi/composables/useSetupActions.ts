import type { ComputedRef, Ref } from 'vue';
import { ref, watch, onUnmounted } from 'vue';
import type { InstanceAiToolCallState, InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { INodeUi } from '@/Interface';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { useInstanceAiStore } from '../instanceAi.store';
import type { DisplayCard, SetupCard } from '../instanceAiWorkflowSetup.utils';

export function useSetupActions(deps: {
	requestId: Ref<string>;
	store: ReturnType<typeof useInstanceAiStore>;
	cards: ComputedRef<SetupCard[]>;
	currentDisplayCard: ComputedRef<DisplayCard | undefined>;
	displayCards: ComputedRef<DisplayCard[]>;
	buildNodeCredentials: () => Record<string, Record<string, string>>;
	buildNodeParameters: () => Record<string, Record<string, unknown>> | undefined;
	isCardComplete: (card: SetupCard) => boolean;
	anyCardComplete: ComputedRef<boolean>;
	allPreResolved: ComputedRef<boolean>;
	showFullWizard: Ref<boolean>;
	setCredentialForGroup: (groupKey: string, credentialType: string, credentialId: string) => void;
	clearCredentialForGroup: (groupKey: string, credentialType: string) => void;
	goToNext: () => void;
	isNextDisabled: ComputedRef<boolean>;
	credGroupKey: (req: InstanceAiWorkflowSetupNode) => string;
	setupRequests: Ref<InstanceAiWorkflowSetupNode[]>;
	onApplySuccess?: () => void;
}) {
	const telemetry = useTelemetry();
	const workflowsStore = useWorkflowsStore();
	const nodeHelpers = useNodeHelpers();

	const isSubmitted = ref(false);
	const isDeferred = ref(false);
	const isPartial = ref(false);
	const isApplying = ref(false);
	const applyError = ref<string | null>(null);

	function isToolResult(val: unknown): val is Record<string, unknown> {
		return typeof val === 'object' && val !== null && !Array.isArray(val);
	}

	let cancelApplyWait: (() => void) | null = null;

	onUnmounted(() => {
		cancelApplyWait?.();
	});

	function trackSetupInput() {
		const tc = deps.store.findToolCallByRequestId(deps.requestId.value);
		const inputThreadId = tc?.confirmation?.inputThreadId ?? '';
		const provided: Array<{ label: string; options: string[]; option_chosen: string }> = [];
		const skipped: Array<{ label: string; options: string[] }> = [];
		for (const card of deps.cards.value) {
			const name = card.nodes[0]?.node.name ?? card.id;
			if (deps.isCardComplete(card)) {
				provided.push({ label: name, options: [], option_chosen: 'configured' });
			} else {
				skipped.push({ label: name, options: [] });
			}
		}
		telemetry.track('User finished providing input', {
			thread_id: deps.store.currentThreadId,
			input_thread_id: inputThreadId,
			instance_id: useRootStore().instanceId,
			type: 'setup',
			provided_inputs: provided,
			skipped_inputs: skipped,
			num_tasks: deps.cards.value.length,
		});
	}

	/** Watch for the tool-result SSE event and resolve when it arrives. */
	function waitForToolResult(
		requestId: string,
		timeoutMs = 60_000,
	): { promise: Promise<Record<string, unknown> | null>; cancel: () => void } {
		let stopWatch: (() => void) | null = null;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		const promise = new Promise<Record<string, unknown> | null>((resolve) => {
			const existing = deps.store.findToolCallByRequestId(requestId);
			if (existing?.result !== undefined) {
				resolve(isToolResult(existing.result) ? existing.result : null);
				return;
			}

			stopWatch = watch(
				() => {
					const tc: InstanceAiToolCallState | undefined =
						deps.store.findToolCallByRequestId(requestId);
					return tc?.result;
				},
				(result) => {
					if (result !== undefined) {
						cleanup();
						resolve(isToolResult(result) ? result : null);
					}
				},
			);

			timeoutId = setTimeout(() => {
				cleanup();
				resolve(null);
			}, timeoutMs);
		});

		function cleanup() {
			if (stopWatch) {
				stopWatch();
				stopWatch = null;
			}
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
		}

		return { promise, cancel: cleanup };
	}

	/**
	 * Apply the server's authoritative updatedNodes to the canvas.
	 */
	function applyServerResultToCanvas(toolResult: Record<string, unknown>) {
		const updatedNodes = toolResult.updatedNodes as
			| Array<{
					id: string;
					name?: string;
					type: string;
					typeVersion: number;
					position: [number, number];
					parameters?: Record<string, unknown>;
					credentials?: Record<string, { id?: string; name: string }>;
			  }>
			| undefined;

		if (!updatedNodes) return;

		for (const serverNode of updatedNodes) {
			const canvasNode = workflowsStore.getNodeByName(serverNode.name ?? '');
			if (!canvasNode) continue;

			if (serverNode.credentials) {
				canvasNode.credentials = serverNode.credentials as INodeUi['credentials'];
			}
			if (serverNode.parameters) {
				canvasNode.parameters = serverNode.parameters as INodeUi['parameters'];
			}

			if (serverNode.name) {
				nodeHelpers.updateNodeParameterIssuesByName(serverNode.name);
				nodeHelpers.updateNodeCredentialIssuesByName(serverNode.name);
			}
		}
	}

	async function handleApply() {
		const nodeCredentials = deps.buildNodeCredentials();
		const nodeParameters = deps.buildNodeParameters();

		trackSetupInput();

		isApplying.value = true;
		applyError.value = null;

		const postSuccess = await deps.store.confirmAction(
			deps.requestId.value,
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			{
				action: 'apply',
				nodeCredentials,
				nodeParameters,
			},
		);

		if (!postSuccess) {
			isApplying.value = false;
			applyError.value = 'Failed to send confirmation. Try again.';
			return;
		}

		const { promise, cancel } = waitForToolResult(deps.requestId.value);
		cancelApplyWait = cancel;
		const toolResult = await promise;
		cancelApplyWait = null;

		isApplying.value = false;

		if (toolResult && toolResult.success === true) {
			applyServerResultToCanvas(toolResult);
			isSubmitted.value = true;
			isPartial.value = toolResult.partial === true;
			deps.onApplySuccess?.();
			deps.store.resolveConfirmation(deps.requestId.value, 'approved');
		} else if (toolResult) {
			applyError.value = typeof toolResult.error === 'string' ? toolResult.error : 'Apply failed';
		} else {
			applyError.value = 'Apply timed out — please try again.';
		}
	}

	async function handleTestTrigger(nodeName: string) {
		const nodeCredentials = deps.buildNodeCredentials();
		const nodeParameters = deps.buildNodeParameters();

		applyError.value = null;

		const postSuccess = await deps.store.confirmAction(
			deps.requestId.value,
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			{
				action: 'test-trigger',
				testTriggerNode: nodeName,
				nodeCredentials,
				nodeParameters,
			},
		);

		if (!postSuccess) {
			applyError.value = 'Failed to send trigger test request. Try again.';
			return;
		}

		const { promise, cancel } = waitForToolResult(deps.requestId.value);
		cancelApplyWait = cancel;
		const toolResult = await promise;
		cancelApplyWait = null;

		if (toolResult === null) {
			// Timeout — the backend likely re-suspended with a new confirmation-request
			// that will replace this component. Nothing to do here.
		} else if (typeof toolResult.error === 'string') {
			applyError.value = toolResult.error;
		} else if (toolResult.success !== true) {
			applyError.value = 'Trigger test failed';
		}
	}

	async function handleLater() {
		if (!deps.allPreResolved.value || deps.showFullWizard.value) {
			const dc = deps.currentDisplayCard.value;

			if (dc?.type === 'single' && dc.card.credentialType && dc.card.nodes[0]) {
				const key = deps.credGroupKey(dc.card.nodes[0]);
				deps.clearCredentialForGroup(key, dc.card.credentialType);
			}

			if (dc?.type === 'group') {
				// Clear credentials for all cards in the group (parent + subnodes)
				const allGroupCards = [
					...(dc.group.parentCard ? [dc.group.parentCard] : []),
					...dc.group.subnodeCards,
				];
				for (const groupCard of allGroupCards) {
					if (groupCard.credentialType && groupCard.nodes[0]) {
						const key = deps.credGroupKey(groupCard.nodes[0]);
						deps.clearCredentialForGroup(key, groupCard.credentialType);
					}
				}

				if (!deps.isNextDisabled.value) {
					deps.goToNext();
					return;
				}
				if (deps.anyCardComplete.value) {
					void handleApply();
					return;
				}
			}

			if (!deps.isNextDisabled.value) {
				deps.goToNext();
				return;
			}

			if (deps.anyCardComplete.value) {
				void handleApply();
				return;
			}
		}

		// No cards completed at all (or confirm mode) — defer the whole setup
		trackSetupInput();
		isSubmitted.value = true;
		isDeferred.value = true;

		const success = await deps.store.confirmAction(deps.requestId.value, false);
		if (success) {
			deps.store.resolveConfirmation(deps.requestId.value, 'deferred');
		} else {
			isSubmitted.value = false;
			isDeferred.value = false;
		}
	}

	function onCredentialSelected(
		card: SetupCard,
		updateInfo: { properties: { credentials?: Record<string, unknown> } },
	) {
		if (!card.credentialType) return;
		const credentialData = updateInfo.properties.credentials?.[card.credentialType];
		const credentialId =
			typeof credentialData === 'object' &&
			credentialData !== null &&
			'id' in credentialData &&
			typeof credentialData.id === 'string'
				? credentialData.id
				: undefined;
		const key = card.nodes[0] ? deps.credGroupKey(card.nodes[0]) : card.credentialType;

		if (credentialId) {
			deps.setCredentialForGroup(key, card.credentialType, credentialId);
		} else {
			deps.clearCredentialForGroup(key, card.credentialType);
		}
	}

	return {
		isSubmitted,
		isDeferred,
		isPartial,
		isApplying,
		applyError,
		handleApply,
		handleLater,
		handleTestTrigger,
		onCredentialSelected,
	};
}
