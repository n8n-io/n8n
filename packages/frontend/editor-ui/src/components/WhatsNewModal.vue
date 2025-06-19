<script setup lang="ts">
import {
	DynamicScroller,
	DynamicScrollerItem,
	type RecycleScrollerInstance,
} from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import dateformat from 'dateformat';
import { useI18n } from '@n8n/i18n';
import { VERSIONS_MODAL_KEY, WHATS_NEW_MODAL_KEY } from '@/constants';
import { N8nCallout, N8nHeading, N8nIcon, N8nLink, N8nMarkdown, N8nText } from '@n8n/design-system';
import { createEventBus } from '@n8n/utils/event-bus';
import { useVersionsStore } from '@/stores/versions.store';
import { computed, ref, watch } from 'vue';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useUIStore } from '@/stores/ui.store';

const props = defineProps<{
	modalName: string;
	data: {
		articleId: number;
	};
}>();

const pageRedirectionHelper = usePageRedirectionHelper();

const scroller = ref<RecycleScrollerInstance>();

const i18n = useI18n();
const modalBus = createEventBus();
const versionsStore = useVersionsStore();
const uiStore = useUIStore();

const nextVersions = computed(() => versionsStore.nextVersions);

const openUpdatesPanel = () => {
	uiStore.openModal(VERSIONS_MODAL_KEY);
};

const onUpdateClick = async () => {
	await pageRedirectionHelper.goToVersions();
};

watch(
	() => versionsStore.whatsNewArticles,
	(whatsNewArticles) => {
		for (const article of whatsNewArticles) {
			if (!versionsStore.isWhatsNewArticleRead(article.id)) {
				versionsStore.setWhatsNewArticleRead(article.id);
			}
		}
	},
	{ immediate: true },
);

watch(
	() => [scroller.value, props.data.articleId],
	() => {
		if (scroller.value) {
			const articleIndex = versionsStore.whatsNewArticles.findIndex(
				(article) => article.id === props.data.articleId,
			);

			setTimeout(() => {
				scroller.value?.scrollToItem(articleIndex);
			}, 100);
		}
	},
	{ immediate: true },
);
</script>

<template>
	<Modal
		max-width="860px"
		max-height="85vh"
		:event-bus="modalBus"
		:name="WHATS_NEW_MODAL_KEY"
		:center="true"
		:show-close="false"
	>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.row">
					<N8nIcon :icon="'bell'" :color="'primary'" :size="'large'" />
					<div :class="$style.column">
						<N8nHeading size="xlarge" data-test-id="whats-new-modal-title">
							{{
								i18n.baseText('whatsNew.modal.title', {
									interpolate: {
										version: versionsStore.latestVersion.name,
									},
								})
							}}
						</N8nHeading>

						<div :class="$style.row">
							<N8nHeading size="medium" color="text-light">{{
								dateformat(versionsStore.latestVersion.createdAt, `d mmmm, yyyy`)
							}}</N8nHeading>
							<N8nText :size="'medium'" :class="$style.text" :color="'text-base'">•</N8nText>
							<N8nLink
								v-if="versionsStore.hasVersionUpdates"
								size="medium"
								theme="primary"
								@click="openUpdatesPanel"
							>
								{{
									i18n.baseText('whatsNew.versionsBehind', {
										interpolate: {
											count: nextVersions.length > 99 ? '99+' : nextVersions.length,
										},
									})
								}}
							</N8nLink>
							<N8nLink v-else size="medium" theme="primary" @click="openUpdatesPanel">
								{{ i18n.baseText('whatsNew.upToDate') }}
							</N8nLink>
						</div>
					</div>
				</div>

				<n8n-button
					:size="'large'"
					:label="i18n.baseText('whatsNew.update')"
					:disabled="!versionsStore.hasVersionUpdates"
					@click="onUpdateClick"
				/>
			</div>

			<N8nCallout v-if="versionsStore.hasVersionUpdates" theme="warning">
				<slot name="callout-message">
					<N8nText size="small">
						{{
							i18n.baseText('whatsNew.updateAvailable', {
								interpolate: {
									currentVersion: versionsStore.currentVersion?.name ?? 'unknown',
									latestVersion: versionsStore.latestVersion?.name,
									count: nextVersions.length,
								},
							})
						}}
						<N8nLink
							:size="'small'"
							:underline="true"
							theme="primary"
							to="https://docs.n8n.io/release-notes/"
							target="_blank"
						>
							{{ i18n.baseText('whatsNew.updateAvailable.changelogLink') }}
						</N8nLink>
					</N8nText>
				</slot>
			</N8nCallout>
		</template>
		<template #content>
			<div :class="$style.container">
				<DynamicScroller
					ref="scroller"
					:min-item-size="100"
					:items="versionsStore.whatsNewArticles"
					class="full-height scroller"
					style="max-height: 80vh"
				>
					<template #default="{ item, index, active }">
						<DynamicScrollerItem
							:item="item"
							:active="active"
							:size-dependencies="[item.content]"
							:data-index="index"
						>
							<div :class="$style.article" :data-test-id="`whats-new-article-${item.id}`">
								<N8nHeading bold tag="h2" size="xlarge" data-test-id="whats-new-article-title">
									{{ item.title }}
								</N8nHeading>
								<N8nMarkdown
									:content="item.content"
									:class="$style.markdown"
									:options="{
										markdown: {
											html: true,
											linkify: true,
											typographer: true,
											breaks: true,
										},
										tasklists: {
											enabled: false,
										},
										linkAttributes: {
											attrs: {
												target: '_blank',
												rel: 'noopener',
											},
										},
										youtube: {
											width: '100%',
											height: '315',
										},
									}"
									data-test-id="whats-new-article-content"
								/>
							</div>
						</DynamicScrollerItem>
					</template>
				</DynamicScroller>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-bottom: var(--border-base);
	margin-bottom: var(--spacing-s);
	padding-bottom: var(--spacing-s);
}

.column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.row {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing-2xs);
}

.container {
	margin-bottom: var(--spacing-l);
}

.article {
	padding: var(--spacing-s) 0;
}

.markdown {
	margin: var(--spacing-s) 0;

	p,
	strong,
	em,
	s,
	code,
	a,
	li {
		font-size: var(--font-size-s);
	}

	hr {
		margin-bottom: var(--spacing-s);
	}
}
</style>
