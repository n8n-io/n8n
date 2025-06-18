<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { WHATS_NEW_MODAL_KEY } from '@/constants';
import { N8nMarkdown, N8nText } from '@n8n/design-system';
import { createEventBus } from '@n8n/utils/event-bus';
import { useVersionsStore } from '@/stores/versions.store';

const props = defineProps<{
	modalName: string;
	data: {
		articleId: number;
	};
}>();

const closeDialog = () => {
	modalBus.emit('close');
};

const i18n = useI18n();
const modalBus = createEventBus();
const versionsStore = useVersionsStore();
</script>

<template>
	<Modal
		max-width="860px"
		max-height="85vh"
		:title="
			i18n.baseText('whatsNew.modal.title', {
				interpolate: {
					version: versionsStore.latestVersion.name,
				},
			})
		"
		:event-bus="modalBus"
		:name="WHATS_NEW_MODAL_KEY"
		:center="true"
	>
		<template #content>
			<template v-for="article in versionsStore.whatsNewArticles" :key="article.id">
				<div :class="$style.row">
					<N8nText :size="'xlarge'" :bold="true" class="content">
						{{ article.title }}
					</N8nText>
					<N8nMarkdown
						:content="article.content"
						:data-test-id="`whats-new-article-${article.id}`"
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
		</template>

		<template #footer>
			<div class="action-buttons">
				<n8n-button
					float="right"
					:label="i18n.baseText('about.close')"
					data-test-id="close-about-modal-button"
					@click="closeDialog"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	font-size: var(--font-size-s);
	margin: var(--spacing-s) 0;
}

.footer {
	display: flex;
	gap: var(--spacing-2xs);
	justify-content: flex-end;
}
</style>
