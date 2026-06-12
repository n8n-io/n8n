<script setup lang="ts">
import { N8nIcon, N8nLogo, N8nNodeIcon, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import TaskDescriptionParts from '../components/TaskDescriptionParts.vue';
import TaskStatusBadge from '../components/TaskStatusBadge.vue';

import type { TaskCardVariant } from '../assistant/use-assistant-screen';
import { useAssistantScreen } from '../assistant/use-assistant-screen';
import { useTaskDetail } from '../assistant/use-task-detail';
import type { DesktopAssistantTaskCard } from '../../shared/types';

const props = defineProps<{ card: DesktopAssistantTaskCard; variant: TaskCardVariant }>();

const i18n = useI18n();
const { goHome } = useAssistantScreen();

const {
	phase,
	detail,
	editing,
	pickerValues,
	updateFailed,
	hasParams,
	load,
	startEditing,
	setParamValue,
	finishEditing,
} = useTaskDetail(props.card.workflowId);

const backRef = ref<HTMLButtonElement | null>(null);

// Escape mirrors the back action so keyboard users can always retreat. Bound
// to the view root (not window): an open chip dropdown is teleported to the
// body, so its Escape (reka-ui closes it without preventDefault) never
// bubbles through here and can't discard the user's pending edits.
function onEscape(event: KeyboardEvent) {
	if (event.defaultPrevented) return;
	goHome();
}

onMounted(() => {
	backRef.value?.focus();
	void load();
});

/** Emoji icons render their glyph; node icons render via `N8nNodeIcon`, mirroring TaskCard. */
const emojiGlyph = computed(() => (props.card.icon.type === 'emoji' ? props.card.icon.value : ''));
const nodeIcon = computed(() => {
	if (props.card.icon.type !== 'node') return undefined;
	const { iconUrl, iconName } = props.card.icon;
	if (iconUrl) return { type: 'file' as const, src: iconUrl };
	if (iconName) return { type: 'icon' as const, name: iconName };
	return { type: 'unknown' as const };
});

/** Section badge mirrors the task list; ready-to-run cards carry none. */
const badge = computed(() => {
	if (props.variant === 'actionNeeded') {
		return {
			variant: 'actionNeeded' as const,
			label: i18n.baseText('desktopAssistant.status.actionNeeded'),
		};
	}
	if (props.variant === 'upcoming') {
		return props.card.trigger.kind === 'schedule'
			? {
					variant: 'scheduled' as const,
					label: i18n.baseText('desktopAssistant.status.scheduled'),
				}
			: { variant: 'watching' as const, label: i18n.baseText('desktopAssistant.status.watching') };
	}
	return null;
});

/** Action-needed tasks swap the Run CTA for "Connect <first missing service>". */
const connectLabel = computed(() => {
	const first = detail.value?.connectionsNeeded[0];
	if (props.variant !== 'actionNeeded' || !first) return null;
	return i18n.baseText('desktopAssistant.taskDetail.connect', {
		interpolate: { service: first.displayName },
	});
});

// Transient feedback for the footer actions (run/delete), cleared on retry.
const actionError = ref<string | null>(null);
const runState = ref<'idle' | 'running' | 'started'>('idle');

/** How long "Run started" lingers in the footer before fading back to idle. */
const RUN_STARTED_RESET_MS = 4_000;
let runStartedTimer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(runStartedTimer));

async function runNow() {
	actionError.value = null;
	runState.value = 'running';
	const result = await window.electronAPI.runTask(props.card.workflowId);
	if (result.ok) {
		runState.value = 'started';
		clearTimeout(runStartedTimer);
		runStartedTimer = setTimeout(() => {
			if (runState.value === 'started') runState.value = 'idle';
		}, RUN_STARTED_RESET_MS);
		return;
	}
	runState.value = 'idle';
	actionError.value = i18n.baseText('desktopAssistant.taskDetail.runFailed');
}

const deleting = ref(false);

async function deleteTask() {
	actionError.value = null;
	deleting.value = true;
	const result = await window.electronAPI.deleteTask(props.card.workflowId);
	deleting.value = false;
	if (result.ok) {
		goHome();
		return;
	}
	actionError.value = i18n.baseText('desktopAssistant.taskDetail.deleteFailed');
}

function viewInN8n() {
	void window.electronAPI.openWorkflow(props.card.workflowId);
}

function connect() {
	void window.electronAPI.openWorkflowSetup(props.card.workflowId);
}
</script>

<template>
	<div :class="$style.view" @keydown.esc="onEscape">
		<header :class="$style.header">
			<button
				ref="backRef"
				type="button"
				:class="$style.iconButton"
				:aria-label="i18n.baseText('desktopAssistant.taskDetail.backAriaLabel')"
				@click="goHome"
			>
				<N8nIcon icon="arrow-left" :size="18" aria-hidden="true" />
			</button>
			<!-- Emojis read as icons on their own; only node icons (arbitrary SVGs)
			     need the tile's contrast backing. -->
			<span v-if="nodeIcon" :class="$style.tile" aria-hidden="true">
				<N8nNodeIcon
					:type="nodeIcon.type"
					:src="nodeIcon.src"
					:name="nodeIcon.name"
					:node-type-name="card.name"
					:size="16"
				/>
			</span>
			<span v-else :class="$style.emoji" aria-hidden="true">{{ emojiGlyph }}</span>
			<h1 :class="$style.headerTitle">{{ card.name }}</h1>
			<button
				type="button"
				:class="[$style.iconButton, $style.trash]"
				:disabled="deleting"
				:aria-label="i18n.baseText('desktopAssistant.taskDetail.deleteAriaLabel')"
				@click="deleteTask"
			>
				<N8nIcon icon="trash-2" :size="16" aria-hidden="true" />
			</button>
		</header>

		<div :class="$style.content">
			<!-- Badge + run location render instantly from the card; the time-saved
			     estimate arrives with the fetched detail. -->
			<div :class="$style.meta">
				<TaskStatusBadge v-if="badge" :variant="badge.variant" :label="badge.label" />
				<span :class="$style.metaItem">
					<N8nIcon :icon="card.runsLocally ? 'monitor' : 'cloud'" :size="12" aria-hidden="true" />
					{{
						i18n.baseText(
							card.runsLocally
								? 'desktopAssistant.taskDetail.runsOnMac'
								: 'desktopAssistant.taskDetail.runsInCloud',
						)
					}}
				</span>
				<span v-if="detail?.timeSavedMin" :class="[$style.metaItem, $style.metaSaves]">
					<N8nIcon icon="clock" :size="12" aria-hidden="true" />
					{{
						i18n.baseText('desktopAssistant.taskDetail.savesTime', {
							interpolate: { minutes: detail.timeSavedMin },
						})
					}}
				</span>
			</div>

			<div v-if="phase === 'loading'" :class="$style.state" role="status" aria-live="polite">
				<N8nSpinner aria-hidden="true" />
				<N8nText color="text-light" size="small">{{
					i18n.baseText('desktopAssistant.taskDetail.loading')
				}}</N8nText>
			</div>

			<div v-else-if="phase === 'error'" :class="$style.state" role="alert">
				<N8nText color="text-light" size="small">{{
					i18n.baseText('desktopAssistant.taskDetail.error')
				}}</N8nText>
				<button type="button" :class="[$style.btn, $style.btnSubtle]" @click="load">
					{{ i18n.baseText('desktopAssistant.taskDetail.retry') }}
				</button>
			</div>

			<div v-else-if="phase === 'updating'" :class="$style.state" role="status" aria-live="polite">
				<N8nSpinner aria-hidden="true" />
				<N8nText color="text-light" size="small">{{
					i18n.baseText('desktopAssistant.taskDetail.updating')
				}}</N8nText>
			</div>

			<template v-else-if="detail">
				<!-- The description sentence: params render emphasized in read mode and
				     as inline dropdown chips in edit mode. -->
				<p :class="$style.sentence">
					<TaskDescriptionParts
						:parts="detail.parts"
						:editing="editing"
						:values="pickerValues"
						@change="setParamValue"
					/>
				</p>

				<p v-if="updateFailed" :class="$style.inlineError" role="alert">
					{{ i18n.baseText('desktopAssistant.taskDetail.updateFailed') }}
				</p>
			</template>
		</div>

		<div :class="$style.footer">
			<button type="button" :class="$style.viewInN8n" @click="viewInN8n">
				<N8nLogo size="small" :collapsed="true" />
				{{ i18n.baseText('desktopAssistant.taskDetail.viewInN8n') }}
			</button>
			<span :class="$style.spacer" />
			<span v-if="actionError" :class="$style.inlineError" role="alert">{{ actionError }}</span>
			<span v-else-if="runState === 'started'" :class="$style.runStarted" role="status">{{
				i18n.baseText('desktopAssistant.taskDetail.runStarted')
			}}</span>
			<button
				v-if="phase === 'ready' && hasParams && !editing"
				type="button"
				:class="[$style.btn, $style.btnSubtle]"
				@click="startEditing"
			>
				{{ i18n.baseText('desktopAssistant.taskDetail.edit') }}
			</button>
			<button
				v-else-if="phase === 'ready' && editing"
				type="button"
				:class="[$style.btn, $style.btnSubtle]"
				@click="finishEditing"
			>
				{{ i18n.baseText('desktopAssistant.taskDetail.done') }}
			</button>
			<button
				v-if="connectLabel"
				type="button"
				:class="[$style.btn, $style.btnSolid]"
				@click="connect"
			>
				{{ connectLabel }}
			</button>
			<button
				v-else
				type="button"
				:class="[$style.btn, $style.btnSolid]"
				:disabled="runState === 'running' || phase === 'updating'"
				@click="runNow"
			>
				{{ i18n.baseText('desktopAssistant.taskDetail.runNow') }}
			</button>
		</div>
	</div>
</template>

<style module>
.view {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 14px var(--spacing--sm);
	background: var(--da-bg);
	border-bottom: 1px solid var(--da-border);
}

.iconButton {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 30px;
	height: 30px;
	color: var(--da-subtler);
	cursor: pointer;
	background: none;
	border: none;
	border-radius: 7px;
	transition:
		background 0.12s,
		color 0.12s;
}

.iconButton:hover {
	color: var(--da-text);
	background: var(--da-surface-2);
}

.iconButton:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.iconButton:disabled {
	cursor: default;
	opacity: 0.5;
}

.header .iconButton:first-child {
	margin-left: -6px;
}

.tile {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 26px;
	height: 26px;
	font-size: 13px;
	line-height: 1;
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
	border-radius: var(--radius--xs);
}

.emoji {
	flex-shrink: 0;
	font-size: 15px;
	line-height: 1;
}

.headerTitle {
	flex: 1;
	min-width: 0;
	margin: 0;
	overflow: hidden;
	font-size: 14px;
	font-weight: 600;
	color: var(--da-text);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.trash:hover {
	color: var(--da-accent);
}

.content {
	flex: 1;
	padding: var(--spacing--sm);
	overflow-y: auto;
}

.meta {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--sm);
}

.metaItem {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 12px;
	color: var(--da-subtlest);
}

.metaSaves {
	color: var(--da-green);
}

/* Prose sits a step dimmer than the params so the editable values carry the sentence. */
.sentence {
	margin: 0;
	font-size: 20px;
	font-weight: 300;
	line-height: 1.65;
	color: var(--da-subtler);
}

.state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl) var(--spacing--md);
}

.inlineError {
	margin: var(--spacing--2xs) 0 0;
	font-size: 12px;
	color: var(--da-accent);
}

.runStarted {
	font-size: 12px;
	color: var(--da-green);
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	border-top: 1px solid var(--da-border);
}

.viewInN8n {
	display: inline-flex;
	align-items: center;
	gap: 7px;
	padding: 9px 0;
	font: inherit;
	font-size: 12px;
	color: var(--da-subtler);
	cursor: pointer;
	background: none;
	border: none;
}

.viewInN8n:hover {
	color: var(--da-text);
}

.viewInN8n:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.spacer {
	flex: 1;
}

.btn {
	padding: 9px 14px;
	font: inherit;
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
	cursor: pointer;
	border-radius: var(--da-radius-sm);
}

.btn:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.btn:disabled {
	cursor: default;
	opacity: 0.6;
}

.btnSolid {
	color: #fff;
	background: var(--da-accent);
	border: none;
}

.btnSolid:hover:not(:disabled) {
	background: var(--da-accent-press);
}

.btnSubtle {
	color: var(--da-text);
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
}

.btnSubtle:hover {
	background: var(--da-surface);
	border-color: var(--da-border-strong);
}
</style>
