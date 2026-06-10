<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import MiniSpinner from '../components/MiniSpinner.vue';

import { connectDraftTask } from '../assistant/draft-tasks';
import { useAssistantScreen } from '../assistant/use-assistant-screen';

const props = defineProps<{
	taskId: string;
	title: string;
	icon: string;
	requiredConnections: string[];
}>();

const i18n = useI18n();
const { goHome } = useAssistantScreen();

type Phase = 'building' | 'waiting' | 'finishing' | 'done';

const phase = ref<Phase>('building');
const label = ref(i18n.baseText('desktopAssistant.setup.understanding'));
const connecting = ref(false);
// Connections still outstanding; consumed one at a time by the connect card.
const pendingConnections = ref<string[]>([...props.requiredConnections]);

const backRef = ref<HTMLButtonElement | null>(null);

// Escape mirrors the back action so keyboard users can always retreat.
function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') goHome();
}

const timers: number[] = [];
function later(fn: () => void, ms: number) {
	timers.push(window.setTimeout(fn, ms));
}

const nextConnection = computed(() => pendingConnections.value[0] ?? null);
const isWaiting = computed(() => phase.value === 'waiting' && !connecting.value);

const STATUS_STEPS = [
	'desktopAssistant.setup.understanding',
	'desktopAssistant.setup.addingSteps',
	'desktopAssistant.setup.settingSchedule',
] as const;

const FINISH_MS = 1200;
const DONE_MS = 800;
const STEP_MS = 1100;
const START_MS = 600;
const CONNECT_MS = 1400;

function finish() {
	phase.value = 'finishing';
	label.value = i18n.baseText('desktopAssistant.setup.finishing');
	later(() => {
		phase.value = 'done';
		label.value = i18n.baseText('desktopAssistant.setup.allSet');
		// Prototype navigates to task detail; the desktop app returns home.
		later(goHome, DONE_MS);
	}, FINISH_MS);
}

function runStatusSteps() {
	let step = 0;
	const advance = () => {
		if (step < STATUS_STEPS.length) {
			label.value = i18n.baseText(STATUS_STEPS[step]);
			step += 1;
			later(advance, STEP_MS);
			return;
		}
		if (pendingConnections.value.length) {
			phase.value = 'waiting';
			label.value = i18n.baseText('desktopAssistant.setup.waitingForYou');
		} else {
			finish();
		}
	};
	later(advance, START_MS);
}

function connect() {
	const service = nextConnection.value;
	if (!service) return;
	connecting.value = true;
	label.value = i18n.baseText('desktopAssistant.setup.connecting', {
		interpolate: { service },
	});
	later(() => {
		pendingConnections.value = pendingConnections.value.slice(1);
		connecting.value = false;
		// Re-bucket the just-created task so it leaves "Action needed" once connected.
		connectDraftTask(props.taskId, service);
		if (pendingConnections.value.length) {
			label.value = i18n.baseText('desktopAssistant.setup.waitingForYou');
		} else {
			finish();
		}
	}, CONNECT_MS);
}

onMounted(() => {
	// Focus the back button so keyboard users land on this screen rather than on
	// a control from the previous one that no longer exists.
	backRef.value?.focus();
	window.addEventListener('keydown', onKeydown);
	runStatusSteps();
});
onBeforeUnmount(() => {
	timers.forEach(window.clearTimeout);
	window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
	<div :class="$style.view">
		<header :class="$style.header">
			<button
				ref="backRef"
				type="button"
				:class="$style.back"
				:aria-label="i18n.baseText('desktopAssistant.setup.back')"
				@click="goHome"
			>
				<N8nIcon icon="arrow-left" :size="18" aria-hidden="true" />
			</button>
			<span :class="$style.headerIcon" aria-hidden="true">{{ props.icon }}</span>
			<h1 :class="$style.headerTitle">
				{{ i18n.baseText('desktopAssistant.setup.title', { interpolate: { title: props.title } }) }}
			</h1>
		</header>

		<div :class="$style.body">
			<div
				:class="[$style.statusPill, { [$style.waiting]: isWaiting }]"
				role="status"
				aria-live="polite"
			>
				<N8nIcon
					v-if="phase === 'done'"
					icon="check"
					:size="13"
					:class="$style.doneCheck"
					aria-hidden="true"
				/>
				<N8nIcon v-else-if="isWaiting" icon="pause" :size="13" aria-hidden="true" />
				<MiniSpinner v-else aria-hidden="true" />
				<span>{{ label }}</span>
			</div>

			<div v-if="phase === 'waiting' && nextConnection" :class="$style.connectCard">
				<div :class="$style.connectRow">
					<span :class="$style.plugBadge" aria-hidden="true">
						<N8nIcon icon="plug" :size="16" />
					</span>
					<div :class="$style.connectText">
						{{
							i18n.baseText('desktopAssistant.setup.connectPrompt', {
								interpolate: { service: nextConnection },
							})
						}}
					</div>
				</div>
				<div :class="$style.connectAction">
					<button
						type="button"
						:class="[$style.btn, $style.btnSolid]"
						:disabled="connecting"
						@click="connect"
					>
						{{
							i18n.baseText('desktopAssistant.setup.connectButton', {
								interpolate: { service: nextConnection },
							})
						}}
					</button>
				</div>
			</div>
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

.back {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	margin-left: -6px;
	color: var(--da-subtler);
	cursor: pointer;
	background: none;
	border: none;
	border-radius: 7px;
	transition:
		background 0.12s,
		color 0.12s;
}

.back:hover {
	color: var(--da-text);
	background: var(--da-surface-2);
}

.back:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.headerIcon {
	font-size: 16px;
	line-height: 1;
}

.headerTitle {
	margin: 0;
	overflow: hidden;
	font-size: 14px;
	font-weight: 600;
	color: var(--da-text);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.body {
	position: relative;
	flex: 1;
	overflow: hidden;
	background-color: var(--da-bg);
	background-image: radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px);
	background-size: 16px 16px;
}

.statusPill {
	position: absolute;
	top: var(--spacing--xs);
	right: var(--spacing--xs);
	display: inline-flex;
	align-items: center;
	gap: 7px;
	padding: var(--spacing--3xs) 11px;
	font-size: 12px;
	font-weight: 500;
	color: var(--da-subtler);
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
	border-radius: var(--radius--full);
	box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
}

.waiting {
	color: var(--da-amber);
	border-color: rgba(245, 184, 75, 0.35);
}

.doneCheck {
	color: var(--da-green);
}

.connectCard {
	position: absolute;
	right: var(--spacing--xs);
	bottom: var(--spacing--xs);
	left: var(--spacing--xs);
	padding: var(--spacing--xs);
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
	border-radius: var(--da-radius);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

.connectRow {
	display: flex;
	align-items: center;
	gap: 11px;
}

.plugBadge {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	color: var(--da-subtler);
	background: var(--da-surface);
	border: 1px solid var(--da-border);
	border-radius: 50%;
}

.connectText {
	font-size: 13px;
	line-height: 1.4;
	color: var(--da-text);
}

.connectAction {
	margin-top: 10px;
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

.btnSolid {
	color: #fff;
	background: var(--da-accent);
	border: none;
}

.btnSolid:hover {
	background: var(--da-accent-press);
}

.btnSolid:disabled {
	cursor: default;
	opacity: 0.5;
}
</style>
