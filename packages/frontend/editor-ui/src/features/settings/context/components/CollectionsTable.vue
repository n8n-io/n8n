<script lang="ts" setup>
import { computed } from 'vue';
import type { KnowledgeCollectionDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { N8nActionToggle, N8nBadge, N8nDataTableServer, N8nText } from '@n8n/design-system';
import type { IconOrEmoji, TableHeader } from '@n8n/design-system';

import TimeAgo from '@/app/components/TimeAgo.vue';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import { useCollectionPermissions } from '@/features/settings/context/composables/useCollectionPermissions';

type HomeProject = KnowledgeCollectionDto['homeProject'];
type CollectionAction = 'edit' | 'delete';

/** The fields of the action toggle item that this menu uses. */
type CollectionActionItem = { value: CollectionAction; label: string; destructive?: boolean };

const PERSONAL_ICON: IconOrEmoji = { type: 'icon', value: 'user' };

const props = defineProps<{
	collections: KnowledgeCollectionDto[];
	loading?: boolean;
	/** The table renders its cover row whenever the slot exists, so the slot is withheld. */
	showEmpty?: boolean;
}>();

const emit = defineEmits<{
	open: [collection: KnowledgeCollectionDto];
	edit: [collection: KnowledgeCollectionDto];
	delete: [collection: KnowledgeCollectionDto];
}>();

const i18n = useI18n();
const projectsStore = useProjectsStore();
const { canChange } = useCollectionPermissions();

const rowActions = computed<CollectionActionItem[]>(() => [
	{ value: 'edit', label: i18n.baseText('settings.context.collections.actions.edit') },
	{
		value: 'delete',
		label: i18n.baseText('settings.context.collections.actions.delete'),
		destructive: true,
	},
]);

function onAction(collection: KnowledgeCollectionDto, action: CollectionAction) {
	if (action === 'edit') {
		emit('edit', collection);
	} else {
		emit('delete', collection);
	}
}

function onRowClick(_event: MouseEvent, payload: { item: KnowledgeCollectionDto }) {
	emit('open', payload.item);
}

function projectLabel(project: HomeProject): string {
	if (project.id === projectsStore.personalProject?.id) {
		return i18n.baseText('settings.context.collections.project.personal');
	}

	if (project.type === 'personal') {
		// A personal project is named `First Last <email>`; the owner is the name part.
		const { name, email } = splitName(project.name);
		return name ?? email ?? project.name;
	}

	return project.name;
}

// The list has no project icon, so a team project takes it from the user's project list.
function projectIcon(project: HomeProject): IconOrEmoji {
	if (project.type === 'personal') {
		return PERSONAL_ICON;
	}

	const known = projectsStore.myProjects.find((candidate) => candidate.id === project.id);
	return known?.icon ?? DEFAULT_PROJECT_ICON;
}

function fileCount(collection: KnowledgeCollectionDto): string {
	return i18n.baseText('settings.context.collections.fileCount', {
		interpolate: { count: collection.fileCount },
		adjustToNumber: collection.fileCount,
	});
}

// The server sends the list newest first and the page keeps that order, so no column sorts.
const headers = computed<Array<TableHeader<KnowledgeCollectionDto>>>(() => [
	{
		title: i18n.baseText('settings.context.collections.columns.collection'),
		key: 'name',
		width: 420,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.context.collections.columns.project'),
		key: 'homeProject',
		width: 220,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.context.collections.columns.contents'),
		key: 'fileCount',
		width: 130,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.context.collections.columns.agents'),
		key: 'agentCount',
		width: 100,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.context.collections.columns.updatedAt'),
		key: 'updatedAt',
		width: 130,
		disableSort: true,
		resize: false,
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
	<div data-test-id="collections-table">
		<N8nDataTableServer
			:headers="headers"
			:items="props.collections"
			:items-length="props.collections.length"
			:loading="props.loading"
			:pagination="false"
			:row-props="{ class: $style.row }"
			@click:row="onRowClick"
		>
			<template v-if="props.showEmpty" #cover>
				<slot name="empty" />
			</template>

			<template #[`item.name`]="{ item }">
				<div :class="$style.collection">
					<!-- A button, so that keyboard users can open the collection too. -->
					<button type="button" :class="$style.open" @click.stop="emit('open', item)">
						<N8nText size="medium" color="text-dark" data-test-id="collection-name">
							{{ item.name }}
						</N8nText>
					</button>
					<N8nText
						size="small"
						color="text-light"
						:class="$style.description"
						data-test-id="collection-description"
					>
						{{ item.description }}
					</N8nText>
				</div>
			</template>

			<template #[`item.homeProject`]="{ item }">
				<N8nBadge variant="outline" :class="$style.badge" data-test-id="collection-project">
					<!-- The leading slot is a direct flex child of the badge, so the icon centres with the label. -->
					<template #leading>
						<ProjectIcon
							:class="$style.icon"
							:icon="projectIcon(item.homeProject)"
							size="mini"
							border-less
						/>
					</template>
					{{ projectLabel(item.homeProject) }}
				</N8nBadge>
			</template>

			<template #[`item.fileCount`]="{ item }">
				<N8nText
					size="small"
					:color="item.fileCount === 0 ? 'text-light' : 'text-base'"
					data-test-id="collection-contents"
				>
					{{ fileCount(item) }}
				</N8nText>
			</template>

			<template #[`item.agentCount`]="{ item }">
				<N8nText
					size="small"
					:color="item.agentCount === 0 ? 'text-light' : 'text-base'"
					:class="$style.number"
					data-test-id="collection-agents"
				>
					{{ item.agentCount === 0 ? '—' : item.agentCount }}
				</N8nText>
			</template>

			<template #[`item.updatedAt`]="{ item }">
				<N8nText size="small" color="text-light" data-test-id="collection-updated-at">
					<TimeAgo :date="item.updatedAt" />
				</N8nText>
			</template>

			<!-- A row the user cannot change has no menu. A click on the menu does not open the row. -->
			<template #[`item.actions`]="{ item }">
				<div v-if="canChange(item)" :class="$style.actions" @click.stop>
					<N8nActionToggle
						:actions="rowActions"
						:aria-label="i18n.baseText('node.moreActions')"
						data-test-id="collection-row-actions"
						@action="(action: CollectionAction) => onAction(item, action)"
					/>
				</div>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module>
.collection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding-block: var(--spacing--2xs);
	min-width: 0;
}

.open {
	align-self: flex-start;
	max-width: 100%;
	padding: 0;
	border: none;
	background: none;
	text-align: start;
	cursor: pointer;
}

// Line clamping needs the text element itself, not a wrapper.
.description {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
	white-space: normal;
	overflow-wrap: anywhere;
}

.badge {
	max-width: 100%;

	// Geist sits high in its line box, so the inherited line height leaves the label above the
	// icon. Padding keeps descenders clear of the label's ellipsis clip.
	> :global(.n8n-text) {
		line-height: 1;
		padding-block: var(--spacing--5xs);
	}
}

.icon {
	flex-shrink: 0;
}

.number {
	font-variant-numeric: tabular-nums;
}

.actions {
	display: flex;
	justify-content: flex-end;
}

.row {
	cursor: pointer;
}
</style>
