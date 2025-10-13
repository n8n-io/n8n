<script setup lang="ts">
import dateformat from 'dateformat';
import { useI18n } from '@n8n/i18n';
import { RELEASE_NOTES_URL, VERSIONS_MODAL_KEY, WHATS_NEW_MODAL_KEY } from '@/constants';
import { createEventBus } from '@n8n/utils/event-bus';
import { useVersionsStore } from '@/stores/versions.store';
import { computed, nextTick, ref } from 'vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import Modal from '@/components/Modal.vue';

import {
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nMarkdown,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
const props = defineProps<{
	modalName: string;
	data: {
		articleId: number;
	};
}>();

const articleRefs = ref<Record<number, HTMLElement>>({});
const pageRedirectionHelper = usePageRedirectionHelper();

const i18n = useI18n();
const modalBus = createEventBus();
const versionsStore = useVersionsStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
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

const scrollToItem = async (articleId: number) => {
	await nextTick(() => {
		const target = articleRefs.value[articleId];

		if (!target) return;

		target.scrollIntoView({
			behavior: 'smooth',
			block: 'start',
		});
	});
};

modalBus.on('opened', () => {
	versionsStore.closeWhatsNewCallout();

	// Mark all items as read when the modal is opened.
	// What's new articles on later weeks might contain partially same items,
	// but we only want to show the new ones as unread on the main sidebar.
	for (const item of versionsStore.whatsNewArticles) {
		if (!versionsStore.isWhatsNewArticleRead(item.id)) {
			versionsStore.setWhatsNewArticleRead(item.id);
		}
	}

	void scrollToItem(props.data.articleId);
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
							{{ versionsStore.whatsNew.title }}
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

				<N8nTooltip
					v-if="versionsStore.hasVersionUpdates"
					:disabled="usersStore.canUserUpdateVersion"
					:content="i18n.baseText('whatsNew.updateNudgeTooltip')"
					placement="bottom"
				>
					<N8nButton
						:size="'large'"
						:label="i18n.baseText('whatsNew.update')"
						:disabled="!usersStore.canUserUpdateVersion"
						data-test-id="whats-new-modal-update-button"
						@click="onUpdateClick"
					/>
				</N8nTooltip>
			</div>
		</template>
		<template #content>
			<div :class="$style.container">
				<N8nCallout
					v-if="versionsStore.hasSignificantUpdates"
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
								:to="RELEASE_NOTES_URL"
								target="_blank"
							>
								{{ i18n.baseText('whatsNew.updateAvailable.changelogLink') }}
							</N8nLink>
						</N8nText>
					</slot>
				</N8nCallout>
				<div
					v-for="item in versionsStore.whatsNewArticles"
					:ref="
						(el: any) => {
							if (el) articleRefs[item.id] = el as HTMLElement;
						}
					"
					:key="item.id"
					:class="$style.article"
					:data-test-id="`whats-new-item-${item.id}`"
				>
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
				<N8nMarkdown
					:content="versionsStore.whatsNew.footer"
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
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-bottom: var(--border);
	padding-bottom: var(--spacing--sm);
}

:global(.el-dialog__header) {
	padding-bottom: var(--spacing--sm);
}

.column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--2xs);
}

.container {
	margin-bottom: var(--spacing--lg);
}

.article {
	padding: var(--spacing--sm) 0;
}

.markdown {
	margin: var(--spacing--sm) 0;

	p,
	strong,
	em,
	s,
	code,
	a,
	li {
		font-size: var(--font-size--sm);
	}

	hr {
		margin-bottom: var(--spacing--sm);
	}
}
</style>
