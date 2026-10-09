<script setup lang="ts">
import type { LinkedInstancePushResult, LinkedInstanceSummary } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogFooter,
	N8nNotice,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, h, nextTick, reactive, useTemplateRef, watch } from 'vue';

import StableButtonLabel from '../components/StableButtonLabel.vue';
import { syncLocalTurnOff } from './syncLocalTurnOff';
import TransferPreflightSummary from './TransferPreflightSummary.vue';
import TransferResultMessage from './TransferResultMessage.vue';
import {
	transferDialogState,
	transferHints,
	transferOptions,
	transferRequest,
	type TransferHint,
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

const HINT_TEXT: Record<TransferHint, BaseTextKey> = {
	nothingRuns: 'linkedInstances.transfer.hint.nothingRuns',
	staysOffUntilSetUp: 'linkedInstances.transfer.hint.staysOffUntilSetUp',
	staysOnHereUntilLive: 'linkedInstances.transfer.hint.staysOnHereUntilLive',
};

const i18n = useI18n();
const toast = useToast();
const body = useTemplateRef<HTMLElement>('body');
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
let movedResult: LinkedInstancePushResult | undefined;

const state = computed(() =>
	preflight.value.status === 'ready' ? transferDialogState(preflight.value.preflight) : undefined,
);
const options = computed(() =>
	transferOptions({
		liveHere: props.workflow.liveHere,
		canUnpublish: props.workflow.canUnpublish,
		offerTurnOn: props.offerTurnOn === true,
	}),
);
const hints = computed(() =>
	state.value ? transferHints(state.value, options.value, choice) : [],
);
const canSubmit = computed(() => state.value?.canMove === true && !isMoving.value);

const title = computed(() =>
	i18n.baseText('linkedInstances.transfer.title', {
		interpolate: { name: props.workflow.name, place: place.value },
	}),
);
const description = computed(() =>
	props.fromAssistant
		? i18n.baseText('linkedInstances.transfer.description.fromAssistant')
		: i18n.baseText('linkedInstances.transfer.description', { interpolate: interpolate.value }),
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
		movedResult = undefined;
	},
	{ immediate: true },
);

function actionButton(action: 'cancel' | 'submit' | 'retry'): HTMLElement | null {
	return body.value?.querySelector<HTMLElement>(`[data-transfer-action="${action}"]`) ?? null;
}

/** A button that becomes disabled or goes away drops focus. Then focus goes to the target. */
async function focusIfLost(target: () => HTMLElement | null) {
	await nextTick();
	if (!body.value?.contains(document.activeElement)) target()?.focus();
}

async function onRetry() {
	await retry();
	await focusIfLost(() => actionButton(preflight.value.status === 'failed' ? 'retry' : 'cancel'));
}

async function submit() {
	if (!canSubmit.value) return;
	const result = await move(transferRequest(props.workflow.id, options.value, choice));
	if (!result) {
		await focusIfLost(() => actionButton('submit'));
		return;
	}
	if (result.localDeactivated) void syncLocalTurnOff(props.workflow.id);
	movedResult = result;
	emit('moved', result);
	emit('update:open', false);
}

function showResultToast(result: LinkedInstancePushResult) {
	toast.showToast({
		title: i18n.baseText('linkedInstances.transfer.result.title', {
			interpolate: interpolate.value,
		}),
		message: h(TransferResultMessage, {
			result,
			place: place.value,
			baseUrl: props.instance.baseUrl,
		}),
		type: transferResultView(result, props.instance.baseUrl).tone,
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
	const result = movedResult;
	movedResult = undefined;
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
		:show-close-button="!isMoving"
		@open-auto-focus="onOpenAutoFocus"
		@close-auto-focus="onCloseAutoFocus"
		@update:open="onOpenChange"
	>
		<div ref="body" :class="$style.body" data-test-id="transfer-workflow-dialog">
			<div aria-live="polite">
				<p
					v-if="preflight.status === 'checking'"
					:class="$style.checking"
					data-test-id="transfer-checking"
				>
					<span aria-hidden="true"><N8nSpinner size="small" /></span>
					<N8nText size="small">{{ i18n.baseText('linkedInstances.transfer.checking') }}</N8nText>
				</p>
				<div v-else-if="preflight.status === 'failed'" :class="$style.failed">
					<N8nNotice theme="danger" :class="$style.notice" data-test-id="transfer-check-error">
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
			</div>

			<template v-if="state?.canMove">
				<section v-if="options.showTurnOffHere" :class="$style.choice">
					<N8nText tag="h3" size="small" bold>
						{{ i18n.baseText('linkedInstances.transfer.copyHere.heading') }}
					</N8nText>
					<N8nCheckbox
						v-model="choice.turnOffHere"
						:label="i18n.baseText('linkedInstances.transfer.copyHere.turnOff')"
						:disabled="isMoving"
						data-test-id="transfer-turn-off-here"
					/>
				</section>
				<section v-if="options.showTurnOn" :class="$style.choice">
					<N8nText tag="h3" size="small" bold>
						{{ i18n.baseText('linkedInstances.transfer.copyThere.heading', { interpolate }) }}
					</N8nText>
					<N8nCheckbox
						v-model="choice.turnOn"
						:label="i18n.baseText('linkedInstances.transfer.copyThere.turnOn', { interpolate })"
						:disabled="isMoving"
						data-test-id="transfer-turn-on"
					/>
				</section>
			</template>

			<div aria-live="polite" :class="$style.hints">
				<N8nText
					v-for="hint in hints"
					:key="hint"
					tag="p"
					size="small"
					color="text-base"
					:data-test-id="`transfer-hint-${hint}`"
				>
					{{ i18n.baseText(HINT_TEXT[hint], { interpolate }) }}
				</N8nText>
				<N8nNotice
					v-if="moveError"
					theme="danger"
					:class="$style.notice"
					data-test-id="transfer-move-error"
				>
					{{ moveError }}
				</N8nNotice>
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
				<N8nButton
					variant="solid"
					:disabled="!canSubmit"
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
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-block: var(--spacing--xs) 0;
}

.checking {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin: 0;
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

.choice {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.hints {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);

	// An empty live region stays in the page for screen readers, but out of the layout.
	&:not(:has(> *)) {
		position: absolute;
	}
}
</style>
