<script setup lang="ts">
import {
	N8nAiActivityStepButton,
	N8nAiActivityStepChevron,
	N8nAnimatedCollapsibleContent,
	N8nButton,
	N8nIcon,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, ref, watch } from 'vue';

import type {
	AgentTestRunCommitResponse,
	AgentTestRunCommitResult,
} from '../../composables/useAgentApi';
import AgentHeldActionIcon from './AgentHeldActionIcon.vue';
import {
	actionObject,
	actionOutcome,
	formatCommitTime,
	formatPreviewEntries,
	type AgentHeldAction,
} from './heldActions';

const props = withDefaults(
	defineProps<{
		actions: AgentHeldAction[];
		committed?: AgentTestRunCommitResponse;
		busy?: boolean;
		/** True while the reply can still get more held actions. The run must wait for all of them. */
		runDisabled?: boolean;
	}>(),
	{
		committed: undefined,
		busy: false,
		runDisabled: false,
	},
);

const emit = defineEmits<{
	'run-actions': [actions: AgentHeldAction[]];
}>();

const i18n = useI18n();
const expanded = ref(Boolean(props.committed));
const expandedActionIds = ref<Record<string, boolean>>({});

/** One action per app, for the icons in the header. */
const appIconActions = computed<AgentHeldAction[]>(() => {
	const seen = new Set<string>();
	return props.actions.filter((action) => {
		const key = action.nodeType ?? `${action.appName}:${action.icon}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
});

// The result of a run shows without another click.
watch(
	() => props.committed,
	(committed) => {
		if (committed) expanded.value = true;
	},
);

const resultByActionId = computed(() => {
	const map = new Map<string, AgentTestRunCommitResult>();
	for (const result of props.committed?.results ?? []) {
		map.set(result.actionId, result);
	}
	return map;
});

const committedSucceededCount = computed(() => {
	if (!props.committed) return 0;
	return props.committed.results.filter((item) => item.status !== 'failed').length;
});

const committedTime = computed(() =>
	props.committed ? formatCommitTime(props.committed.committedAt) : '',
);

const onHoldLabel = computed(() =>
	i18n.baseText('agents.testRun.holdReplay.onHold', {
		adjustToNumber: props.actions.length,
		interpolate: { count: props.actions.length },
	}),
);

const runButtonLabel = computed(() =>
	i18n.baseText('agents.testRun.holdReplay.runActions', {
		adjustToNumber: props.actions.length,
		interpolate: { count: props.actions.length },
	}),
);

const doneCountText = computed(() =>
	i18n.baseText('agents.testRun.holdReplay.doneCount', {
		adjustToNumber: committedSucceededCount.value,
		interpolate: { count: committedSucceededCount.value },
	}),
);

/** One row per action: `Gmail: email` while held, `Gmail: email sent` once it ran. */
function actionRowLabel(action: AgentHeldAction): string {
	const interpolate = { app: action.appName, object: actionObject(action) };
	const status = actionStatus(action.actionId);
	if (status !== 'done' && status !== 'already_committed') {
		return i18n.baseText('agents.testRun.holdReplay.actionRow', { interpolate });
	}
	return actionOutcome(action) === 'sent'
		? i18n.baseText('agents.testRun.holdReplay.actionRowSent', { interpolate })
		: i18n.baseText('agents.testRun.holdReplay.actionRowSaved', { interpolate });
}

const doneSummaryText = computed(() =>
	i18n.baseText('agents.testRun.holdReplay.doneSummary', {
		interpolate: { time: committedTime.value },
	}),
);

function setActionPreviewOpen(actionId: string, open: boolean) {
	expandedActionIds.value = { ...expandedActionIds.value, [actionId]: open };
}

function actionStatus(actionId: string) {
	return resultByActionId.value.get(actionId)?.status;
}

function onRunClick() {
	if (props.busy || props.runDisabled || props.committed) return;
	emit('run-actions', props.actions);
}
</script>

<template>
	<div
		v-if="props.actions.length > 0"
		:class="$style.tray"
		data-testid="agent-held-actions-tray"
		:data-state="props.committed ? 'committed' : 'on-hold'"
	>
		<CollapsibleRoot v-model:open="expanded">
			<CollapsibleTrigger as-child>
				<N8nAiActivityStepButton
					size="medium"
					:class="[$style.trigger, props.committed && $style.triggerDone]"
					data-testid="agent-held-actions-toggle"
				>
					<template v-if="committedSucceededCount > 0" #prefix>
						<N8nIcon icon="check" size="small" :class="$style.doneIcon" aria-hidden="true" />
					</template>
					<span
						aria-live="polite"
						aria-atomic="true"
						:data-testid="
							props.committed ? 'agent-held-actions-committed-banner' : 'agent-held-actions-count'
						"
					>
						{{ props.committed ? doneCountText : onHoldLabel }}
					</span>
					<template #suffix>
						<span :class="$style.appIcons">
							<AgentHeldActionIcon
								v-for="action in appIconActions"
								:key="action.actionId"
								:action="action"
								:size="14"
							/>
						</span>
						<N8nAiActivityStepChevron :open="expanded" />
					</template>
				</N8nAiActivityStepButton>
			</CollapsibleTrigger>

			<N8nAnimatedCollapsibleContent>
				<div :class="$style.body" data-testid="agent-held-actions-body">
					<p
						:class="$style.note"
						:data-testid="
							props.committed ? 'agent-held-actions-done-summary' : 'agent-held-actions-note'
						"
					>
						{{
							props.committed
								? doneSummaryText
								: i18n.baseText('agents.testRun.holdReplay.nothingSent')
						}}
					</p>

					<ul :class="$style.list">
						<li
							v-for="action in props.actions"
							:key="action.actionId"
							:class="$style.item"
							data-testid="agent-held-action-preview"
						>
							<CollapsibleRoot
								:open="Boolean(expandedActionIds[action.actionId])"
								@update:open="setActionPreviewOpen(action.actionId, $event)"
							>
								<CollapsibleTrigger as-child>
									<N8nAiActivityStepButton
										size="small"
										full-width
										:class="$style.itemTrigger"
										data-testid="agent-held-action-preview-toggle"
									>
										<template #prefix>
											<AgentHeldActionIcon :action="action" :size="16" />
										</template>
										<span :class="$style.itemLabel">{{ actionRowLabel(action) }}</span>
										<template #suffix>
											<span
												v-if="actionStatus(action.actionId) === 'failed'"
												:class="$style.failedTag"
												data-testid="agent-held-action-failed"
											>
												{{ i18n.baseText('agents.testRun.holdReplay.actionFailed') }}
											</span>
											<N8nIcon
												v-else-if="actionStatus(action.actionId)"
												icon="check"
												size="xsmall"
												:class="$style.doneIcon"
												aria-hidden="true"
											/>
											<N8nAiActivityStepChevron
												:open="Boolean(expandedActionIds[action.actionId])"
											/>
										</template>
									</N8nAiActivityStepButton>
								</CollapsibleTrigger>

								<N8nAnimatedCollapsibleContent>
									<div :class="$style.preview" data-testid="agent-held-action-preview-body">
										<p
											v-if="resultByActionId.get(action.actionId)?.error"
											:class="$style.errorText"
										>
											{{ resultByActionId.get(action.actionId)?.error }}
										</p>
										<dl
											v-if="formatPreviewEntries(action.input).length > 0"
											:class="$style.previewEntries"
										>
											<template
												v-for="entry in formatPreviewEntries(action.input)"
												:key="entry.key"
											>
												<dt :class="$style.previewKey">{{ entry.key }}</dt>
												<dd :class="$style.previewValue">{{ entry.value }}</dd>
											</template>
										</dl>
									</div>
								</N8nAnimatedCollapsibleContent>
							</CollapsibleRoot>
						</li>
					</ul>

					<div v-if="!props.committed" :class="$style.footer">
						<N8nTooltip
							:content="i18n.baseText('agents.testRun.holdReplay.runActionsTooltip')"
							placement="top"
						>
							<N8nButton
								variant="outline"
								size="small"
								icon="play"
								:loading="props.busy"
								:disabled="props.runDisabled"
								data-testid="agent-held-actions-run-btn"
								@click="onRunClick"
							>
								{{ runButtonLabel }}
							</N8nButton>
						</N8nTooltip>
					</div>
				</div>
			</N8nAnimatedCollapsibleContent>
		</CollapsibleRoot>
	</div>
</template>

<style module lang="scss">
/* Reads as one more step of the reply, like the tool calls line above it. */
.tray {
	display: flex;
	flex-direction: column;
	min-width: 0;
	margin-top: var(--spacing--2xs);
}

.trigger {
	gap: var(--spacing--3xs);
	max-width: 100%;
}

.triggerDone {
	--ai-activity-step--color: var(--text-color--subtle);
}

.doneIcon {
	flex-shrink: 0;
	color: var(--color--success);
}

.appIcons {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-inline: var(--spacing--4xs) var(--spacing--5xs);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
}

.note {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: 0;
	padding: 0;
	list-style: none;
	min-width: 0;
}

.item {
	min-width: 0;
}

.itemTrigger {
	--ai-activity-step--padding: var(--spacing--4xs) var(--spacing--2xs);
	--ai-activity-step--height: auto;
	--button--color--background-hover: var(--background--hover);
	/* An open row stays quiet. The button would keep it filled. */
	--button--color--background-active: transparent;

	gap: var(--spacing--2xs);
	/* The hover fill lines its text up with the note above. */
	margin-inline-start: calc(-1 * var(--spacing--2xs));
	width: calc(100% + var(--spacing--2xs));

	&.itemTrigger:hover {
		background-color: var(--background--hover);
	}
}

.itemLabel {
	color: var(--text-color);
	font-weight: var(--font-weight--medium);
}

.failedTag {
	flex-shrink: 0;
	color: var(--text-color--danger);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
}

.preview {
	margin: var(--spacing--4xs) 0 var(--spacing--2xs) calc(var(--spacing--md) + var(--spacing--2xs));
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius);
	background: var(--background--subtle);
}

.errorText {
	margin: 0 0 var(--spacing--3xs);
	color: var(--text-color--danger);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
}

.previewEntries {
	display: grid;
	grid-template-columns: max-content minmax(0, 1fr);
	gap: var(--spacing--4xs) var(--spacing--xs);
	margin: 0;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
}

.previewKey {
	color: var(--text-color--subtle);
}

.previewValue {
	margin: 0;
	color: var(--text-color);
	overflow-wrap: anywhere;
	white-space: pre-wrap;
}

.footer {
	display: flex;
	padding-top: var(--spacing--4xs);
}
</style>
