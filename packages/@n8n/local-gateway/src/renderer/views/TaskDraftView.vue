<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';

import InlineChipPicker from '../components/InlineChipPicker.vue';
import MinutesChip from '../components/MinutesChip.vue';

import { usePendingTasks } from '../assistant/use-pending-tasks';
import { useAssistantScreen } from '../assistant/use-assistant-screen';
import type { DesktopAssistantDescriptionPart, DesktopAssistantTaskPlan } from '../../shared/types';

const props = defineProps<{ threadId: string; plan: DesktopAssistantTaskPlan }>();

const i18n = useI18n();
const { goHome } = useAssistantScreen();
const pendingTasks = usePendingTasks();

const titleRef = ref<HTMLElement | null>(null);

// Escape mirrors the Cancel action so keyboard users can always retreat. The
// listener is bound to the view root (not window): the minutes chip and the
// option pickers handle (and `.stop`/teleport away) their own Escape, so this
// only fires for "plain" Escape presses on the screen itself.
function onEscape(event: KeyboardEvent) {
	if (event.defaultPrevented) return;
	goHome();
}

onMounted(() => {
	// This screen has no back button, so focus its heading on mount — otherwise
	// keyboard users are stranded on a control from the previous screen.
	titleRef.value?.focus();
});

const DEFAULT_TIME_SAVED_MIN = 10;
const DEFAULT_ICON = '✨';

const icon = computed(() => props.plan.icon ?? DEFAULT_ICON);

// Editable copies: one value per param part (keyed by its server-assigned id),
// plus the minutes estimate.
const pickerValues = ref<Record<string, string>>(
	Object.fromEntries(
		props.plan.parts.flatMap((part) => (part.kind === 'param' ? [[part.id, part.value]] : [])),
	),
);
const minutes = ref(props.plan.estimatedMinutesSaved ?? DEFAULT_TIME_SAVED_MIN);

/** The plan's parts with the user's picked values baked in. */
function buildConfiguredParts(): DesktopAssistantDescriptionPart[] {
	return props.plan.parts.map((part) =>
		part.kind === 'param' ? { ...part, value: pickerValues.value[part.id] ?? part.value } : part,
	);
}

function setItUp() {
	// Promote the thread with the configured plan; the pending-card flow on the
	// Tasks list takes over from here (building → saved / failed).
	pendingTasks.promote(props.threadId, props.plan.title, props.plan.icon, {
		configuredParts: buildConfiguredParts(),
		estimatedMinutesSaved: minutes.value,
	});
	goHome();
}
</script>

<template>
	<div :class="$style.view" @keydown.esc="onEscape">
		<div :class="$style.content">
			<div :class="$style.titleRow">
				<span :class="$style.icon" aria-hidden="true">{{ icon }}</span>
				<h1
					ref="titleRef"
					tabindex="-1"
					:class="$style.title"
					:aria-label="
						i18n.baseText('desktopAssistant.draft.headingAriaLabel', {
							interpolate: { title: props.plan.title },
						})
					"
				>
					{{ props.plan.title }}
				</h1>
			</div>

			<p :class="$style.sentence">
				<template v-for="(part, index) in props.plan.parts" :key="index">
					<span v-if="part.kind === 'text'">{{ part.text }}</span>
					<InlineChipPicker
						v-else
						:value="pickerValues[part.id]"
						:options="part.options"
						@change="pickerValues[part.id] = $event"
					/>
				</template>
			</p>

			<div :class="$style.meta">
				<span :class="[$style.metaRow, $style.savesRow]">
					<N8nIcon icon="clock" :size="14" aria-hidden="true" />
					{{ i18n.baseText('desktopAssistant.draft.savesBefore') }}
					<MinutesChip :minutes="minutes" @change="minutes = $event" />
					{{ i18n.baseText('desktopAssistant.draft.savesAfter') }}
				</span>
				<span :class="[$style.metaRow, $style.locationRow]">
					<N8nIcon icon="cloud" :size="14" aria-hidden="true" />
					{{ i18n.baseText('desktopAssistant.draft.runsInCloud') }}
				</span>
			</div>
		</div>

		<div :class="$style.footer">
			<button type="button" :class="[$style.btn, $style.btnGhost]" @click="goHome">
				{{ i18n.baseText('desktopAssistant.draft.cancel') }}
			</button>
			<button type="button" :class="[$style.btn, $style.btnSolid]" @click="setItUp">
				{{ i18n.baseText('desktopAssistant.draft.setItUp') }}
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

.content {
	flex: 1;
	padding: var(--spacing--sm);
	overflow-y: auto;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: 10px;
}

.icon {
	font-size: 24px;
	line-height: 1;
}

.title {
	margin: 0;
	font-size: 15px;
	font-weight: 600;
	color: var(--da-text);
}

/* The heading is the screen's focus-landing target, not an interactive control,
   so it takes focus programmatically without a visible ring. */
.title:focus {
	outline: none;
}

.sentence {
	margin-top: var(--spacing--sm);
	font-size: 20px;
	font-weight: 300;
	line-height: 1.65;
	color: var(--da-text);
}

.meta {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
}

.metaRow {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: 12px;
}

.savesRow {
	color: var(--da-green);
}

.locationRow {
	color: var(--da-subtlest);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs);
	border-top: 1px solid var(--da-border);
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

.btnSolid:active {
	transform: scale(0.98);
}

.btnGhost {
	color: var(--da-subtler);
	background: none;
	border: none;
}

.btnGhost:hover {
	color: var(--da-text);
	background: var(--da-surface-2);
}
</style>
