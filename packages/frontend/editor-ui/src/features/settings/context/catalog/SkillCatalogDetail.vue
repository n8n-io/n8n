<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { DiscoveredSkill } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ResponseError } from '@n8n/rest-api-client';
import {
	N8nButton,
	N8nCallout,
	N8nExternalLink,
	N8nHeading,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';

import SkillSourceFilesView from '../components/SkillSourceFilesView.vue';
import { previewSkillSource } from '../skills.api';
import { useSkillSourceReasons } from '../skills.utils';
import type { SkillCatalogEntry, SkillCatalogInstallation } from './skillCatalog';

const props = defineProps<{
	entry: SkillCatalogEntry;
	installed: SkillCatalogInstallation[];
	canAdd: boolean;
}>();
const emit = defineEmits<{ add: []; openInstalled: [id: string] }>();
const i18n = useI18n();
const rootStore = useRootStore();
const { reasonText, findingsText } = useSkillSourceReasons();
const skill = ref<DiscoveredSkill>();
const loading = ref(false);
const error = ref('');
const retry = ref(0);

watch(
	[() => props.entry, retry],
	async ([entry], _old, onCleanup) => {
		let active = true;
		onCleanup(() => {
			active = false;
		});
		skill.value = undefined;
		error.value = '';
		loading.value = true;
		try {
			const result = await previewSkillSource(rootStore.restApiContext, entry.url);
			if (!active) return;
			skill.value = result.skills.find((item) => item.location === entry.location);
			if (!skill.value) error.value = i18n.baseText('settings.context.skills.catalog.unavailable');
		} catch (cause) {
			if (!active) return;
			const reason = cause instanceof ResponseError ? cause.meta?.reason : undefined;
			error.value =
				reason === 'not_found' || reason === 'no_skills_found'
					? i18n.baseText('settings.context.skills.catalog.unavailable')
					: reason
						? reasonText(reason)
						: i18n.baseText('settings.context.skills.catalog.loadError');
		} finally {
			if (active) loading.value = false;
		}
	},
	{ immediate: true },
);

const incomplete = computed(() =>
	skill.value?.skippedFiles.some((file) => !props.entry.allowedSkippedFiles?.includes(file)),
);
const blocked = computed(
	() => !!skill.value?.error || skill.value?.check?.verdict === 'blocked' || incomplete.value,
);
const warnings = computed(() => skill.value?.check?.verdict === 'needs_review');
const checkLabel = computed(() =>
	i18n.baseText(
		blocked.value
			? 'settings.context.skills.catalog.check.blocked'
			: warnings.value
				? 'settings.context.skills.catalog.check.warning'
				: 'settings.context.skills.catalog.check.passed',
	),
);
const checkDetails = computed(() => {
	if (incomplete.value) return i18n.baseText('settings.context.skills.catalog.incomplete');
	if (skill.value?.error) return reasonText(skill.value.error.reason);
	return findingsText(
		skill.value?.check?.findings.filter((finding) => finding.severity !== 'info') ?? [],
	);
});
</script>

<template>
	<section :class="$style.detail" data-test-id="skill-catalog-detail">
		<header :class="$style.header">
			<div :class="$style.identity">
				<N8nHeading tag="h1" size="xlarge" bold>{{ i18n.baseText(entry.nameKey) }}</N8nHeading>
				<N8nText tag="p">{{ i18n.baseText(entry.descriptionKey) }}</N8nText>
				<div :class="$style.metadata">
					<N8nText size="small" color="text-light"
						>{{ entry.publisher }} · {{ i18n.baseText('settings.context.skills.catalog.license') }}:
						{{ entry.license }}</N8nText
					>
					<N8nExternalLink :href="entry.url" inline size="small">{{
						i18n.baseText('settings.context.skills.sources.openInGitHub')
					}}</N8nExternalLink>
				</div>
			</div>
			<div :class="$style.actions">
				<N8nButton
					v-for="item in installed"
					:key="item.id"
					variant="ghost"
					size="small"
					@click="emit('openInstalled', item.id)"
				>
					{{
						i18n.baseText('settings.context.skills.catalog.viewInstalled', {
							interpolate: { scope: item.label },
						})
					}}
				</N8nButton>
				<N8nButton
					:disabled="!canAdd || loading || !skill || blocked"
					data-test-id="skill-catalog-add"
					@click="emit('add')"
				>
					{{ i18n.baseText('settings.context.skills.catalog.add') }}
				</N8nButton>
			</div>
		</header>
		<N8nText v-if="!canAdd" size="small" color="text-light">{{
			i18n.baseText('settings.context.skills.catalog.noPermission')
		}}</N8nText>
		<section :class="$style.requirements">
			<N8nHeading tag="h2" size="small" bold>{{
				i18n.baseText('settings.context.skills.catalog.requirements')
			}}</N8nHeading>
			<N8nText size="small" color="text-light">{{ i18n.baseText(entry.requirementsKey) }}</N8nText>
			<div
				v-if="skill && !blocked && !warnings"
				:class="$style.check"
				data-test-id="skill-catalog-check"
			>
				<N8nIcon icon="circle-check" size="small" color="text-light" aria-hidden="true" />
				<N8nText size="small" color="text-light">{{ checkLabel }}</N8nText>
			</div>
		</section>
		<N8nText v-if="loading" role="status">{{
			i18n.baseText('settings.context.skills.catalog.loading')
		}}</N8nText>
		<template v-else-if="error">
			<N8nCallout theme="warning" data-test-id="skill-catalog-load-error">{{ error }}</N8nCallout>
			<N8nButton variant="outline" :class="$style.retry" @click="retry++">{{
				i18n.baseText('generic.retry')
			}}</N8nButton>
		</template>
		<template v-else-if="skill">
			<N8nCallout
				v-if="blocked || warnings"
				:theme="blocked ? 'danger' : 'warning'"
				data-test-id="skill-catalog-check"
			>
				<N8nText bold>{{ checkLabel }}</N8nText>
				<N8nText v-if="checkDetails" tag="p">{{ checkDetails }}</N8nText>
			</N8nCallout>
			<section :class="$style.contents">
				<N8nHeading tag="h2" size="medium" bold>{{
					i18n.baseText('settings.context.skills.catalog.contents')
				}}</N8nHeading>
				<SkillSourceFilesView :skill="skill" sidebar :class="$style.files" />
			</section>
		</template>
	</section>
</template>

<style module lang="scss">
.detail {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	min-width: 0;
}
.header {
	width: 100%;
	display: flex;
	justify-content: space-between;
	align-items: start;
	flex-wrap: wrap;
	gap: var(--spacing--md);
}
.identity {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}
.metadata {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs) var(--spacing--sm);
}
.actions {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}
.requirements {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
}
.check {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
.contents {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
}
.detail .files {
	/* A viewport-relative reader keeps long files inside the preview. No height token covers this. */
	height: 60vh;
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
	overflow: hidden;
}
.retry {
	align-self: start;
}
</style>
