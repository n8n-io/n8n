<script setup lang="ts">
import { computed, defineAsyncComponent, ref, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { SkillSourceListItem } from '@n8n/api-types';
import { useSkillScopeDisplay } from '../skills.utils';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	N8nButton,
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nSelect2,
	N8nText,
	type IconName,
} from '@n8n/design-system';

import {
	CATALOG_CATEGORIES,
	CATALOG_REVIEWED_AT,
	SKILL_CATALOG,
	type SkillCatalogCategory,
	type SkillCatalogEntry,
} from './skillCatalog';

const props = withDefaults(
	defineProps<{ loading?: boolean; canAdd?: boolean; sources?: SkillSourceListItem[] }>(),
	{ canAdd: false, sources: () => [] },
);
const emit = defineEmits<{ select: [entry: SkillCatalogEntry]; openInstalled: [id: string] }>();
const SkillCatalogDetail = defineAsyncComponent(
	async () => await import('./SkillCatalogDetail.vue'),
);
const route = useRoute();
const router = useRouter();
const catalog = useTemplateRef<HTMLElement>('catalog');
watch(
	() => route.query.catalogSkill,
	() => catalog.value?.focus(),
	{ flush: 'post' },
);
const selected = computed(() =>
	SKILL_CATALOG.find((entry) => entry.id === route.query.catalogSkill),
);
const { scopeDisplay } = useSkillScopeDisplay();
const installations = computed(() =>
	props.sources.flatMap((source) =>
		(source.skills ?? []).map((skill) => ({
			...skill,
			label: scopeDisplay({ ...source, scope: source.projectId ? 'project' : 'instance' }).label,
		})),
	),
);
function installed(entry: SkillCatalogEntry) {
	return installations.value.filter((skill) => skill.webUrl === entry.url);
}
function openDetails(entry?: SkillCatalogEntry) {
	void router.push({ query: { ...route.query, view: 'discover', catalogSkill: entry?.id } });
}
const i18n = useI18n();
const search = ref('');
const category = ref('all');

const categoryKeys = {
	build: 'settings.context.skills.catalog.categories.build',
	improve: 'settings.context.skills.catalog.categories.improve',
	agents: 'settings.context.skills.catalog.categories.agents',
	data: 'settings.context.skills.catalog.categories.data',
	writing: 'settings.context.skills.catalog.categories.writing',
	design: 'settings.context.skills.catalog.categories.design',
} satisfies Record<SkillCatalogCategory, BaseTextKey>;

const categoryIcons = {
	build: 'workflow',
	improve: 'wrench',
	agents: 'bot',
	data: 'database',
	writing: 'pen',
	design: 'palette',
} satisfies Record<SkillCatalogCategory, IconName>;

const reviewedDate = computed(() =>
	new Intl.DateTimeFormat(i18n.locale, {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(new Date(`${CATALOG_REVIEWED_AT}T00:00:00Z`)),
);

const categories = computed(() => [
	{ value: 'all', label: i18n.baseText('settings.context.skills.catalog.all') },
	...CATALOG_CATEGORIES.map((value) => ({ value, label: i18n.baseText(categoryKeys[value]) })),
]);

const groups = computed(() => {
	const term = search.value.trim().toLocaleLowerCase();
	return CATALOG_CATEGORIES.filter((value) => category.value === 'all' || category.value === value)
		.map((value) => ({
			category: value,
			skills: SKILL_CATALOG.filter(
				(entry) =>
					entry.category === value &&
					[
						entry.id,
						i18n.baseText(entry.nameKey),
						i18n.baseText(entry.descriptionKey),
						entry.publisher,
					].some((text) => text.toLocaleLowerCase().includes(term)),
			),
		}))
		.filter((group) => group.skills.length > 0);
});

function installs(entry: SkillCatalogEntry) {
	return i18n.baseText('settings.context.skills.catalog.installs', {
		interpolate: { count: new Intl.NumberFormat(i18n.locale).format(entry.installs ?? 0) },
	});
}
</script>

<template>
	<section
		v-if="route.query.catalogSkill"
		ref="catalog"
		:class="$style.catalog"
		tabindex="-1"
		data-test-id="skill-catalog"
	>
		<N8nButton variant="ghost" icon="arrow-left" :class="$style.back" @click="openDetails()">{{
			i18n.baseText('settings.context.skills.catalog.back')
		}}</N8nButton>
		<SkillCatalogDetail
			v-if="selected"
			:key="selected.id"
			:entry="selected"
			:installed="installed(selected)"
			:can-add="canAdd && !loading"
			@add="emit('select', selected)"
			@open-installed="emit('openInstalled', $event)"
		/>
		<N8nText v-else>{{ i18n.baseText('settings.context.skills.catalog.unavailable') }}</N8nText>
	</section>
	<section v-else ref="catalog" :class="$style.catalog" tabindex="-1" data-test-id="skill-catalog">
		<N8nText v-if="loading" role="status">{{ i18n.baseText('generic.loading') }}</N8nText>
		<N8nText tag="p" color="text-light">{{
			i18n.baseText('settings.context.skills.catalog.description')
		}}</N8nText>
		<div :class="$style.filters">
			<N8nInputLabel
				:class="$style.searchFilter"
				:label="i18n.baseText('settings.context.skills.catalog.search')"
				input-name="skill-catalog-search"
			>
				<N8nInput
					id="skill-catalog-search"
					v-model="search"
					size="large"
					:placeholder="i18n.baseText('settings.context.skills.catalog.searchPlaceholder')"
					clearable
					data-test-id="skill-catalog-search"
				>
					<template #prefix><N8nIcon icon="search" size="medium" /></template>
				</N8nInput>
			</N8nInputLabel>
			<N8nInputLabel
				:class="$style.categoryFilter"
				:label="i18n.baseText('settings.context.skills.catalog.category')"
				input-name="skill-catalog-category"
			>
				<N8nSelect2
					id="skill-catalog-category"
					v-model="category"
					:items="categories"
					size="large"
					:aria-label="i18n.baseText('settings.context.skills.catalog.category')"
					data-test-id="skill-catalog-category"
				/>
			</N8nInputLabel>
		</div>
		<N8nText v-if="groups.length === 0" tag="p" data-test-id="skill-catalog-empty">
			{{ i18n.baseText('settings.context.skills.catalog.noResults') }}
		</N8nText>
		<section v-for="group in groups" :key="group.category" :class="$style.group">
			<N8nHeading tag="h2" size="medium" bold>{{
				i18n.baseText(categoryKeys[group.category])
			}}</N8nHeading>
			<ul :class="$style.grid">
				<li v-for="entry in group.skills" :key="entry.id">
					<N8nCard :class="$style.card" :data-test-id="`skill-catalog-${entry.id}`">
						<div :class="$style.cardContent">
							<div :class="$style.cardHeader">
								<span :class="[$style.icon, $style[entry.category]]" aria-hidden="true">
									<N8nIcon :icon="categoryIcons[entry.category]" size="xlarge" />
								</span>
								<div :class="$style.identity">
									<N8nHeading tag="h3" size="medium" bold>{{
										i18n.baseText(entry.nameKey)
									}}</N8nHeading>
									<N8nText size="small" color="text-light">{{ entry.publisher }}</N8nText>
								</div>
							</div>
							<N8nText tag="p" color="text-base" :class="$style.description">{{
								i18n.baseText(entry.descriptionKey)
							}}</N8nText>
							<N8nText
								v-for="item in installed(entry)"
								:key="item.id"
								size="small"
								color="text-light"
								data-test-id="skill-catalog-installed"
								>{{
									i18n.baseText('settings.context.skills.catalog.addedTo', {
										interpolate: { scope: item.label },
									})
								}}</N8nText
							>
							<div :class="$style.cardFooter">
								<N8nText
									v-if="entry.installs !== undefined"
									:class="$style.installs"
									size="small"
									color="text-light"
								>
									<N8nIcon icon="download" size="medium" aria-hidden="true" />
									{{ installs(entry) }}
								</N8nText>
								<N8nButton
									:class="$style.detailsButton"
									variant="outline"
									size="small"
									data-test-id="skill-catalog-details"
									:data-attr="`skill-catalog-details-${entry.id}`"
									@click="openDetails(entry)"
								>
									{{ i18n.baseText('settings.context.skills.catalog.details') }}
									<N8nIcon icon="arrow-right" size="medium" aria-hidden="true" />
								</N8nButton>
							</div>
						</div>
					</N8nCard>
				</li>
			</ul>
		</section>
		<N8nText size="small" color="text-light">{{
			i18n.baseText('settings.context.skills.catalog.reviewed', {
				interpolate: { date: reviewedDate },
			})
		}}</N8nText>
	</section>
</template>

<style module lang="scss">
.back {
	align-self: start;
}
.catalog,
.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.catalog {
	gap: var(--spacing--lg);
}
.filters {
	display: flex;
	flex-wrap: wrap;
	align-items: end;
	gap: var(--spacing--sm);
}
.filters > * {
	min-width: 0;
}
/* No field-width token exists. Wrap when the labels no longer fit side by side. */
.searchFilter {
	flex: 2 1 30ch;
}
.categoryFilter {
	flex: 1 1 22ch;
}
/* There is no card-width token. Leave room for metadata and the footer action. */
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
	gap: var(--spacing--sm);
	list-style: none;
	margin: 0;
	padding: 0;
}
.card {
	--card--padding: var(--spacing--md);

	height: 100%;
	align-items: stretch;
}
.cardContent {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}
.cardHeader {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
}
.identity {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
	overflow-wrap: anywhere;
}
.icon {
	display: grid;
	place-items: center;
	flex-shrink: 0;
	width: var(--height--xl);
	height: var(--height--xl);
	border-radius: var(--radius--xs);
	background-color: color-mix(in srgb, currentColor 10%, var(--background--surface));

	&.build {
		color: var(--color--blue-600);
	}
	&.improve {
		color: var(--color--orange-600);
	}
	&.agents {
		color: var(--color--purple-500);
	}
	&.data {
		color: var(--color--green-600);
	}
	&.writing {
		color: var(--color--blue-500);
	}
	&.design {
		color: var(--color--pink-600);
	}
}
.description {
	flex: 1;
	margin: 0;
}
.cardFooter {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: auto;
	padding-top: var(--spacing--xs);
	border-top: var(--border);
	border-color: var(--border-color--subtle);
}
.installs {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-variant-numeric: tabular-nums;
}
.detailsButton {
	flex-shrink: 0;
	margin-inline-start: auto;
}
</style>
