<script setup lang="ts">
import { useCssModule } from 'vue';
import type { SkillVersionSummary } from '@n8n/api-types';
import { N8nActionDropdown, N8nIconButton, N8nSwitch, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { preferenceUserName } from '@/features/settings/context/context.utils';

type VersionAction = 'open' | 'restore' | 'use';

const props = defineProps<{
	/** Newest first, so the first one is the latest. */
	versions: SkillVersionSummary[];
	/** The version the editor shows. */
	shownVersion?: number;
	canRestore: boolean;
	/**
	 * Agent builder only: the agent the editor was opened from, and which versions its
	 * draft and published agent run. Absent in Settings.
	 */
	agent?: { name: string; draft: number; published: number | null; pinned: boolean };
}>();

const emit = defineEmits<{
	open: [version: number];
	restore: [version: number];
	/** Compare this version with the version the editor shows. */
	compare: [version: number];
	/** Agent builder: pin the agent draft to this version. */
	use: [version: number];
	/** Agent builder: let the agent draft follow the latest version. */
	useLatest: [];
}>();

const i18n = useI18n();
const $style = useCssModule();

function savedBy(version: SkillVersionSummary): string {
	const { date, time } = convertToDisplayDate(version.createdAt);
	return i18n.baseText('agents.builder.skills.versions.savedBy', {
		interpolate: {
			author:
				preferenceUserName(version.createdBy) ||
				i18n.baseText('agents.builder.skills.versions.unknownUser'),
			date,
			time,
		},
	});
}

function actionsFor(index: number, version: number): Array<ActionDropdownItem<VersionAction>> {
	return [
		{ id: 'open', label: i18n.baseText('agents.builder.skills.versions.open'), icon: 'eye' },
		...(props.agent && version !== props.agent.draft
			? [
					{
						id: 'use' as const,
						label: i18n.baseText('agents.builder.skills.versions.useIn', {
							interpolate: { agent: props.agent.name },
						}),
						icon: 'node-pin' as const,
					},
				]
			: []),
		// The latest version needs no restore: it is what the editor shows.
		...(props.canRestore && index > 0
			? [
					{
						id: 'restore' as const,
						label: i18n.baseText('agents.builder.skills.versions.restore'),
						icon: 'history' as const,
					},
				]
			: []),
	];
}

function onAction(version: number, action: VersionAction) {
	if (action === 'open') emit('open', version);
	else if (action === 'use') emit('use', version);
	else emit('restore', version);
}

/** The dot of a row: the draft and the published agent in the builder, the latest in Settings. */
function dotClass(version: number, index: number) {
	if (!props.agent) return index === 0 && $style.latestDot;
	return [
		version === props.agent.draft && $style.draftDot,
		version === props.agent.published && $style.publishedDot,
	];
}
</script>

<template>
	<aside :class="$style.panel" data-testid="skill-version-timeline">
		<div :class="$style.header">
			<N8nText tag="h3" size="medium" bold :class="$style.title">
				{{ i18n.baseText('agents.builder.skills.versions.title') }}
			</N8nText>
			<N8nSwitch
				v-if="props.agent"
				:model-value="!props.agent.pinned"
				:label="i18n.baseText('agents.builder.skills.versions.useLatest')"
				data-testid="skill-version-use-latest"
				@update:model-value="$event ? emit('useLatest') : emit('use', props.agent.draft)"
			/>
		</div>
		<ol :class="$style.list">
			<li
				v-for="(version, index) in props.versions"
				:key="version.id"
				:class="[$style.row, version.version === props.shownVersion && $style.shown]"
				:data-testid="`skill-version-row-${version.version}`"
				@click="emit('open', version.version)"
			>
				<span :class="[$style.dot, dotClass(version.version, index)]" aria-hidden="true" />
				<div :class="$style.text">
					<span :class="$style.versionLine">
						<N8nText size="small" color="text-dark" bold>
							{{
								i18n.baseText('agents.builder.skills.versions.number', {
									interpolate: { version: version.version },
								})
							}}
						</N8nText>
						<N8nText v-if="index === 0" size="small" color="text-light">
							{{ i18n.baseText('agents.builder.skills.versions.latest') }}
						</N8nText>
						<N8nText
							v-if="props.agent && version.version === props.agent.published"
							size="small"
							color="text-light"
							data-testid="skill-version-published"
						>
							{{ i18n.baseText('agents.builder.skills.versions.inPublishedAgent') }}
						</N8nText>
					</span>
					<N8nText size="small" color="text-light">{{ savedBy(version) }}</N8nText>
				</div>
				<span :class="$style.actions" @click.stop>
					<N8nIconButton
						v-if="version.version !== props.shownVersion"
						variant="ghost"
						size="small"
						icon="file-diff"
						:aria-label="
							i18n.baseText('agents.builder.skills.versions.compare', {
								interpolate: { from: version.version, to: props.shownVersion ?? '' },
							})
						"
						:data-testid="`skill-version-compare-${version.version}`"
						@click="emit('compare', version.version)"
					/>
					<N8nActionDropdown
						:items="actionsFor(index, version.version)"
						activator-icon="ellipsis"
						activator-size="small"
						placement="bottom-end"
						:data-testid="`skill-version-actions-${version.version}`"
						@select="(action: VersionAction) => onAction(version.version, action)"
					/>
				</span>
			</li>
		</ol>
	</aside>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--md) var(--spacing--sm) var(--spacing--md) var(--spacing--md);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.title {
	margin: 0;
}

.list {
	--skill-version-timeline--gap: var(--spacing--lg);
	display: flex;
	flex-direction: column;
	gap: var(--skill-version-timeline--gap);
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	position: relative;
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover,
	&.shown {
		background-color: var(--background--hover);
	}

	/* The line that joins the dots of the rows. */
	&:not(:last-child)::after {
		content: '';
		position: absolute;
		left: calc(var(--spacing--xs) + var(--spacing--5xs) - 0.5px);
		top: calc(50% + var(--spacing--2xs));
		/* Down to the dot of the next row, across the gap between the rows. */
		height: calc(100% - var(--spacing--xs) + var(--skill-version-timeline--gap));
		border-left: var(--border);
	}
}

.dot {
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	flex-shrink: 0;
	border: var(--border);
	border-radius: 50%;
	background-color: var(--color--background--light-3);
}

.draftDot {
	border-color: var(--color--warning);
	background-color: var(--color--warning);
}

.latestDot {
	border-color: var(--color--success);
	background-color: var(--color--success);
}

.publishedDot {
	border-color: var(--color--teal);
	background-color: var(--color--teal);
}

/* The draft and the published agent run the same version: an amber dot with a teal ring. */
.draftDot.publishedDot {
	border-color: var(--color--teal);
	background-color: var(--color--warning);
}

.versionLine {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--4xs);
}

.text {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}
.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
}
</style>
