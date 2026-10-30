<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type { SkillListItem, SkillSourceListItem } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useI18n } from '@n8n/i18n';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';

import GithubIcon from '../assets/github.svg?component';
import { SKILLS_DEFAULT_PAGE_SIZE } from '../context.constants';
import { useSkillsStore } from '../skills.store';
import { useSkillScopeDisplay } from '../skills.utils';

const props = defineProps<{ source: SkillSourceListItem }>();
const emit = defineEmits<{ close: []; addMore: [] }>();
const i18n = useI18n();
const store = useSkillsStore();
const { scopeDisplay } = useSkillScopeDisplay();
const latestFetch = useLatestFetch();
const skills = ref<SkillListItem[]>([]);
const count = ref(0);
const loading = ref(false);
const failed = ref(false);

async function load() {
	const isCurrent = latestFetch.next();
	loading.value = true;
	failed.value = false;
	try {
		const result = await store.fetchSourceSkills(
			props.source.id,
			skills.value.length,
			SKILLS_DEFAULT_PAGE_SIZE,
		);
		if (!isCurrent()) return;
		skills.value.push(...result.data);
		count.value = result.count;
	} catch {
		if (isCurrent()) failed.value = true;
	} finally {
		if (isCurrent()) loading.value = false;
	}
}

watch(
	() => props.source.id,
	() => {
		skills.value = [];
		count.value = props.source.skillCount;
		void load();
	},
	{ immediate: true },
);
onBeforeUnmount(latestFetch.invalidate);
</script>

<template>
	<N8nDialog
		:open="true"
		size="large"
		data-test-id="skill-source-details"
		@update:open="!$event && emit('close')"
	>
		<N8nDialogHeader :class="$style.header">
			<N8nDialogTitle>{{ i18n.baseText('settings.context.sources.details.title') }}</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody :class="$style.body">
			<div :class="$style.source">
				<div :class="$style.repository">
					<GithubIcon :class="$style.icon" aria-hidden="true" />
					<N8nText bold :class="$style.name">{{
						[source.label, source.ref].filter(Boolean).join(' · ')
					}}</N8nText>
				</div>
				<N8nBadge variant="outline" :class="$style.scope">
					<template #leading
						><N8nIcon :icon="scopeDisplay({ ...source, agentName: null }).icon" size="small"
					/></template>
					{{ scopeDisplay({ ...source, agentName: null }).label }}
				</N8nBadge>
			</div>
			<section
				:class="$style.skills"
				:aria-label="i18n.baseText('settings.context.sources.details.skills')"
				:aria-busy="loading"
			>
				<div :class="$style.sectionHeading">
					<N8nText tag="h3" bold>{{
						i18n.baseText('settings.context.sources.details.skills')
					}}</N8nText>
					<N8nText size="small" color="text-light">{{
						i18n.baseText('settings.context.skills.count', {
							interpolate: { count },
							adjustToNumber: count,
						})
					}}</N8nText>
				</div>
				<ul v-if="skills.length" :class="$style.list">
					<li v-for="skill in skills" :key="skill.id" :class="$style.skill">
						<N8nText bold>{{ skill.name }}</N8nText>
						<N8nText v-if="skill.description" color="text-light">{{ skill.description }}</N8nText>
					</li>
				</ul>
				<N8nCallout v-if="failed" theme="danger">
					{{ i18n.baseText('settings.context.sources.details.error') }}
					<N8nButton variant="ghost" :label="i18n.baseText('generic.retry')" @click="load" />
				</N8nCallout>
				<N8nText v-else-if="loading" role="status" color="text-light">{{
					i18n.baseText('settings.context.sources.details.loading')
				}}</N8nText>
				<N8nText v-else-if="!skills.length" color="text-light">{{
					i18n.baseText('settings.context.sources.details.empty')
				}}</N8nText>
				<N8nButton
					v-else-if="skills.length < count"
					variant="ghost"
					:label="i18n.baseText('settings.context.sources.details.loadMore')"
					@click="load"
				/>
			</section>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:href="source.webUrl"
				target="_blank"
				rel="noopener noreferrer"
				:label="i18n.baseText('settings.context.sources.openGithub')"
			/>
			<N8nButton
				v-if="source.canAddSkills"
				:label="i18n.baseText('settings.context.skills.more.title')"
				data-test-id="skill-source-details-add-more"
				@click="emit('addMore')"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.header {
	border-bottom: var(--border);
}
.body {
	--n8n-dialog-body--padding-block-start: var(--spacing--lg);
	gap: var(--spacing--lg);
}
.source,
.repository,
.sectionHeading {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
.source {
	flex-wrap: wrap;
}
.repository {
	flex: 1;
	min-width: 0;
}
.name {
	overflow-wrap: anywhere;
}
.icon {
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	flex-shrink: 0;
}
.scope {
	flex-shrink: 0;
}
.sectionHeading {
	justify-content: space-between;
}
.skills,
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.list {
	list-style: none;
	margin: 0;
	padding: 0;
}
.skill {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--sm);
	overflow-wrap: anywhere;
}
</style>
