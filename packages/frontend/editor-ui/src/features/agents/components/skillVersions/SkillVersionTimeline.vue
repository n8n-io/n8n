<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SkillUsage, SkillVersionSummary } from '@n8n/api-types';
import {
	N8nBadge,
	N8nIcon,
	N8nIconButton,
	N8nLoading,
	N8nPopover,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { BadgeVariant, IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useStyles } from '@n8n/composables/useStyles';

import TimeAgo from '@/app/components/TimeAgo.vue';

import { groupSkillTimeline, skillUserName } from './skillVersionDiff.utils';
import { skillVersionStyle } from './skillVersionStyle';

type AgentState = 'draft' | 'pinned' | 'published';

type AgentChip = {
	key: string;
	name: string;
	/** The draft state first, then `published` when the published agent runs this version. */
	states: AgentState[];
	label: string;
	tooltip: string;
	variant: BadgeVariant;
	icon?: IconName;
	/** A draft whose published agent runs the same version. */
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

// The timeline lives in a modal, so the agents popover must sit above modals.
const { APP_Z_INDEXES } = useStyles();
const i18n = useI18n();
const expandedGroups = ref(new Set<string>());

const STATE_LABELS: Record<AgentState, BaseTextKey> = {
	draft: 'settings.context.skills.versions.timeline.agent.state.draft',
	pinned: 'settings.context.skills.versions.timeline.agent.state.pinned',
	published: 'settings.context.skills.versions.timeline.agent.state.published',
};

const SUMMARY_LABELS: Record<AgentState, BaseTextKey> = {
	draft: 'settings.context.skills.versions.timeline.agents.draft',
	pinned: 'settings.context.skills.versions.timeline.agents.pinned',
	published: 'settings.context.skills.versions.timeline.agents.published',
};

function agentTooltip(name: string, states: AgentState[]): string {
	const [draftState] = states;
	const live = states.includes('published');
	const key: BaseTextKey =
		draftState === 'published'
			? 'settings.context.skills.versions.timeline.agent.tooltip.published'
			: live
				? draftState === 'pinned'
					? 'settings.context.skills.versions.timeline.agent.tooltip.mergedPinned'
					: 'settings.context.skills.versions.timeline.agent.tooltip.merged'
				: draftState === 'pinned'
					? 'settings.context.skills.versions.timeline.agent.tooltip.pinned'
					: 'settings.context.skills.versions.timeline.agent.tooltip.draft';
	return i18n.baseText(key, { interpolate: { name } });
}

function agentChip(key: string, name: string, states: AgentState[]): AgentChip {
	const [first] = states;
	const live = states.includes('published');
	// The badge styles of workflow history: published is green, a draft stays neutral.
	const style = skillVersionStyle(live ? 'published' : first === 'pinned' ? 'pinned' : 'latest');
	return {
		key,
		name,
		states,
		label: states.map((state) => i18n.baseText(STATE_LABELS[state])).join(' · '),
		tooltip: agentTooltip(name, states),
		variant: style.variant,
		// A pinned draft keeps its pin, also when the published agent runs the same version.
		icon: first === 'pinned' ? skillVersionStyle('pinned').icon : style.icon,
		live: first !== 'published' && live,
	};
}

/**
 * The agents on each version: drafts that follow the latest or are pinned, and live agents.
 * One entry for each agent and version: when the draft and the live agent use the same
 * version, the draft entry also names the published state.
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
		const states: AgentState[] = [draft.pinned ? 'pinned' : 'draft'];
		if (live) states.push('published');
		add(draft.version, agentChip(`draft:${draft.agentId}`, draft.agentName, states));
	}
	for (const pin of props.usedBy?.pins ?? []) {
		if (pin.version === null || merged.has(pin.agentId)) continue;
		add(pin.version, agentChip(`live:${pin.agentId}`, pin.agentName, ['published']));
	}
	return chips;
});

function agentCount(chips: AgentChip[]): string {
	return i18n.baseText('settings.context.skills.versions.timeline.agents.count', {
		interpolate: { count: String(chips.length) },
		adjustToNumber: chips.length,
	});
}

/** For example "3 agents · 2 drafts · 1 published": the label of the agents button and the list header. */
function agentSummary(chips: AgentChip[]): string {
	return `${agentCount(chips)} · ${agentBreakdown(chips)}`;
}

/** The list header repeats the badges when every agent is in the same state, so it hides then. */
function showAgentSummary(chips: AgentChip[]): boolean {
	const [first] = chips;
	return !!first && chips.some((chip) => chip.states.join() !== first.states.join());
}

function agentsTooltip(chips: AgentChip[]): string {
	return i18n.baseText('settings.context.skills.versions.timeline.agents.tooltip', {
		interpolate: { count: String(chips.length) },
		adjustToNumber: chips.length,
	});
}

/** For example "2 drafts · 1 published". A merged entry counts in both states. */
function agentBreakdown(chips: AgentChip[]): string {
	const order: AgentState[] = ['draft', 'pinned', 'published'];
	return order
		.map((state) => {
			const count = chips.filter((chip) => chip.states.includes(state)).length;
			return count === 0
				? null
				: i18n.baseText(SUMMARY_LABELS[state], {
						interpolate: { count: String(count) },
						adjustToNumber: count,
					});
		})
		.filter((text) => text !== null)
		.join(' · ');
}

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

function versionNumber(version: SkillVersionSummary): string {
	return i18n.baseText('settings.context.skills.versions.number', {
		interpolate: { version: String(version.version) },
	});
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

		<div :class="$style.scroll">
			<div v-if="loading && versions.length === 0" :class="$style.placeholder">
				<N8nLoading :rows="3" />
			</div>
			<N8nText
				v-else-if="versions.length === 0"
				size="small"
				color="text-light"
				tag="p"
				:class="$style.placeholder"
				data-testid="skill-version-timeline-empty"
			>
				{{ i18n.baseText('settings.context.skills.versions.timeline.empty') }}
			</N8nText>
			<ul v-else :class="$style.list">
				<li
					v-for="entry in rows"
					:key="entry.type === 'unnamed' ? entry.key : entry.version.id"
					:class="
						entry.type === 'unnamed'
							? undefined
							: [
									$style.row,
									entry.version.version === latestVersion && $style.latest,
									entry.version.version === selectedVersion && $style.selected,
								]
					"
					:data-version="entry.type === 'unnamed' ? undefined : entry.version.version"
					:data-testid="entry.type === 'unnamed' ? undefined : 'skill-version-row'"
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
					<template v-else>
						<!-- One button selects the version. The row actions are its siblings, not its children. -->
						<button
							type="button"
							:class="$style.select"
							:aria-current="entry.version.version === selectedVersion ? 'true' : undefined"
							data-testid="skill-version-row-select"
							@click="emit('select', entry.version.version)"
						>
							<span :class="$style.rowTitle">
								<N8nText size="small" bold color="text-dark" :class="$style.name">
									{{ entry.version.label ?? versionNumber(entry.version) }}
								</N8nText>
								<N8nText
									v-if="entry.version.label"
									size="xsmall"
									color="text-light"
									:class="$style.number"
								>
									{{ versionNumber(entry.version) }}
								</N8nText>
								<N8nBadge
									v-if="entry.version.version === latestVersion"
									variant="outline"
									size="xsmall"
									:class="$style.latestBadge"
									data-testid="skill-version-latest"
								>
									{{ i18n.baseText('settings.context.skills.versions.timeline.latest') }}
								</N8nBadge>
							</span>
							<N8nText size="small" color="text-base" tag="span" :class="$style.meta">
								{{ authorName(entry.version) }} ·
								<TimeAgo :date="entry.version.createdAt" />
							</N8nText>
						</button>
						<span :class="$style.rowActions">
							<span v-if="entry.version.version !== latestVersion">
								<N8nTooltip
									:content="i18n.baseText('settings.context.skills.versions.timeline.compare')"
									placement="top"
								>
									<N8nIconButton
										variant="ghost"
										icon="file-diff"
										size="xsmall"
										:class="$style.compare"
										:aria-label="i18n.baseText('settings.context.skills.versions.timeline.compare')"
										data-testid="skill-version-row-compare"
										@click="emit('compare', entry.version.version)"
									/>
								</N8nTooltip>
							</span>
							<N8nTooltip
								v-if="chipsByVersion.get(entry.version.version)?.length"
								:content="agentsTooltip(chipsByVersion.get(entry.version.version) ?? [])"
								placement="top"
							>
								<span>
									<N8nPopover
										width="280px"
										max-height="320px"
										align="end"
										:z-index="APP_Z_INDEXES.MODALS + 1"
									>
										<template #trigger>
											<button
												type="button"
												:class="$style.agentsTrigger"
												:aria-label="agentSummary(chipsByVersion.get(entry.version.version) ?? [])"
												data-testid="skill-version-agents"
											>
												<N8nIcon icon="bot" size="xsmall" />
												{{ chipsByVersion.get(entry.version.version)?.length }}
											</button>
										</template>
										<template #content>
											<N8nText
												v-if="showAgentSummary(chipsByVersion.get(entry.version.version) ?? [])"
												size="xsmall"
												color="text-light"
												tag="div"
												:class="$style.agentListHeader"
												data-testid="skill-version-agents-summary"
											>
												{{ agentSummary(chipsByVersion.get(entry.version.version) ?? []) }}
											</N8nText>
											<ul :class="$style.agentList" data-testid="skill-version-agents-list">
												<li
													v-for="chip in chipsByVersion.get(entry.version.version)"
													:key="chip.key"
													:class="$style.agentItem"
													data-testid="skill-version-agent"
													:data-live="chip.live ? 'true' : undefined"
												>
													<N8nIcon icon="bot" size="small" color="text-light" />
													<N8nText size="small" color="text-dark" :class="$style.agentName">
														{{ chip.name }}
													</N8nText>
													<N8nTooltip :content="chip.tooltip" placement="top">
														<N8nBadge
															:variant="chip.variant"
															size="xsmall"
															:class="$style.agentBadge"
															data-testid="skill-version-agent-state"
														>
															<template v-if="chip.icon" #leading>
																<N8nIcon :icon="chip.icon" size="xsmall" />
															</template>
															{{ chip.label }}
														</N8nBadge>
													</N8nTooltip>
												</li>
											</ul>
										</template>
									</N8nPopover>
								</span>
							</N8nTooltip>
						</span>
					</template>
				</li>
			</ul>
		</div>
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

.scroll {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--2xs);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.placeholder {
	margin: 0;
	padding: var(--spacing--xs);
}

/*
 * The select button takes the first column and the row actions the second. The button
 * stretches its click target over the whole row (see `.select::after`).
 */
.row {
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: start;
	border-radius: var(--radius--lg);

	/* The dot of the timeline. The latest version has a green one. */
	&::before {
		content: '';
		position: absolute;
		left: var(--spacing--xs);
		top: calc(var(--spacing--3xs) + var(--spacing--3xs));
		width: var(--spacing--2xs);
		height: var(--spacing--2xs);
		border-radius: 50%;
		background-color: var(--color--foreground--shade-1);
		pointer-events: none;
	}

	&:hover {
		background-color: var(--background--hover);
	}

	/* Show the compare button on hover and focus. It stays in the tab order when hidden. */
	&:hover .compare,
	&:focus-within .compare {
		opacity: 1;
	}
}

.latest::before {
	background-color: var(--color--success);
}

/* Selected differs from hover: an accent on the left edge and the active background. */
.selected,
.selected:hover {
	background-color: var(--background--active);
	box-shadow: inset var(--spacing--5xs) 0 0 var(--color--primary);

	.compare {
		opacity: 1;
	}
}

.select {
	grid-column: 1;
	grid-row: 1;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	width: 100%;
	min-width: 0;
	padding: var(--spacing--3xs) var(--spacing--3xs) var(--spacing--3xs) var(--spacing--lg);
	border: none;
	border-radius: inherit;
	background: none;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;

	/* Makes the whole row a click target, also the space under the row actions. */
	&::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}

	&:focus-visible {
		outline: none;
	}

	&:focus-visible::after {
		outline: var(--focus--border-width) solid var(--color--primary);
		outline-offset: calc(-1 * var(--spacing--5xs));
	}
}

.rowTitle {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	min-width: 0;
	width: 100%;
}

.name {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.number,
.latestBadge {
	flex-shrink: 0;
}

.latestBadge {
	align-self: center;
}

.meta {
	max-width: 100%;
}

/* Agents and compare sit at the right edge of the title line. Each tooltip wraps its button in an element. */
.rowActions {
	grid-column: 2;
	grid-row: 1;
	/* Above the stretched click target of the select button. */
	position: relative;
	z-index: 1;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: var(--spacing--4xs) var(--spacing--3xs) 0 0;
}

.agentsTrigger {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border: none;
	border-radius: var(--radius);
	background: none;
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}

	&[aria-expanded='true'] {
		background-color: var(--background--active);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--color--primary);
	}
}

.agentList {
	display: flex;
	flex-direction: column;
	margin: 0;
	padding: var(--spacing--4xs);
	list-style: none;
}

.agentItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
}

.agentName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.agentBadge {
	flex-shrink: 0;
	margin-left: var(--spacing--xs);
}

.agentListHeader {
	padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--3xs);
}

.compare {
	opacity: 0;
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
</style>
