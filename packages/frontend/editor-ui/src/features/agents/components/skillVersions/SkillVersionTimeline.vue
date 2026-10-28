<script setup lang="ts">
import type { SkillVersionSummary } from '@n8n/api-types';
import { N8nActionDropdown, N8nIconButton, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { preferenceUserName } from '@/features/settings/context/context.utils';

type VersionAction = 'open' | 'restore';

const props = defineProps<{
	/** Newest first, so the first one is the latest. */
	versions: SkillVersionSummary[];
	/** The version the editor shows. */
	shownVersion?: number;
	canRestore: boolean;
}>();

const emit = defineEmits<{
	open: [version: number];
	restore: [version: number];
	/** Compare this version with the version the editor shows. */
	compare: [version: number];
}>();

const i18n = useI18n();

function savedBy(version: SkillVersionSummary): string {
	const { date, time } = convertToDisplayDate(version.createdAt);
	return i18n.baseText('agents.builder.skills.versions.savedBy', {
		interpolate: {
			author:
				preferenceUserName(version.createdBy) ||
				i18n.baseText('agents.builder.skills.versions.unknownUser'),
			date,
			// The panel shows minutes, as the design does.
			time: time.slice(0, 5),
		},
	});
}

function actionsFor(index: number): Array<ActionDropdownItem<VersionAction>> {
	return [
		{ id: 'open', label: i18n.baseText('agents.builder.skills.versions.open'), icon: 'eye' },
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
	else emit('restore', version);
}
</script>

<template>
	<aside :class="$style.panel" data-testid="skill-version-timeline">
		<N8nText tag="h3" size="small" bold :class="$style.title">
			{{ i18n.baseText('agents.builder.skills.versions.title') }}
		</N8nText>
		<ol :class="$style.list">
			<li
				v-for="(version, index) in props.versions"
				:key="version.id"
				:class="[$style.row, version.version === props.shownVersion && $style.shown]"
				:data-testid="`skill-version-row-${version.version}`"
				@click="emit('open', version.version)"
			>
				<span :class="[$style.dot, index === 0 && $style.latestDot]" aria-hidden="true" />
				<div :class="$style.text">
					<N8nText size="small" color="text-dark">
						{{
							i18n.baseText('agents.builder.skills.versions.number', {
								interpolate: { version: version.version },
							})
						}}
						<N8nText v-if="index === 0" size="small" color="text-light">
							{{ i18n.baseText('agents.builder.skills.versions.latest') }}
						</N8nText>
					</N8nText>
					<N8nText size="xsmall" color="text-light">{{ savedBy(version) }}</N8nText>
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
						:items="actionsFor(index)"
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

.title {
	margin: 0;
}

.list {
	display: flex;
	flex-direction: column;
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
		height: calc(100% - var(--spacing--xs));
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

.latestDot {
	border-color: var(--color--success);
	background-color: var(--color--success);
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
