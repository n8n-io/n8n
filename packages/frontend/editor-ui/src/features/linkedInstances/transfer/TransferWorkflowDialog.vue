<script setup lang="ts">
import type { LinkedInstancePushResult, LinkedInstanceSummary } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nNotice,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useResizeObserver } from '@vueuse/core';
import { computed, h, nextTick, reactive, ref, useTemplateRef, watch } from 'vue';

import StableButtonLabel from '../components/StableButtonLabel.vue';
import { syncLocalTurnOff } from './syncLocalTurnOff';
import TransferChoices from './TransferChoices.vue';
import TransferPreflightSummary from './TransferPreflightSummary.vue';
import TransferResultMessage from './TransferResultMessage.vue';
import TransferStatusLine from './TransferStatusLine.vue';
import {
	transferDialogState,
	transferHints,
	transferOptions,
	transferRequest,
	type TransferCheck,
	type TransferMoveStatus,
	type TransferWorkflow,
} from './transferDialogState';
import { transferResultView } from './transferResult';
import { useTransferWorkflow } from './useTransferWorkflow';

const props = defineProps<{
	open: boolean;
	workflow: TransferWorkflow;
	instance: LinkedInstanceSummary;
	/** The user asked for a live automation, so the dialog offers to turn the copy on. */
	offerTurnOn?: boolean;
	/** Opened from an Assistant chat: the dialog says that the chat stays here. */
	fromAssistant?: boolean;
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	moved: [result: LinkedInstancePushResult];
	/** The dialog has left the page, so the opener can move focus. */
	closed: [];
}>();

/** A finished move and whether it asked to turn on the copy there. */
interface MovedResult {
	result: LinkedInstancePushResult;
	publishAsked: boolean;
}

const i18n = useI18n();
const toast = useToast();
const body = useTemplateRef<HTMLElement>('body');
const details = useTemplateRef<HTMLElement>('details');
const detailsContent = useTemplateRef<HTMLElement>('detailsContent');
const place = computed(() => props.instance.name);
const interpolate = computed(() => ({ place: place.value }));

const { preflight, isMoving, moveError, retry, move } = useTransferWorkflow(
	() => props.open,
	() => ({ linkId: props.instance.id, workflowId: props.workflow.id }),
	{
		checkFailed: () =>
			i18n.baseText('linkedInstances.transfer.checkFailed', { interpolate: interpolate.value }),
		moveFailed: () =>
			i18n.baseText('linkedInstances.transfer.moveFailed', { interpolate: interpolate.value }),
	},
);

const choice = reactive({ turnOffHere: false, turnOn: false });
// Shown as a toast once the dialog has left, so that screen readers announce it.
let moved: MovedResult | undefined;

const state = computed(() =>
	preflight.value.status === 'ready' ? transferDialogState(preflight.value.preflight) : undefined,
);
const check = computed<TransferCheck>(
	() => state.value ?? (preflight.value.status === 'failed' ? 'failed' : 'checking'),
);
const moveStatus = computed<TransferMoveStatus>(() => {
	if (isMoving.value) return 'moving';
	return moveError.value ? 'failed' : 'idle';
});
const options = computed(() =>
	transferOptions({
		liveHere: props.workflow.liveHere,
		canUnpublish: props.workflow.canUnpublish,
		offerTurnOn: props.offerTurnOn === true,
	}),
);
const showChoices = computed(
	() => state.value?.canMove === true && (options.value.showTurnOffHere || options.value.showTurnOn),
);
const hints = computed(() =>
	state.value ? transferHints(state.value, options.value, choice) : [],
);
const canSubmit = computed(() => state.value?.canMove === true && !isMoving.value);

// A long list of credentials scrolls. Only then the details take a stop in the Tab order.
const detailsScroll = ref(false);
useResizeObserver([details, detailsContent], () => {
	const element = details.value;
	detailsScroll.value = element !== null && element.scrollHeight > element.clientHeight;
});

const title = computed(() =>
	i18n.baseText('linkedInstances.transfer.title', {
		interpolate: { name: props.workflow.name, place: place.value },
	}),
);
// The editor shows no description: only an Assistant chat needs to say that it stays here.
const description = computed(() =>
	props.fromAssistant
		? i18n.baseText('linkedInstances.transfer.description.fromAssistant')
		: undefined,
);
const submitLabel = computed(() =>
	isMoving.value
		? i18n.baseText('linkedInstances.transfer.moving')
		: i18n.baseText('linkedInstances.transfer.submit', { interpolate: interpolate.value }),
);
const submitLabels = computed(() => [
	i18n.baseText('linkedInstances.transfer.submit', { interpolate: interpolate.value }),
	i18n.baseText('linkedInstances.transfer.moving'),
]);

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		choice.turnOffHere = false;
		choice.turnOn = false;
		moved = undefined;
	},
	{ immediate: true },
);

function actionButton(action: 'cancel' | 'submit' | 'retry'): HTMLElement | null {
	return body.value?.querySelector<HTMLElement>(`[data-transfer-action="${action}"]`) ?? null;
}

/**
 * A button that becomes disabled or goes away drops focus. Then focus goes to the target. Focus on
 * `holder`, which only held it for a moment, also goes to the target.
 */
async function focusIfLost(target: () => HTMLElement | null, holder?: HTMLElement | null) {
	await nextTick();
	const active = document.activeElement;
	if (active === holder || !body.value?.contains(active)) target()?.focus();
}

async function onRetry() {
	await retry();
	await focusIfLost(() => actionButton(preflight.value.status === 'failed' ? 'retry' : 'cancel'));
}

async function submit() {
	if (!canSubmit.value) return;
	const request = transferRequest(props.workflow.id, options.value, choice);
	const moving = move(request);
	// Every control is disabled while the move runs. The details keep focus in the dialog.
	await nextTick();
	details.value?.focus();
	const result = await moving;
	if (!result) {
		await focusIfLost(() => actionButton('submit'), details.value);
		return;
	}
	if (result.localDeactivated) void syncLocalTurnOff(props.workflow.id);
	moved = { result, publishAsked: request.publish === true };
	emit('moved', result);
	emit('update:open', false);
}

function showResultToast({ result, publishAsked }: MovedResult) {
	toast.showToast({
		title: i18n.baseText('linkedInstances.transfer.result.title', {
			interpolate: interpolate.value,
		}),
		message: h(TransferResultMessage, {
			result,
			place: place.value,
			baseUrl: props.instance.baseUrl,
			publishAsked,
		}),
		type: transferResultView(result, props.instance.baseUrl, publishAsked).tone,
		// The toast holds links, so it stays until the user closes it.
		duration: 0,
	});
}

// The move cannot be stopped. The dialog stays open until it ends, so the user sees the result.
function onOpenChange(open: boolean) {
	if (!open && isMoving.value) return;
	emit('update:open', open);
}

// The safe choice has focus first. "Move" needs the check, so it is disabled at the start.
function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	actionButton('cancel')?.focus();
}

// The page stays hidden from screen readers until the dialog has left it, which ends after this
// event. So the toast and the focus move wait for one more task.
function onCloseAutoFocus(event: Event) {
	event.preventDefault();
	const result = moved;
	moved = undefined;
	setTimeout(() => {
		if (result) showResultToast(result);
		emit('closed');
	}, 0);
}
</script>

<template>
	<N8nDialog
		:open="open"
		:header="title"
		:description="description"
		size="medium"
		:container-class="$style.dialog"
		:show-close-button="!isMoving"
		@open-auto-focus="onOpenAutoFocus"
		@close-auto-focus="onCloseAutoFocus"
		@update:open="onOpenChange"
	>
		<div ref="body" :class="$style.body" data-test-id="transfer-workflow-dialog">
			<TransferStatusLine :check="check" :move="moveStatus" :place="place" />
			<div
				ref="details"
				:class="$style.details"
				role="region"
				:aria-label="i18n.baseText('linkedInstances.transfer.details')"
				:tabindex="detailsScroll ? 0 : -1"
				data-test-id="transfer-details"
			>
				<div ref="detailsContent" :class="$style.detailsContent">
					<!-- The status line reads this text, so screen readers skip the copy here. -->
					<p
						v-if="preflight.status === 'checking'"
						:class="$style.checking"
						aria-hidden="true"
						data-test-id="transfer-checking"
					>
						<span :class="$style.spinner"><N8nSpinner size="small" /></span>
						<N8nText size="small">{{ i18n.baseText('linkedInstances.transfer.checking') }}</N8nText>
					</p>
					<div v-else-if="preflight.status === 'failed'" :class="$style.failed">
						<N8nNotice theme="warning" :class="$style.notice" data-test-id="transfer-check-error">
							{{ preflight.message }}
						</N8nNotice>
						<N8nButton
							variant="outline"
							size="small"
							:label="i18n.baseText('linkedInstances.transfer.retry')"
							data-transfer-action="retry"
							data-test-id="transfer-retry"
							@click="onRetry"
						/>
					</div>
					<TransferPreflightSummary v-else-if="state" :state="state" :place="place" />

					<TransferChoices
						v-if="showChoices"
						v-model:turn-off-here="choice.turnOffHere"
						v-model:turn-on="choice.turnOn"
						:options="options"
						:hints="hints"
						:place="place"
						:disabled="isMoving"
					/>

					<N8nNotice
						v-if="moveError"
						theme="danger"
						:class="$style.notice"
						data-test-id="transfer-move-error"
					>
						{{ moveError }}
					</N8nNotice>
				</div>
			</div>

			<N8nDialogFooter>
				<N8nButton
					variant="outline"
					:disabled="isMoving"
					:label="i18n.baseText('generic.cancel')"
					data-transfer-action="cancel"
					data-test-id="transfer-cancel"
					@click="onOpenChange(false)"
				/>
				<!-- The status line reads "Moving", so the label change is not read a second time. -->
				<N8nButton
					variant="solid"
					:disabled="!canSubmit"
					aria-live="off"
					data-transfer-action="submit"
					data-test-id="transfer-submit"
					@click="submit"
				>
					<StableButtonLabel :label="submitLabel" :labels="submitLabels" />
				</N8nButton>
			</N8nDialogFooter>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

// The dialog starts at a fixed distance from the top, so a change of its height moves only what is
// below the change. `translate` adds to the centring `transform` of the design system and cancels
// its vertical part, so the open animation stays the same.
.dialog[role='dialog'] {
	--transfer-dialog--top: min(12dvh, var(--spacing--4xl));

	top: var(--transfer-dialog--top);
	translate: 0 50%;
	display: flex;
	flex-direction: column;
	max-height: calc(100dvh - var(--transfer-dialog--top) - var(--spacing--lg));
}

.body {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	min-height: 0;
	padding-block: var(--spacing--xs) 0;
}

// Only the details scroll. The title and the buttons stay in view.
.details {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
	// Room for the focus rings of the controls, which the scroll box clips.
	margin: calc(-1 * var(--spacing--4xs));
	padding: var(--spacing--4xs);
	border-radius: var(--radius);

	@include focus.focus-visible-ring;
}

.detailsContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.checking {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin: 0;
}

.spinner {
	display: inline-flex;

	// The blocks do not move with reduced motion. The text alone tells that the check runs.
	@media (prefers-reduced-motion: reduce) {
		display: none;
	}
}

.failed {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.notice {
	--notice--margin: 0;
}
</style>
