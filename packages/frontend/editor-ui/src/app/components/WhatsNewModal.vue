<script setup lang="ts">
import dateformat from 'dateformat';
import { useI18n } from '@n8n/i18n';
import { RELEASE_NOTES_URL, VERSIONS_MODAL_KEY, WHATS_NEW_MODAL_KEY } from '@/app/constants';
import { useVersionsStore } from '@n8n/stores/versions.store';
import { computed, nextTick, ref, watch } from 'vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@n8n/stores/users.store';

import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogHeader,
	N8nDialogTitle,
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
const versionsStore = useVersionsStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();
const modalOpen = computed(() => uiStore.modalsById[WHATS_NEW_MODAL_KEY]?.open === true);

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

function onModalOpened() {
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
}

watch(
	modalOpen,
	(open) => {
		if (open) onModalOpened();
	},
	{ immediate: true },
);

async function closeDialog() {
	uiStore.closeModal(WHATS_NEW_MODAL_KEY);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}
</script>

<template>
	<N8nDialog :open="modalOpen" size="2xlarge" @update:open="onDialogOpenUpdate">
		<N8nDialogHeader>
			<div :class="$style.column">
				<div :class="$style.row">
					<N8nIcon :icon="'bell'" :color="'primary'" :size="'large'" />
					<N8nDialogTitle>
						{{ versionsStore.whatsNew.title }}
					</N8nDialogTitle>
				</div>

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
		</N8nDialogHeader>
		<N8nDialogBody>
			<div :class="$style.scrollBody">
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
						v-if="versionsStore.whatsNew.footer"
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
			</div>
		</N8nDialogBody>
	</N8nDialog>
</template>

<style lang="scss" module>
.scrollBody {
	overflow: auto;
	max-height: calc(85vh - var(--spacing--3xl));
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
	margin-bottom: 0;

	// Collapse the trailing spacing of the last block (article or footer) and its innermost element
	> :last-child {
		margin-bottom: 0;
		padding-bottom: 0;

		:last-child {
			margin-bottom: 0;
		}
	}
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

	img {
		margin: var(--spacing--sm) 0;
	}
}
</style>
