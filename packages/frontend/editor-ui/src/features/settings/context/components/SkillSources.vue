<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { SkillSourceListItem } from '@n8n/api-types';
import {
	N8nActionToggle,
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nDataTableServer,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nText,
} from '@n8n/design-system';
import type { TableHeader, TableOptions } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useSkillsStore } from '../skills.store';
import { useSkillScopeDisplay } from '../skills.utils';
import { PREFERENCES_PAGE_SIZES, SKILLS_DEFAULT_PAGE_SIZE } from '../context.constants';

const props = defineProps<{ canConnect: boolean }>();
const emit = defineEmits<{ addMore: [sourceId: string]; connect: [] }>();
const i18n = useI18n();
const store = useSkillsStore();
const { scopeDisplay } = useSkillScopeDisplay();
const search = ref('');
const loading = ref(false);
const failed = ref(false);
const selectedId = ref<string>();
const selected = computed(() => store.sources.find((source) => source.id === selectedId.value));
const options = ref<TableOptions>({ page: 0, itemsPerPage: SKILLS_DEFAULT_PAGE_SIZE, sortBy: [] });
const filtered = computed(() => {
	const term = search.value.trim().toLocaleLowerCase();
	return store.sources.filter((source) => source.label.toLocaleLowerCase().includes(term));
});
const page = computed(() => {
	const size = options.value.itemsPerPage ?? SKILLS_DEFAULT_PAGE_SIZE;
	const start = (options.value.page ?? 0) * size;
	return filtered.value.slice(start, start + size);
});
const headers = computed<Array<TableHeader<SkillSourceListItem>>>(() => [
	{
		title: i18n.baseText('settings.context.sources.columns.source'),
		key: 'label',
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.scope'),
		key: 'scope',
		disableSort: true,
	},
	{ title: i18n.baseText('settings.context.skills.title'), key: 'skillCount', disableSort: true },
	{ title: '', key: 'actions', align: 'end', disableSort: true, value: () => undefined },
]);

function display(source: SkillSourceListItem) {
	return scopeDisplay({ ...source, agentName: null });
}

function actions(source: SkillSourceListItem) {
	return [
		{ value: 'view', label: i18n.baseText('settings.context.sources.view'), icon: 'eye' as const },
		...(source.canAddSkills
			? [
					{
						value: 'add',
						label: i18n.baseText('settings.context.skills.more.title'),
						icon: 'plus' as const,
					},
				]
			: []),
	];
}

function onAction(source: SkillSourceListItem, action: string) {
	if (action === 'add') addMore(source);
	else selectedId.value = source.id;
}

function addMore(source: SkillSourceListItem) {
	selectedId.value = undefined;
	emit('addMore', source.id);
}

async function load() {
	loading.value = true;
	failed.value = false;
	try {
		await store.fetchSources();
	} catch {
		failed.value = true;
	} finally {
		loading.value = false;
	}
}

onMounted(load);
</script>

<template>
	<div :class="$style.content" data-test-id="skill-sources">
		<div :class="$style.toolbar">
			<N8nInput
				v-model="search"
				:placeholder="i18n.baseText('settings.context.sources.search')"
				clearable
				data-test-id="skill-sources-search"
				@update:model-value="options.page = 0"
			>
				<template #prefix><N8nIcon icon="search" /></template>
			</N8nInput>
			<N8nButton
				v-if="props.canConnect"
				:label="i18n.baseText('settings.context.skills.actions.connectGithub')"
				data-test-id="skill-sources-connect"
				@click="emit('connect')"
			/>
		</div>
		<N8nCallout v-if="failed" theme="danger" data-test-id="skill-sources-error">
			{{ i18n.baseText('settings.context.sources.error') }}
			<N8nButton variant="ghost" :label="i18n.baseText('generic.retry')" @click="load" />
		</N8nCallout>
		<N8nDataTableServer
			v-else
			v-model:page="options.page"
			v-model:items-per-page="options.itemsPerPage"
			:headers="headers"
			:items="page"
			:items-length="filtered.length"
			:loading="loading"
			:page-sizes="PREFERENCES_PAGE_SIZES"
			@click:row="(_event, { item }) => (selectedId = item.id)"
		>
			<template #[`item.label`]="{ item }">
				<button
					type="button"
					:class="$style.source"
					:data-test-id="`skill-source-open-${item.id}`"
					@click.stop="selectedId = item.id"
				>
					<N8nText bold>{{ item.label }}</N8nText>
					<N8nText v-if="item.ref" size="small" color="text-light">{{ item.ref }}</N8nText>
				</button>
			</template>
			<template #[`item.scope`]="{ item }">
				<N8nBadge variant="outline"
					><template #leading><N8nIcon :icon="display(item).icon" size="small" /></template
					>{{ display(item).label }}</N8nBadge
				>
			</template>
			<template #[`item.actions`]="{ item }">
				<div @click.stop>
					<N8nActionToggle
						:actions="actions(item)"
						:data-test-id="`skill-source-menu-${item.id}`"
						@action="onAction(item, $event)"
					>
						<N8nIconButton
							variant="ghost"
							icon="ellipsis-12"
							:aria-label="i18n.baseText('settings.context.sources.actions')"
						/>
					</N8nActionToggle>
				</div>
			</template>
			<template v-if="!loading && filtered.length === 0" #cover>
				<N8nText :class="$style.empty" color="text-light" data-test-id="skill-sources-empty">
					{{
						i18n.baseText(
							search.trim()
								? 'settings.context.sources.noResults'
								: 'settings.context.sources.empty',
						)
					}}
				</N8nText>
			</template>
		</N8nDataTableServer>
		<N8nText size="small" color="text-light">{{
			i18n.baseText('settings.context.sources.visibility')
		}}</N8nText>
		<N8nDialog
			:open="!!selected"
			:header="selected?.label"
			data-test-id="skill-source-details"
			@update:open="!$event && (selectedId = undefined)"
		>
			<N8nDialogBody v-if="selected" :class="$style.content">
				<N8nText>{{ [selected.label, selected.ref].filter(Boolean).join(' · ') }}</N8nText>
				<N8nBadge variant="outline" :class="$style.scopeBadge">{{
					display(selected).label
				}}</N8nBadge>
				<N8nText>{{
					i18n.baseText('settings.context.skills.count', {
						interpolate: { count: selected.skillCount },
						adjustToNumber: selected.skillCount,
					})
				}}</N8nText>
			</N8nDialogBody>
			<N8nDialogFooter v-if="selected">
				<N8nButton
					variant="outline"
					:href="selected.webUrl"
					target="_blank"
					rel="noopener noreferrer"
					:label="i18n.baseText('settings.context.sources.openGithub')"
				/>
				<N8nButton
					v-if="selected.canAddSkills"
					:label="i18n.baseText('settings.context.skills.more.title')"
					data-test-id="skill-source-details-add-more"
					@click="addMore(selected)"
				/>
			</N8nDialogFooter>
		</N8nDialog>
	</div>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);

	> :first-child {
		flex: 1;
	}
}
.source {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--4xs);
	padding: 0;
	border: 0;
	background: none;
	text-align: left;
	cursor: pointer;
}
.scopeBadge {
	align-self: flex-start;
}
.empty {
	display: block;
	padding: var(--spacing--xl);
	text-align: center;
}
</style>
