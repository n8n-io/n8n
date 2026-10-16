<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SkillUsage, SkillVersionSummary } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nLoading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import TimeAgo from '@/app/components/TimeAgo.vue';

import { groupSkillTimeline, skillUserName } from './skillVersionDiff.utils';

type AgentChip = {
	key: string;
	label: string;
	variant: 'success' | 'warning' | 'info';
	/** A draft chip whose published agent runs the same version. */
	live?: boolean;
};

const props = defineProps<{
	/** Newest first, as the API lists them. */
	versions: SkillVersionSummary[];
	latestVersion: number;
	usedBy?: SkillUsage | null;
	selectedVersion?: number | null;
	loading?: boolean;
}>();

const emit = defineEmits<{
	select: [version: number];
	compare: [version: number];
	close: [];
}>();

const i18n = useI18n();
const expandedGroups = ref(new Set<string>());

/**
 * The agents on each version: drafts that follow the latest or are pinned, and live agents.
 * One chip for each agent and version: when the draft and the live agent use the same
 * version, the draft chip gets a live marker.
 */
const chipsByVersion = computed(() => {
	const chips = new Map<number, AgentChip[]>();
	const add = (version: number, chip: AgentChip) => {
		chips.set(version, [...(chips.get(version) ?? []), chip]);
	};
	const liveVersions = new Map<string, number>();
	for (const pin of props.usedBy?.pins ?? []) {
		if (pin.version !== null) liveVersions.set(pin.agentId, pin.version);
	}
	const merged = new Set<string>();
	for (const draft of props.usedBy?.drafts ?? []) {
		const live = liveVersions.get(draft.agentId) === draft.version;
		if (live) merged.add(draft.agentId);
		add(
			draft.version,
			draft.pinned
				? {
						key: `draft:${draft.agentId}`,
						label: i18n.baseText('settings.context.skills.versions.timeline.agent.pinned', {
							interpolate: { name: draft.agentName },
						}),
						variant: 'warning',
						live,
					}
				: { key: `draft:${draft.agentId}`, label: draft.agentName, variant: 'success', live },
		);
	}
	for (const pin of props.usedBy?.pins ?? []) {
		if (pin.version === null || merged.has(pin.agentId)) continue;
		add(pin.version, {
			key: `live:${pin.agentId}`,
			label: i18n.baseText('settings.context.skills.versions.timeline.agent.live', {
				interpolate: { name: pin.agentName },
			}),
			variant: 'info',
		});
	}
	return chips;
});

const entries = computed(() =>
	groupSkillTimeline(
		props.versions,
		({ version }) => version === props.latestVersion || chipsByVersion.value.has(version),
	),
);

/** Expanded groups show their versions as normal rows. */
const rows = computed(() =>
	entries.value.flatMap((entry) =>
		entry.type === 'unnamed' && expandedGroups.value.has(entry.key)
			? entry.versions.map((version) => ({ type: 'version' as const, version }))
			: [entry],
	),
);

function expand(key: string) {
	expandedGroups.value = new Set([...expandedGroups.value, key]);
}

function versionTitle(version: SkillVersionSummary): string {
	return (
		version.label ??
		i18n.baseText('settings.context.skills.versions.timeline.version', {
			interpolate: { version: String(version.version) },
		})
	);
}

function versionNumber(version: SkillVersionSummary): string {
	const short = i18n.baseText('settings.context.skills.versions.number', {
		interpolate: { version: String(version.version) },
	});
	return version.version === props.latestVersion
		? `${short} · ${i18n.baseText('settings.context.skills.versions.timeline.latest')}`
		: short;
}

function authorName(version: SkillVersionSummary): string {
	return (
		skillUserName(version.createdBy) ??
		i18n.baseText('settings.context.skills.versions.timeline.unknownUser')
	);
}
</script>

<template>
	<aside :class="$style.timeline" data-testid="skill-version-timeline">
		<header :class="$style.header">
			<N8nText bold color="text-dark">
				{{ i18n.baseText('settings.context.skills.versions.timeline.title') }}
			</N8nText>
			<N8nIconButton
				variant="ghost"
				icon="x"
				size="small"
				:aria-label="i18n.baseText('settings.context.skills.versions.timeline.close')"
				data-testid="skill-version-timeline-close"
				@click="emit('close')"
			/>
		</header>

		<div :class="$style.list">
			<div v-if="loading && versions.length === 0" :class="$style.placeholder">
				<N8nLoading :rows="3" />
			</div>
			<N8nText
				v-else-if="versions.length === 0"
				size="small"
				color="text-light"
				:class="$style.placeholder"
				data-testid="skill-version-timeline-empty"
			>
				{{ i18n.baseText('settings.context.skills.versions.timeline.empty') }}
			</N8nText>
			<template
				v-for="entry in rows"
				:key="entry.type === 'unnamed' ? entry.key : entry.version.id"
			>
				<button
					v-if="entry.type === 'unnamed'"
					type="button"
					:class="$style.unnamed"
					data-testid="skill-version-unnamed"
					@click="expand(entry.key)"
				>
					<N8nIcon icon="chevron-right" size="small" />
					{{
						i18n.baseText('settings.context.skills.versions.timeline.unnamed', {
							interpolate: { count: String(entry.versions.length) },
							adjustToNumber: entry.versions.length,
						})
					}}
				</button>
				<div
					v-else
					role="button"
					tabindex="0"
					:class="[
						$style.row,
						entry.version.version === latestVersion && $style.latest,
						entry.version.version === selectedVersion && $style.selected,
					]"
					:data-version="entry.version.version"
					:aria-current="entry.version.version === selectedVersion ? 'true' : undefined"
					data-testid="skill-version-row"
					@click="emit('select', entry.version.version)"
					@keydown.enter.prevent="emit('select', entry.version.version)"
					@keydown.space.prevent="emit('select', entry.version.version)"
				>
					<div :class="$style.rowTitle">
						<N8nText size="small" bold color="text-dark" :class="$style.name">
							{{ versionTitle(entry.version) }}
						</N8nText>
						<N8nText size="xsmall" color="text-light">{{ versionNumber(entry.version) }}</N8nText>
					</div>
					<N8nText size="xsmall" color="text-light" tag="div">
						{{ authorName(entry.version) }} ·
						<TimeAgo :date="entry.version.createdAt" />
					</N8nText>
					<div
						v-if="chipsByVersion.get(entry.version.version)?.length"
						:class="$style.chips"
						data-testid="skill-version-agents"
					>
						<template v-for="chip in chipsByVersion.get(entry.version.version)" :key="chip.key">
							<N8nTooltip
								v-if="chip.live"
								:content="
									i18n.baseText(
										'settings.context.skills.versions.timeline.agent.liveMarker.tooltip',
									)
								"
								placement="top"
							>
								<N8nBadge
									:variant="chip.variant"
									size="xsmall"
									data-testid="skill-version-agent"
									data-live="true"
								>
									{{ chip.label }}
									<template #trailing>
										<span :class="$style.liveMarker" data-testid="skill-version-agent-live">
											<span :class="$style.liveDot" aria-hidden="true" />
											{{
												i18n.baseText('settings.context.skills.versions.timeline.agent.liveMarker')
											}}
										</span>
									</template>
								</N8nBadge>
							</N8nTooltip>
							<N8nBadge
								v-else
								:variant="chip.variant"
								size="xsmall"
								data-testid="skill-version-agent"
							>
								{{ chip.label }}
							</N8nBadge>
						</template>
					</div>
					<N8nButton
						v-if="entry.version.version !== latestVersion"
						variant="outline"
						size="xsmall"
						:class="$style.compare"
						data-testid="skill-version-row-compare"
						@click.stop="emit('compare', entry.version.version)"
						@keydown.stop
					>
						{{ i18n.baseText('settings.context.skills.versions.timeline.compare') }}
					</N8nButton>
				</div>
			</template>
		</div>

		<footer :class="$style.legend">
			<N8nText size="xsmall" color="text-light" tag="p">
				{{ i18n.baseText('settings.context.skills.versions.timeline.legend.follow') }}
			</N8nText>
			<N8nText size="xsmall" color="text-light" tag="p">
				{{ i18n.baseText('settings.context.skills.versions.timeline.legend.pinned') }}
			</N8nText>
			<N8nText size="xsmall" color="text-light" tag="p">
				{{ i18n.baseText('settings.context.skills.versions.timeline.legend.live') }}
			</N8nText>
			<N8nText size="xsmall" color="text-light" tag="p">
				{{ i18n.baseText('settings.context.skills.versions.timeline.legend.liveMarker') }}
			</N8nText>
		</footer>
	</aside>
</template>

<style lang="scss" module>
.timeline {
	display: flex;
	flex-direction: column;
	min-height: 0;
	height: 100%;
	background-color: var(--color--background--light-2);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.list {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.placeholder {
	padding: var(--spacing--xs);
}

.row {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--2xs) var(--spacing--lg);
	border-radius: var(--radius--lg);
	cursor: pointer;

	/* The dot of the timeline. The latest version has a green one. */
	&::before {
		content: '';
		position: absolute;
		left: var(--spacing--xs);
		top: calc(var(--spacing--2xs) + var(--spacing--4xs));
		width: var(--spacing--2xs);
		height: var(--spacing--2xs);
		border-radius: 50%;
		background-color: var(--color--foreground--shade-1);
	}

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--color--primary);
		outline-offset: calc(-1 * var(--spacing--5xs));
	}
}

.latest::before {
	background-color: var(--color--success);
}

.selected {
	background-color: var(--background--active);
}

.rowTitle {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	min-width: 0;
	max-width: 100%;
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chips {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--4xs);
}

.liveMarker {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	margin-left: var(--spacing--4xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
}

/* Blue, like the live chips, so the marker reads as "live" on a green or amber chip. */
.liveDot {
	width: var(--spacing--4xs);
	height: var(--spacing--4xs);
	border-radius: 50%;
	background-color: var(--color--blue-600);
}

.compare {
	margin-top: var(--spacing--4xs);
}

.unnamed {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--xs) var(--spacing--4xs) var(--spacing--lg);
	border: none;
	background: none;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	cursor: pointer;
	text-align: left;

	&:hover {
		color: var(--color--text--shade-1);
	}
}

.legend {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);

	p {
		margin: 0;
	}
}
</style>
