<script setup lang="ts">
/**
 * SPIKE (INS-1154) — throwaway slim chat body for the floating window.
 * Prefer composing Message / Input / StatusBar / ConfirmationPanel over mounting
 * full InstanceAiThreadView (full-page layout, route teardown, artifacts sidebar).
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
	N8nIcon,
	N8nIconButton,
	N8nScrollArea,
	N8nTag,
	N8nText,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { InstanceAiAttachment } from '@n8n/api-types';

import { messageHasVisibleContent } from '../builderAgents';
import { isPendingItemFloating } from '../confirmationKinds';
import { useInstanceAiCanvasSync } from '../composables/useInstanceAiCanvasSync';
import {
	agentPageChipKey,
	useInstanceAiPageContext,
	workflowPageChipKey,
} from '../composables/useInstanceAiPageContext';
import { handoffContextKey } from '../instanceAi.handoffContext';
import { provideThread } from '../instanceAi.store';
import { nodeContextChipKey, useInstanceAiPanelStore } from '../instanceAiPanel.store';
import {
	buildFocusedNodesContextBlock,
	extractContextBlocks,
	getContextBlockType,
	getExecutionErrorChipTooltip,
	getProactiveContextChip,
	hasContextBlock,
	PROACTIVE_ERROR_CONTEXT_TYPES,
	stripContextBlocks,
} from '../instanceAiProactive';
import InstanceAiConfirmationPanel from './InstanceAiConfirmationPanel.vue';
import InstanceAiInput from './InstanceAiInput.vue';
import InstanceAiMessage from './InstanceAiMessage.vue';
import InstanceAiStatusBar from './InstanceAiStatusBar.vue';

const CONTEXT_CHIP_KEY = 'context';
const workflowChipKey = workflowPageChipKey;

type StarterActionId = 'explain' | 'debug' | 'fix' | 'custom';

const STARTER_ACTIONS: ReadonlyArray<{
	id: StarterActionId;
	icon: IconName;
	labelKey: BaseTextKey;
	descriptionKey: BaseTextKey;
	promptKey?: BaseTextKey;
	testId: string;
}> = [
	{
		id: 'fix',
		icon: 'wrench',
		labelKey: 'instanceAi.floatingPanel.action.fix',
		descriptionKey: 'instanceAi.floatingPanel.action.fix.description',
		promptKey: 'instanceAi.floatingPanel.action.fix.prompt',
		testId: 'instance-ai-floating-action-fix',
	},
	{
		id: 'explain',
		icon: 'search',
		labelKey: 'instanceAi.floatingPanel.action.explain',
		descriptionKey: 'instanceAi.floatingPanel.action.explain.description',
		promptKey: 'instanceAi.floatingPanel.action.explain.prompt',
		testId: 'instance-ai-floating-action-explain',
	},
	{
		id: 'debug',
		icon: 'bug',
		labelKey: 'instanceAi.floatingPanel.action.debug',
		descriptionKey: 'instanceAi.floatingPanel.action.debug.description',
		promptKey: 'instanceAi.floatingPanel.action.debug.prompt',
		testId: 'instance-ai-floating-action-debug',
	},
];

/** Cold-open capabilities — orientation only; the composer is the next step. */
const CAPABILITIES: ReadonlyArray<{
	icon: IconName;
	labelKey: BaseTextKey;
}> = [
	{ icon: 'workflow', labelKey: 'instanceAi.floatingPanel.empty.build' },
	{ icon: 'search', labelKey: 'instanceAi.floatingPanel.empty.explain' },
	{ icon: 'bug', labelKey: 'instanceAi.floatingPanel.empty.debug' },
	{ icon: 'wrench', labelKey: 'instanceAi.floatingPanel.empty.fix' },
];

const props = defineProps<{
	threadId: string;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const panelStore = useInstanceAiPanelStore();
const pageContext = useInstanceAiPageContext();
const thread = provideThread(props.threadId);
useInstanceAiCanvasSync(thread);

/** Per-session dismissals for offer + ambient page chips. */
const dismissedChipKeys = ref(new Set<string>());
/** Custom opens the free-form composer with context pills; quick actions send immediately. */
const showCustomComposer = ref(false);

watch(
	() => panelStore.pendingOffer?.key,
	() => {
		dismissedChipKeys.value = new Set();
		showCustomComposer.value = false;
	},
);

/**
 * Offer context (error + seeded attachments) plus ambient page context
 * (current workflow / credential / agent). Offer chips win on key collision.
 */
const contextChips = computed(() => {
	const chips: Array<{
		key: string;
		label: string;
		icon?: string;
		testId?: string;
		tooltip?: string;
	}> = [];
	const dismissed = dismissedChipKeys.value;
	const seen = new Set<string>();
	const offer = panelStore.pendingOffer;

	if (offer) {
		const errorChip = getProactiveContextChip(offer.message);
		if (errorChip && !dismissed.has(CONTEXT_CHIP_KEY)) {
			chips.push({
				key: CONTEXT_CHIP_KEY,
				...errorChip,
				tooltip: getExecutionErrorChipTooltip(offer.message) ?? undefined,
				testId: 'instance-ai-floating-context-chip',
			});
			seen.add(CONTEXT_CHIP_KEY);
		}

		for (const attachment of offer.attachments ?? []) {
			if (attachment.type === 'workflow') {
				const key = workflowChipKey(attachment.id);
				if (dismissed.has(key) || seen.has(key)) continue;
				const name = attachment.name ?? i18n.baseText('instanceAi.proactive.context.workflow');
				chips.push({
					key,
					label: name,
					icon: 'workflow',
					tooltip: attachment.executionId
						? i18n.baseText('instanceAi.attachment.workflow.failedExecutionTooltip', {
								interpolate: { name },
							})
						: i18n.baseText('instanceAi.attachment.workflow.tooltip', {
								interpolate: { name },
							}),
					testId: 'instance-ai-floating-workflow-chip',
				});
				seen.add(key);
				continue;
			}

			if (attachment.type === 'agent') {
				const key = agentPageChipKey(attachment.id);
				if (dismissed.has(key) || seen.has(key)) continue;
				const name = attachment.name ?? i18n.baseText('instanceAi.attachment.agent.fallback');
				chips.push({
					key,
					label: name,
					icon: 'robot',
					tooltip: i18n.baseText('instanceAi.attachment.agent.tooltip', {
						interpolate: { name },
					}),
					testId: 'instance-ai-floating-agent-chip',
				});
				seen.add(key);
			}
		}
	}

	for (const chip of pageContext.chips.value) {
		if (dismissed.has(chip.key) || seen.has(chip.key)) continue;
		chips.push(chip);
		seen.add(chip.key);
	}

	for (const node of panelStore.contextNodes) {
		const key = nodeContextChipKey(node.nodeId);
		if (seen.has(key)) continue;
		chips.push({
			key,
			label: node.nodeName,
			icon: 'box',
			tooltip: i18n.baseText('instanceAi.input.nodePicker.nodeTooltip', {
				interpolate: { name: node.nodeName },
			}),
			testId: 'instance-ai-floating-node-chip',
		});
		seen.add(key);
	}

	return chips;
});

/** Proactive offer only — ambient page chips must not open the action chooser. */
const hasOfferContext = computed(() => Boolean(panelStore.pendingOffer));

const visibleMessages = computed(() => thread.messages.filter(messageHasVisibleContent));
const hasFloatingConfirmation = computed(() =>
	thread.pendingConfirmations.some(isPendingItemFloating),
);
const hasInlineConfirmation = computed(() =>
	thread.pendingConfirmations.some((item) => !isPendingItemFloating(item)),
);
const showEmptyHints = computed(
	() => visibleMessages.value.length === 0 && !hasInlineConfirmation.value,
);
/**
 * Offer landing for failed runs / credentials: pick explain / debug / fix /
 * custom instead of typing first. Build invites (empty workflow) and cold opens
 * go straight to the free-form composer.
 */
const offerContextType = computed(() =>
	panelStore.pendingOffer ? getContextBlockType(panelStore.pendingOffer.message) : null,
);
const showActionChooser = computed(() => {
	const type = offerContextType.value;
	return (
		showEmptyHints.value &&
		hasOfferContext.value &&
		!showCustomComposer.value &&
		type !== null &&
		PROACTIVE_ERROR_CONTEXT_TYPES.has(type)
	);
});
const chooserTitleKey = computed<BaseTextKey>(() => {
	switch (offerContextType.value) {
		case 'execution-error':
			return 'instanceAi.floatingPanel.empty.executionErrorTitle';
		case 'credential-error':
			return 'instanceAi.floatingPanel.empty.credentialErrorTitle';
		default:
			return 'instanceAi.floatingPanel.empty.title';
	}
});
/**
 * Prefill non-error offers (e.g. empty-workflow build invite) so the user can
 * edit or send immediately. Error offers keep the explain/debug/fix chooser.
 */
const composerPrefill = computed(() => {
	const offer = panelStore.pendingOffer;
	if (!offer) return null;
	const type = offerContextType.value;
	if (type !== null && PROACTIVE_ERROR_CONTEXT_TYPES.has(type)) return null;
	const text = stripContextBlocks(offer.message);
	return text.length > 0 ? text : null;
});
const showComposer = computed(() => !showActionChooser.value && !hasFloatingConfirmation.value);
const isBusy = computed(() => thread.isStreaming || thread.isSendingMessage);

watch(visibleMessages, (messages) => {
	if (messages.length > 0) showCustomComposer.value = false;
});

onMounted(() => {
	void thread.loadHistoricalMessages().then(() => {
		thread.connectSSE();
	});
});

onUnmounted(() => {
	// Keep the runtime alive across panel close so expand-to-full-view / reopen
	// can resume the same stream. INS-1157 owns disposal policy.
});

watch(
	() => props.threadId,
	(threadId, previous) => {
		if (threadId === previous) return;
		// provideThread only runs once at setup — remount via :key on the parent.
	},
);

function dismissContextChip(key?: string) {
	if (!key) {
		panelStore.dismissPendingOffer();
		return;
	}

	if (key.startsWith('node:')) {
		panelStore.removeContextNode(key.slice('node:'.length));
		return;
	}

	const next = new Set(dismissedChipKeys.value);
	next.add(key);
	dismissedChipKeys.value = next;

	// Offer context fully cleared → drop the offer so submit doesn't reattach it.
	const offer = panelStore.pendingOffer;
	if (!offer) return;

	const dismissed = dismissedChipKeys.value;
	const offerStillHasContext =
		(getProactiveContextChip(offer.message) && !dismissed.has(CONTEXT_CHIP_KEY)) ||
		(offer.attachments ?? []).some((attachment) => {
			if (attachment.type === 'workflow') {
				return !dismissed.has(workflowChipKey(attachment.id));
			}
			if (attachment.type === 'agent') {
				return !dismissed.has(agentPageChipKey(attachment.id));
			}
			return true;
		});

	if (!offerStillHasContext) {
		panelStore.dismissPendingOffer();
	}
}

function handleSubmit(message: string, attachments?: InstanceAiAttachment[]) {
	const offer = panelStore.pendingOffer;
	const dismissed = dismissedChipKeys.value;
	let finalMessage = message;
	let finalAttachments = attachments ? [...attachments] : [];

	if (offer) {
		const contextBlocks = extractContextBlocks(offer.message);
		if (contextBlocks && !dismissed.has(CONTEXT_CHIP_KEY) && !hasContextBlock(message)) {
			finalMessage = `${message}\n\n${contextBlocks}`;
		}

		const keptOfferAttachments = (offer.attachments ?? []).filter((attachment) => {
			if (attachment.type === 'workflow') {
				return !dismissed.has(workflowChipKey(attachment.id));
			}
			if (attachment.type === 'agent') {
				return !dismissed.has(agentPageChipKey(attachment.id));
			}
			return true;
		});
		finalAttachments = [...keptOfferAttachments, ...finalAttachments];
		panelStore.dismissPendingOffer();
	}

	const offerAttachmentKeys = new Set(
		finalAttachments.map((attachment) =>
			attachment.type === 'file'
				? `file:${attachment.fileName}`
				: `${attachment.type}:${attachment.id}`,
		),
	);
	for (const attachment of pageContext.attachments.value) {
		const key =
			attachment.type === 'workflow'
				? workflowChipKey(attachment.id)
				: agentPageChipKey(attachment.id);
		if (dismissed.has(key)) continue;
		const dedupeKey = `${attachment.type}:${attachment.id}`;
		if (offerAttachmentKeys.has(dedupeKey)) continue;
		finalAttachments.push(attachment);
		offerAttachmentKeys.add(dedupeKey);
	}

	const handoff = pageContext.handoffContext.value;
	const handoffToSend = handoff && !dismissed.has(handoffContextKey(handoff)) ? handoff : undefined;

	const focusedNodesBlock = buildFocusedNodesContextBlock(panelStore.contextNodes);
	if (focusedNodesBlock) {
		finalMessage = `${finalMessage}\n\n${focusedNodesBlock}`;
	}

	panelStore.exitNodePicker();

	void thread.sendMessage(
		finalMessage,
		finalAttachments.length > 0 ? finalAttachments : undefined,
		rootStore.pushRef,
		handoffToSend,
	);
}

function onToggleNodeContextPicker() {
	panelStore.toggleNodePicker();
}

function handleStop() {
	void thread.cancelRun();
}

function onStarterAction(actionId: StarterActionId) {
	if (isBusy.value) return;

	if (actionId === 'custom') {
		showCustomComposer.value = true;
		return;
	}

	const action = STARTER_ACTIONS.find((item) => item.id === actionId);
	if (!action?.promptKey) return;
	handleSubmit(i18n.baseText(action.promptKey));
}

function onBackFromCustom() {
	showCustomComposer.value = false;
}
</script>

<template>
	<div :class="$style.root" data-test-id="instance-ai-floating-chat-body">
		<N8nScrollArea :class="$style.messages">
			<div
				:class="[
					$style.messagesInner,
					{ [$style.messagesInnerEmpty]: showEmptyHints && !showCustomComposer },
				]"
			>
				<div
					v-if="showActionChooser"
					:class="$style.empty"
					data-test-id="instance-ai-floating-action-chooser"
				>
					<div :class="$style.chooser">
						<div :class="$style.intro">
							<N8nText size="medium" color="text-dark" bold>
								{{ i18n.baseText(chooserTitleKey) }}
							</N8nText>
							<div
								v-if="contextChips.length > 0"
								:class="$style.contextChips"
								data-test-id="instance-ai-floating-action-context"
							>
								<N8nTooltip
									v-for="chip in contextChips"
									:key="chip.key ?? chip.label"
									:disabled="!chip.tooltip"
									:show-after="TOOLTIP_DELAY_MS"
									placement="top"
								>
									<template v-if="chip.tooltip" #content>
										<span :class="$style.chipTooltip">{{ chip.tooltip }}</span>
									</template>
									<div
										:class="[$style.contextChip, { [$style.chipWithTooltip]: chip.tooltip }]"
										:data-test-id="chip.testId"
									>
										<N8nTag :text="chip.label" :clickable="false" size="lg">
											<template #tag>
												<span :class="$style.contextChipContent">
													<N8nIcon :icon="chip.icon ?? 'robot'" size="small" />
													<span :class="$style.contextChipText">{{ chip.label }}</span>
													<button
														type="button"
														:class="$style.contextChipClose"
														:title="i18n.baseText('generic.close')"
														:aria-label="i18n.baseText('generic.close')"
														:data-test-id="`${chip.testId}-dismiss`"
														@click.stop="dismissContextChip(chip.key)"
													>
														<N8nIcon icon="x" size="xsmall" />
													</button>
												</span>
											</template>
										</N8nTag>
									</div>
								</N8nTooltip>
							</div>
						</div>

						<div :class="$style.actions">
							<button
								v-for="action in STARTER_ACTIONS"
								:key="action.id"
								type="button"
								:class="$style.action"
								:disabled="isBusy"
								:data-test-id="action.testId"
								@click="onStarterAction(action.id)"
							>
								<N8nIcon :icon="action.icon" size="small" :class="$style.actionIcon" />
								<span :class="$style.actionCopy">
									<span :class="$style.actionLabel">{{ i18n.baseText(action.labelKey) }}</span>
									<span :class="$style.actionDescription">
										{{ i18n.baseText(action.descriptionKey) }}
									</span>
								</span>
								<N8nIcon
									icon="arrow-right"
									size="small"
									:class="$style.actionArrow"
									aria-hidden="true"
								/>
							</button>
						</div>

						<button
							type="button"
							:class="$style.customAction"
							:disabled="isBusy"
							data-test-id="instance-ai-floating-action-custom"
							@click="onStarterAction('custom')"
						>
							{{ i18n.baseText('instanceAi.floatingPanel.action.custom') }}
						</button>
					</div>
				</div>
				<div
					v-else-if="showEmptyHints && !hasOfferContext"
					:class="$style.empty"
					data-test-id="instance-ai-floating-empty-hints"
				>
					<div :class="$style.capabilities">
						<N8nText size="medium" color="text-dark" bold>
							{{ i18n.baseText('instanceAi.floatingPanel.empty.title') }}
						</N8nText>
						<ul :class="$style.capabilityList">
							<li
								v-for="capability in CAPABILITIES"
								:key="capability.labelKey"
								:class="$style.capability"
							>
								<N8nIcon :icon="capability.icon" size="small" :class="$style.capabilityIcon" />
								<span>{{ i18n.baseText(capability.labelKey) }}</span>
							</li>
						</ul>
					</div>
				</div>
				<InstanceAiMessage
					v-for="message in visibleMessages"
					:key="message.id"
					:message="message"
				/>
				<!-- Setup / credential / questions / plan-review live here (not in the input slot). -->
				<InstanceAiConfirmationPanel kind="inline" />
				<InstanceAiStatusBar />
			</div>
		</N8nScrollArea>

		<div v-if="hasFloatingConfirmation || showComposer" :class="$style.input">
			<InstanceAiConfirmationPanel v-if="hasFloatingConfirmation" kind="floating" />
			<template v-else>
				<div v-if="showCustomComposer && showEmptyHints" :class="$style.customBar">
					<N8nTooltip
						:content="i18n.baseText('instanceAi.floatingPanel.action.back')"
						placement="top"
						:show-after="TOOLTIP_DELAY_MS"
					>
						<N8nIconButton
							icon="arrow-left"
							variant="ghost"
							size="small"
							:aria-label="i18n.baseText('instanceAi.floatingPanel.action.back')"
							data-test-id="instance-ai-floating-action-back"
							@click="onBackFromCustom"
						/>
					</N8nTooltip>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.floatingPanel.action.customHint') }}
					</N8nText>
				</div>
				<InstanceAiInput
					:is-streaming="thread.isStreaming"
					:is-submitting="thread.isSendingMessage"
					:is-awaiting-confirmation="thread.isAwaitingConfirmation"
					:is-plan-edit-mode="false"
					:is-workflow-builder-available="true"
					:current-thread-id="thread.id"
					:context-chips="contextChips"
					:prefill-text="composerPrefill"
					:show-node-context-picker="true"
					:is-node-context-picker-active="panelStore.isNodePickerActive"
					:placeholder-key="
						panelStore.isNodePickerActive ? 'instanceAi.input.nodePicker.placeholder' : undefined
					"
					@submit="handleSubmit"
					@stop="handleStop"
					@dismiss-context-chip="dismissContextChip"
					@toggle-node-context-picker="onToggleNodeContextPicker"
				/>
			</template>
		</div>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.root {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	background: var(--background--surface);
}

.messages {
	flex: 1;
	min-height: 0;
}

.messagesInner {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
}

.messagesInnerEmpty {
	min-height: 100%;
}

.empty {
	--animation--fade-in-up--duration: var(--duration--base);
	--animation--fade-in-up--translate: var(--spacing--xs);

	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl) var(--spacing--md);
	@include motion.fade-in-up;
	animation-fill-mode: both;
}

.capabilities {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--sm);
	width: min(100%, 16rem);
}

.capabilityList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
	width: 100%;
}

.capability {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
	color: var(--text-color--subtle);
}

.capabilityIcon {
	flex-shrink: 0;
	color: var(--icon-color);
}

.chooser {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	width: min(100%, 22rem);
}

.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--sm);
}

.contextChips {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	max-width: 100%;
}

.contextChip {
	max-width: 100%;
}

.chipWithTooltip {
	cursor: default;

	&:hover :global(.n8n-tag) {
		background-color: var(--tag--color--background--hover);
		border-color: var(--tag--border-color--hover);
	}
}

.contextChipContent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 16rem;
	line-height: var(--line-height--xs);
}

.contextChipText {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.contextChipClose {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	width: var(--spacing--xs);
	height: var(--spacing--xs);
	padding: 0;
	color: inherit;
	cursor: pointer;
	background: none;
	border: 0;
	border-radius: var(--radius--3xs);
}

.chipTooltip {
	display: block;
	max-width: 16rem;
	white-space: pre-line;
	line-height: var(--line-height--md);
}

.actions {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: 0;
	width: 100%;
}

.action {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	margin: 0;
	min-height: var(--height--xl);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: 0;
	border-radius: var(--radius--lg);
	background: none;
	color: var(--text-color);
	cursor: pointer;
	text-align: left;
	font: inherit;

	@media (hover: hover) and (pointer: fine) {
		&:hover:not(:disabled) {
			background: light-dark(var(--color--neutral-100), var(--color--neutral-800));

			.actionArrow {
				visibility: visible;
			}
		}
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: 2px;
	}

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
}

.actionIcon {
	flex-shrink: 0;
	color: var(--icon-color--strong);
}

.actionCopy {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.actionLabel {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	color: var(--text-color);
}

.actionDescription {
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
	color: var(--text-color--subtler);
}

.actionArrow {
	margin-left: auto;
	color: var(--icon-color);
	visibility: hidden;
	flex-shrink: 0;
}

.customAction {
	align-self: flex-start;
	margin-top: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: 0;
	border-radius: var(--radius--lg);
	background: transparent;
	color: var(--text-color--subtle);
	font: inherit;
	font-size: var(--font-size--2xs);
	cursor: pointer;

	@media (hover: hover) and (pointer: fine) {
		&:hover:not(:disabled) {
			background: light-dark(var(--color--neutral-100), var(--color--neutral-800));
			color: var(--text-color);
		}
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: 2px;
	}

	&:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
}

.customBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
}

.input {
	flex-shrink: 0;
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--sm);
	border-top: var(--border);
}
</style>
