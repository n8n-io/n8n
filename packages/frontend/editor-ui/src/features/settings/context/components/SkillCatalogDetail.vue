<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { SkillCatalogDetail, SkillCatalogItem, SkillCatalogView } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nMarkdown,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';

import { getSkillCatalogDetail } from '../skills.api';
import { categoryLabel } from '../skillCatalog.utils';

const props = defineProps<{
	item: SkillCatalogItem;
	projectId?: string;
	view?: SkillCatalogView;
	busy: boolean;
	saved: boolean;
	canSave: boolean;
	canTry: boolean;
}>();
defineEmits<{ back: []; save: []; try: [] }>();
const i18n = useI18n();
const rootStore = useRootStore();
const detail = ref<SkillCatalogDetail>();
const loading = ref(false);
const failed = ref(false);
const tab = ref('overview');
const selectedFile = ref('SKILL.md');
let request = 0;
onBeforeUnmount(() => {
	request += 1;
});
const tabs = computed(() => [
	{ value: 'overview', label: i18n.baseText('settings.context.skills.catalog.overview') },
	{ value: 'instructions', label: i18n.baseText('settings.context.skills.catalog.instructions') },
	{ value: 'files', label: i18n.baseText('settings.context.skills.catalog.files') },
]);
const file = computed(() => detail.value?.files.find((entry) => entry.path === selectedFile.value));
const extraFiles = computed(
	() => detail.value?.files.filter((entry) => !entry.supported).length ?? 0,
);
const date = (value: string) => new Date(value).toLocaleDateString();

async function load() {
	const run = ++request;
	loading.value = true;
	failed.value = false;
	detail.value = undefined;
	try {
		const result = await getSkillCatalogDetail(
			rootStore.restApiContext,
			props.item.id,
			props.projectId,
		);
		if (run === request) detail.value = result;
	} catch {
		if (run === request) failed.value = true;
	} finally {
		if (run === request) loading.value = false;
	}
}
watch(
	() => props.item.id,
	() => {
		tab.value = 'overview';
		selectedFile.value = 'SKILL.md';
		void load();
	},
	{ immediate: true },
);
</script>

<template>
	<section :class="$style.detail" data-test-id="skill-catalog-detail" :aria-busy="loading">
		<div>
			<N8nButton
				variant="outline"
				icon="arrow-left"
				data-attr="skill-catalog-back"
				@click="$emit('back')"
				>{{ i18n.baseText('settings.context.skills.catalog.back') }}</N8nButton
			>
		</div>
		<header :class="$style.header">
			<div :class="$style.identity">
				<div :class="$style.tags">
					<N8nBadge>{{
						categoryLabel(detail?.category ?? item.category ?? 'other', i18n)
					}}</N8nBadge
					><N8nBadge v-if="item.isOfficial">{{
						i18n.baseText('settings.context.skills.catalog.official')
					}}</N8nBadge>
				</div>
				<N8nHeading tag="h2" size="xlarge">{{ detail?.name ?? item.name }}</N8nHeading>
				<a :href="item.githubUrl" target="_blank" rel="noopener noreferrer" :class="$style.source"
					>{{ item.source }} <N8nIcon icon="external-link" size="small"
				/></a>
			</div>
			<div :class="$style.actions">
				<N8nButton
					variant="outline"
					:disabled="busy || !canTry"
					data-test-id="skill-detail-try"
					data-attr="skill-detail-try"
					@click="$emit('try')"
					>{{ i18n.baseText('settings.context.skills.catalog.try') }}</N8nButton
				><N8nButton
					:disabled="busy || !canSave || saved"
					data-test-id="skill-detail-save"
					data-attr="skill-detail-save"
					@click="$emit('save')"
					>{{
						i18n.baseText(
							saved
								? 'settings.context.skills.catalog.saved'
								: 'settings.context.skills.catalog.save',
						)
					}}</N8nButton
				>
			</div>
		</header>
		<N8nCallout v-if="failed" theme="warning" data-test-id="skill-detail-error"
			>{{ i18n.baseText('settings.context.skills.catalog.detailError') }}
			<N8nButton variant="outline" @click="load">{{
				i18n.baseText('settings.context.skills.catalog.retry')
			}}</N8nButton></N8nCallout
		>
		<div :class="$style.columns">
			<main :class="$style.main">
				<N8nTabs v-model="tab" :options="tabs" variant="modern" data-test-id="skill-detail-tabs" />
				<N8nMarkdown v-if="loading" :loading="true" />
				<template v-else-if="detail">
					<div v-if="tab === 'overview'" :class="$style.sections">
						<section>
							<N8nHeading tag="h3" size="medium">{{
								i18n.baseText('settings.context.skills.catalog.about')
							}}</N8nHeading
							><N8nText tag="p">{{ detail.description }}</N8nText>
						</section>
						<section>
							<N8nHeading tag="h3" size="medium">{{
								i18n.baseText('settings.context.skills.catalog.requirements')
							}}</N8nHeading
							><N8nText tag="p">{{
								detail.compatibility ??
								i18n.baseText('settings.context.skills.catalog.requirementsUnknown')
							}}</N8nText
							><N8nText v-if="detail.allowedTools" tag="p"
								>{{ i18n.baseText('settings.context.skills.catalog.declaredTools') }}
								{{ detail.allowedTools }}</N8nText
							>
						</section>
						<N8nCallout v-if="extraFiles" theme="warning" data-test-id="skill-detail-extra-files">{{
							i18n.baseText('settings.context.skills.catalog.extraFiles', {
								interpolate: { count: extraFiles },
								adjustToNumber: extraFiles,
							})
						}}</N8nCallout>
						<section>
							<N8nHeading tag="h3" size="medium">{{
								i18n.baseText('settings.context.skills.catalog.audits')
							}}</N8nHeading>
							<div v-if="detail.audits?.length" :class="$style.sections">
								<div v-for="audit in detail.audits" :key="audit.provider" :class="$style.audit">
									<div :class="$style.auditHeading">
										<N8nText bold>{{ audit.provider }}</N8nText
										><N8nBadge>{{ audit.status }}</N8nBadge>
									</div>
									<N8nText tag="p">{{ audit.summary }}</N8nText
									><N8nText size="small" color="text-light">{{ date(audit.auditedAt) }}</N8nText>
								</div>
							</div>
							<N8nText v-else tag="p" color="text-light">{{
								i18n.baseText('settings.context.skills.catalog.auditsUnavailable')
							}}</N8nText
							><N8nText v-if="detail.audits?.length" tag="p" size="small" color="text-light">{{
								i18n.baseText('settings.context.skills.catalog.auditNotice')
							}}</N8nText>
						</section>
					</div>
					<N8nMarkdown
						v-else-if="tab === 'instructions'"
						:content="detail.instructions"
						data-test-id="skill-detail-instructions"
					/>
					<div v-else :class="$style.sections">
						<N8nText color="text-light">{{
							i18n.baseText('settings.context.skills.catalog.fileNotice')
						}}</N8nText>
						<div :class="$style.fileList">
							<button
								v-for="entry in detail.files"
								:key="entry.path"
								:class="[$style.fileButton, { [$style.fileSelected]: selectedFile === entry.path }]"
								:aria-pressed="selectedFile === entry.path"
								data-attr="skill-detail-file"
								@click="selectedFile = entry.path"
							>
								<span>{{ entry.path }}</span
								><N8nText v-if="!entry.supported" size="small" color="text-light">{{
									i18n.baseText('settings.context.skills.catalog.extraFile')
								}}</N8nText>
							</button>
						</div>
						<pre v-if="file" :class="$style.fileContent" data-test-id="skill-detail-file-content">{{
							file.content
						}}</pre>
					</div>
				</template>
			</main>
			<aside :class="$style.sidebar">
				<div v-if="item.installs !== undefined" :class="$style.stat">
					<N8nIcon icon="download" /><N8nHeading tag="div" size="large">{{
						item.installs.toLocaleString()
					}}</N8nHeading
					><N8nText size="small" color="text-light">{{
						i18n.baseText(
							view === 'trending'
								? 'settings.context.skills.catalog.recentInstalls'
								: 'settings.context.skills.catalog.totalInstalls',
						)
					}}</N8nText>
				</div>
				<div v-if="detail?.repository" :class="$style.stat">
					<N8nIcon icon="star" /><N8nHeading tag="div" size="large">{{
						detail.repository.stars.toLocaleString()
					}}</N8nHeading
					><N8nText size="small" color="text-light">{{
						i18n.baseText('settings.context.skills.catalog.repoStars')
					}}</N8nText>
				</div>
				<div v-if="detail" :class="$style.facts">
					<N8nHeading tag="h3" size="small">{{
						i18n.baseText('settings.context.skills.catalog.detailsTitle')
					}}</N8nHeading
					><N8nText tag="p">{{
						i18n.baseText('settings.context.skills.catalog.fileCount', {
							interpolate: { count: detail.files.length },
							adjustToNumber: detail.files.length,
						})
					}}</N8nText
					><N8nText tag="p" color="text-light">{{
						i18n.baseText('settings.context.skills.catalog.license')
					}}</N8nText
					><N8nText tag="p">{{
						detail.license ?? i18n.baseText('settings.context.skills.catalog.notSpecified')
					}}</N8nText
					><template v-if="detail.repository"
						><N8nText tag="p" color="text-light">{{
							i18n.baseText('settings.context.skills.catalog.repoUpdated')
						}}</N8nText
						><N8nText tag="p">{{ date(detail.repository.updatedAt) }}</N8nText
						><N8nBadge v-if="detail.repository.archived">{{
							i18n.baseText('settings.context.skills.catalog.archived')
						}}</N8nBadge></template
					>
					<div v-if="detail.repository?.topics.length" :class="$style.tags">
						<N8nBadge v-for="topic in detail.repository.topics.slice(0, 8)" :key="topic">{{
							topic
						}}</N8nBadge>
					</div>
				</div>
				<N8nText tag="p" size="small" color="text-light">{{
					i18n.baseText('settings.context.skills.catalog.trialHint')
				}}</N8nText>
				<a :href="item.catalogUrl" target="_blank" rel="noopener noreferrer"
					>{{ i18n.baseText('settings.context.skills.catalog.originalListing') }}
					<N8nIcon icon="external-link" size="small"
				/></a>
				<N8nText v-if="detail" size="small" color="text-light">{{
					i18n.baseText('settings.context.skills.catalog.fetched', {
						interpolate: { date: date(detail.fetchedAt) },
					})
				}}</N8nText>
			</aside>
		</div>
	</section>
</template>

<style module lang="scss">
.detail,
.identity,
.main,
.sections,
.sidebar,
.facts {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	min-width: 0;
}
.header {
	display: flex;
	width: 100%;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--xl);
}
.identity {
	gap: var(--spacing--sm);
}
.tags,
.actions,
.source,
.auditHeading {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}
.actions {
	flex-shrink: 0;
}
.columns {
	display: grid;
	grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
	gap: var(--spacing--2xl);
}
.main {
	overflow-wrap: anywhere;
}
.sections section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.sidebar {
	border-left: var(--border);
	padding-left: var(--spacing--xl);
	gap: var(--spacing--md);
	overflow-wrap: anywhere;
}
.stat {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	border-bottom: var(--border);
	padding-bottom: var(--spacing--md);
}
.facts {
	gap: var(--spacing--xs);
}
.audit {
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--md);
}
.auditHeading {
	justify-content: space-between;
	margin-bottom: var(--spacing--xs);
}
.fileList {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}
.fileButton {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	background: var(--background--surface);
	color: var(--color--text);
	border: none;
	text-align: left;
	cursor: pointer;
	overflow-wrap: anywhere;
}
.fileButton:hover,
.fileSelected {
	background: var(--background--subtle);
}
.fileContent {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	background: var(--background--subtle);
	padding: var(--spacing--md);
	border-radius: var(--radius--lg);
	font-size: var(--font-size--sm);
}
@media (max-width: 768px) {
	.header {
		flex-direction: column;
	}
	.columns {
		grid-template-columns: minmax(0, 1fr);
	}
	.sidebar {
		border-left: none;
		border-top: var(--border);
		padding-left: 0;
		padding-top: var(--spacing--lg);
	}
}
</style>
