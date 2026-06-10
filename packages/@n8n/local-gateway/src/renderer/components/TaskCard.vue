<script setup lang="ts">
import { N8nIcon, N8nNodeIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import TaskStatusBadge from './TaskStatusBadge.vue';

import type { DesktopAssistantTaskCard } from '../../shared/types';

const props = defineProps<{
	card: DesktopAssistantTaskCard;
	variant: 'actionNeeded' | 'upcoming' | 'readyToRun';
}>();

const emit = defineEmits<{ open: [workflowId: string]; run: [workflowId: string] }>();

const i18n = useI18n();

/** Emoji icons render their glyph; node icons render via `N8nNodeIcon` below. */
const emojiGlyph = computed(() => (props.card.icon.type === 'emoji' ? props.card.icon.value : ''));

/**
 * Map a node-typed icon onto `N8nNodeIcon` props: a file icon renders as an image,
 * a named (built-in/font-awesome) icon renders from the icon set, and anything
 * unresolved falls back to the name's initial.
 */
const nodeIcon = computed(() => {
	if (props.card.icon.type !== 'node') return undefined;
	const { iconUrl, iconName } = props.card.icon;
	if (iconUrl) return { type: 'file' as const, src: iconUrl };
	if (iconName) return { type: 'icon' as const, name: iconName };
	return { type: 'unknown' as const };
});

/**
 * Monochrome (`node:`/`fa:`) icons are tinted to the section accent so they match
 * their tile — not the node's own palette color. Full-color file logos ignore
 * `color`, so passing this is harmless for them.
 */
const iconColor = computed(
	() =>
		({
			actionNeeded: 'var(--da-amber)',
			upcoming: 'var(--da-blue)',
			readyToRun: 'var(--da-green)',
		})[props.variant],
);

const tileClass = computed(
	() =>
		({
			actionNeeded: 'tileActionNeeded',
			upcoming: 'tileUpcoming',
			readyToRun: 'tileReadyToRun',
		})[props.variant],
);

/** Local tasks show a monitor; cloud-run tasks show a cloud. Action-needed cards show neither. */
const leadingIcon = computed<'monitor' | 'cloud' | null>(() => {
	if (props.variant === 'actionNeeded') return null;
	return props.card.runsLocally ? 'monitor' : 'cloud';
});

const subtitle = computed(() => {
	if (props.variant === 'readyToRun' && props.card.lastExecution) {
		return i18n.baseText('desktopAssistant.task.lastRun', {
			interpolate: { date: formatDate(props.card.lastExecution.startedAt) },
		});
	}
	return props.card.description;
});

const upcomingBadge = computed(() =>
	props.card.trigger.kind === 'schedule'
		? { variant: 'scheduled' as const, label: i18n.baseText('desktopAssistant.status.scheduled') }
		: { variant: 'watching' as const, label: i18n.baseText('desktopAssistant.status.watching') },
);

/** Zero-padded DD/MM/YYYY, matching the assistant's date presentation. */
function formatDate(iso: string): string {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function open() {
	emit('open', props.card.workflowId);
}
</script>

<template>
	<div
		:class="$style.card"
		role="button"
		tabindex="0"
		@click="open"
		@keydown.enter="open"
		@keydown.space.prevent="open"
	>
		<span :class="[$style.tile, $style[tileClass]]">
			<N8nNodeIcon
				v-if="nodeIcon"
				:type="nodeIcon.type"
				:src="nodeIcon.src"
				:name="nodeIcon.name"
				:color="iconColor"
				:node-type-name="card.name"
				:size="20"
			/>
			<template v-else>{{ emojiGlyph }}</template>
		</span>

		<span :class="$style.body">
			<N8nText bold :class="$style.title">{{ card.name }}</N8nText>
			<span
				v-if="subtitle"
				:class="[$style.subtitle, { [$style.actionNeededText]: variant === 'actionNeeded' }]"
			>
				<N8nIcon v-if="leadingIcon" :icon="leadingIcon" size="small" />
				<N8nText size="small">{{ subtitle }}</N8nText>
			</span>
		</span>

		<span :class="$style.trailing">
			<TaskStatusBadge
				v-if="variant === 'actionNeeded'"
				variant="actionNeeded"
				:label="i18n.baseText('desktopAssistant.status.actionNeeded')"
			/>
			<TaskStatusBadge
				v-else-if="variant === 'upcoming'"
				:variant="upcomingBadge.variant"
				:label="upcomingBadge.label"
			/>
			<button
				v-else
				type="button"
				:class="$style.play"
				:aria-label="
					i18n.baseText('desktopAssistant.task.runAriaLabel', {
						interpolate: { name: card.name },
					})
				"
				@click.stop="emit('run', card.workflowId)"
			>
				<N8nIcon icon="play" size="medium" />
			</button>
		</span>
	</div>
</template>

<style module>
.card {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	padding: 11px 6px;
	border: none;
	background: transparent;
	text-align: left;
	cursor: pointer;
	font: inherit;
	color: var(--da-text);
	border-radius: var(--da-radius-sm);
	transition: background-color 0.12s;
}

.card:hover {
	background: var(--da-surface-2);
}

.tile {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 34px;
	height: 34px;
	border-radius: 8px;
	border: 1px solid var(--da-border);
	font-size: 15px;
	line-height: 1;
}

/* Per-section tile tint: a low-alpha wash of the section accent over the surface. */
.tileActionNeeded {
	background: rgba(245, 184, 75, 0.14);
	color: var(--da-amber);
}

.tileUpcoming {
	background: rgba(122, 162, 255, 0.16);
	color: var(--da-blue);
}

.tileReadyToRun {
	background: rgba(63, 207, 142, 0.14);
	color: var(--da-green);
}

.body {
	display: flex;
	flex-direction: column;
	gap: 1px;
	flex: 1;
	min-width: 0;
}

.title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--da-text);
}

.subtitle {
	display: flex;
	align-items: center;
	gap: 5px;
	min-width: 0;
	color: var(--da-subtler);
}

/* Action-needed subtitle (and its leading icon) take the amber accent. */
.actionNeededText {
	color: var(--da-amber);
}

.trailing {
	display: flex;
	align-items: center;
	gap: 2px;
	flex-shrink: 0;
}

/* Run button: dim at rest, coral on row hover (matches the reference `.row-act.run`). */
.play {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	border: none;
	border-radius: 7px;
	background: transparent;
	cursor: pointer;
	color: var(--da-subtlest);
	opacity: 0.55;
	transition:
		opacity 0.12s,
		color 0.12s;
}

.card:hover .play {
	opacity: 1;
	color: var(--da-accent);
}
</style>
