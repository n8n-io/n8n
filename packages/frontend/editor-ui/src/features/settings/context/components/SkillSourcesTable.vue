<script setup lang="ts">
import { computed } from 'vue';
import type { SkillSourceListItem } from '@n8n/api-types';
import {
	N8nActionToggle,
	N8nBadge,
	N8nDataTableServer,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import type { IconName, TableHeader } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import TimeAgo from '@/app/components/TimeAgo.vue';

import SkillScopeBadge from './SkillScopeBadge.vue';

type SourceAction = 'review' | 'checkNow' | 'openInGitHub';

type SourceActionItem = { value: SourceAction; label: string; icon: IconName };

const props = defineProps<{
	sources: SkillSourceListItem[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	review: [source: SkillSourceListItem];
	checkNow: [source: SkillSourceListItem];
}>();

const i18n = useI18n();

/** A source with updates opens "Updates from". Without, the row does nothing. */
const hasUpdates = (source: SkillSourceListItem) =>
	source.updatesAvailable + source.updatesBlocked > 0;

function actionsFor(source: SkillSourceListItem): SourceActionItem[] {
	return [
		// As in the prototype: only when an update can come in.
		...(source.updatesAvailable > 0 && source.canReview
			? [
					{
						value: 'review' as const,
						label: i18n.baseText('settings.context.skills.sources.actions.review'),
						icon: 'list-checks' as const,
					},
				]
			: []),
		...(source.canReview
			? [
					{
						value: 'checkNow' as const,
						label: i18n.baseText('settings.context.skills.sources.actions.checkNow'),
						icon: 'refresh-cw' as const,
					},
				]
			: []),
		{
			value: 'openInGitHub',
			label: i18n.baseText('settings.context.skills.sources.actions.openInGitHub'),
			icon: 'external-link',
		},
	];
}

function onAction(source: SkillSourceListItem, action: SourceAction) {
	if (action === 'review') emit('review', source);
	else if (action === 'checkNow') emit('checkNow', source);
	else window.open(source.webUrl, '_blank', 'noopener');
}

function onRowClick(_event: MouseEvent, payload: { item: SkillSourceListItem }) {
	if (hasUpdates(payload.item)) emit('review', payload.item);
}

/** The scope badge reads the fields of a skill. A source is never one agent's. */
const scopeOf = (source: SkillSourceListItem) => ({
	scope: source.projectId ? ('project' as const) : ('instance' as const),
	projectId: source.projectId,
	projectName: source.projectName,
	projectType: source.projectType,
	agentName: null,
});

const headers = computed<Array<TableHeader<SkillSourceListItem>>>(() => [
	{
		title: i18n.baseText('settings.context.skills.sources.columns.source'),
		key: 'label',
		width: 320,
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.context.skills.sources.columns.scope'),
		key: 'projectId',
		width: 200,
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.context.skills.sources.columns.skills'),
		key: 'skillCount',
		width: 90,
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.context.skills.sources.columns.updates'),
		key: 'updatesAvailable',
		width: 220,
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.context.skills.sources.columns.lastChecked'),
		key: 'lastCheckedAt',
		width: 140,
		disableSort: true,
	},
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 64,
		disableSort: true,
		resize: false,
		value: () => undefined,
	},
]);
</script>

<template>
	<div data-test-id="skill-sources-table">
		<N8nDataTableServer
			:headers="headers"
			:items="props.sources"
			:items-length="props.sources.length"
			:loading="props.loading"
			:items-per-page="props.sources.length || 1"
			:row-props="{ class: $style.row }"
			@click:row="onRowClick"
		>
			<template v-if="!props.loading && props.sources.length === 0" #cover>
				<div :class="$style.empty" data-test-id="skill-sources-empty">
					<N8nText bold>{{ i18n.baseText('settings.context.skills.sources.empty.title') }}</N8nText>
					<N8nText color="text-light">
						{{ i18n.baseText('settings.context.skills.sources.empty.description') }}
					</N8nText>
				</div>
			</template>
			<template #[`item.label`]="{ item }">
				<div :class="$style.source">
					<N8nIcon icon="github" size="medium" />
					<div :class="$style.sourceText">
						<N8nText size="medium" color="text-dark" data-test-id="skill-source-label">
							{{ item.label }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ [item.ref, item.path].filter(Boolean).join(' · ') }}
						</N8nText>
					</div>
				</div>
			</template>

			<template #[`item.projectId`]="{ item }">
				<SkillScopeBadge :skill="scopeOf(item)" />
			</template>

			<template #[`item.skillCount`]="{ item }">
				<N8nText size="small">{{ item.skillCount }}</N8nText>
			</template>

			<template #[`item.updatesAvailable`]="{ item }">
				<div :class="$style.updates" data-test-id="skill-source-updates">
					<N8nText v-if="!hasUpdates(item)" size="small" color="text-light">
						{{ i18n.baseText('settings.context.skills.sources.upToDate') }}
					</N8nText>
					<N8nBadge v-if="item.updatesAvailable > 0" variant="warning">
						{{
							i18n.baseText('settings.context.skills.sources.available', {
								interpolate: { count: item.updatesAvailable },
								adjustToNumber: item.updatesAvailable,
							})
						}}
					</N8nBadge>
					<N8nBadge v-if="item.updatesBlocked > 0" variant="danger">
						{{
							i18n.baseText('settings.context.skills.sources.blocked', {
								interpolate: { count: item.updatesBlocked },
							})
						}}
					</N8nBadge>
				</div>
			</template>

			<template #[`item.lastCheckedAt`]="{ item }">
				<N8nText size="small" color="text-light">
					<TimeAgo v-if="item.lastCheckedAt" :date="item.lastCheckedAt" />
					<template v-else>{{ i18n.baseText('settings.context.skills.sources.never') }}</template>
				</N8nText>
			</template>

			<template #[`item.actions`]="{ item }">
				<div :class="$style.actions" @click.stop>
					<N8nActionToggle
						:actions="actionsFor(item)"
						data-test-id="skill-source-actions"
						@action="(action: SourceAction) => onAction(item, action)"
					/>
				</div>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module>
.source {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
}

.sourceText {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.updates {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
}

.row {
	cursor: pointer;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xl) var(--spacing--md);
}
</style>
