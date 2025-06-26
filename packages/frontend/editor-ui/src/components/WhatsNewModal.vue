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
import { computed, onMounted, ref } from 'vue';
import { useTelemetry } from '@/composables/useTelemetry';
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
const telemetry = useTelemetry();

const nextVersions = computed(() => versionsStore.nextVersions);

const openUpdatesPanel = () => {
	uiStore.openModal(VERSIONS_MODAL_KEY);
};

const onUpdateClick = async () => {
	telemetry.track('User clicked on update button', {
		source: 'whats-new-modal',
	});

	await pageRedirectionHelper.goToVersions();
};

modalBus.on('opened', () => {
	const articleIndex = versionsStore.whatsNewArticles.findIndex(
		(article) => article.id === props.data.articleId,
	);

	scroller.value?.scrollToItem(articleIndex);
});

onMounted(() => {
	// Mark all items as read when the modal is opened.
	// Later versions of the What's new articles might contain partially same items,
	// but we only want to show the new ones as unread on the main sidebar.
	for (const item of versionsStore.whatsNewArticles) {
		if (!versionsStore.isWhatsNewArticleRead(item.id)) {
			versionsStore.setWhatsNewArticleRead(item.id);
		}
	}
});
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
						<N8nHeading size="xlarge">
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
							<template v-if="versionsStore.hasVersionUpdates">
								<N8nText :size="'medium'" :class="$style.text" :color="'text-base'">•</N8nText>
								<N8nLink
									size="medium"
									theme="primary"
									data-test-id="whats-new-modal-next-versions-link"
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
							</template>
						</div>
					</div>
				</div>

				<n8n-button
					:size="'large'"
					:label="i18n.baseText('whatsNew.update')"
					:disabled="!versionsStore.hasVersionUpdates"
					data-test-id="whats-new-modal-update-button"
					@click="onUpdateClick"
				/>
			</div>
		</template>
		<template #content>
			<div :class="$style.container">
				<DynamicScroller
					ref="scroller"
					:min-item-size="10"
					:items="versionsStore.whatsNewArticles"
					class="full-height scroller"
					style="max-height: 80vh"
				>
					<template #before>
						<N8nCallout
							v-if="versionsStore.hasVersionUpdates"
							:class="$style.callout"
							theme="warning"
						>
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
					<template #default="{ item, index, active }">
						<DynamicScrollerItem
							:item="item"
							:active="active"
							:size-dependencies="[item.content]"
							:data-index="index"
						>
							<div :class="$style.article" :data-test-id="`whats-new-article-${item.id}`">
								<N8nHeading bold tag="h2" size="xlarge">
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
	padding-bottom: var(--spacing-s);
}

:global(.el-dialog__header) {
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
