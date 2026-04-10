<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { ElCollapseTransition } from 'element-plus';

import { useClipboard } from '@/app/composables/useClipboard';
import { useToast } from '@/app/composables/useToast';
import type { WebhookDisplayData } from '@/features/setupPanel/composables/useWebhookUrls';

defineProps<{
	urls: WebhookDisplayData[];
}>();

const i18n = useI18n();
const clipboard = useClipboard();
const toast = useToast();

const isCollapsed = ref(false);

function copyUrl(url: string) {
	void clipboard.copy(url);
	toast.showMessage({
		title: i18n.baseText('setupPanel.webhookUrl.copied'),
		type: 'success',
	});
}
</script>

<template>
	<div data-test-id="webhook-url-preview" :class="$style.container">
		<div
			:class="[$style.header, { [$style.expanded]: !isCollapsed }]"
			@click="isCollapsed = !isCollapsed"
		>
			<N8nIcon icon="chevron-right" :class="$style['chevron-icon']" />
			<span :class="$style['header-label']">
				{{ i18n.baseText('setupPanel.webhookUrl.title') }}
			</span>
		</div>
		<ElCollapseTransition>
			<div v-if="!isCollapsed" :class="$style['url-list']">
				<N8nTooltip
					v-for="(item, index) in urls"
					:key="index"
					:content="i18n.baseText('setupPanel.webhookUrl.clickToCopy')"
					placement="top"
				>
					<div
						data-test-id="webhook-url-item"
						:class="$style['url-row']"
						@click="copyUrl(item.url)"
					>
						<span v-if="item.isMethodVisible" :class="$style['method-badge']">
							{{ item.httpMethod }}
						</span>
						<span :class="$style['url-text']">{{ item.url }}</span>
					</div>
				</N8nTooltip>
			</div>
		</ElCollapseTransition>
	</div>
</template>

<style module lang="scss">
.container {
	padding: 0 var(--spacing--xs);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	cursor: pointer;
	user-select: none;
}

.chevron-icon {
	font-size: var(--font-size--xs);
	transition: transform 200ms ease;

	.expanded & {
		transform: rotate(90deg);
	}
}

.header-label {
	font-size: var(--font-size--2xs);
}

.url-list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--4xs);
	margin-left: var(--spacing--sm);
}

.url-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius--sm);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	cursor: pointer;
}

.method-badge {
	background-color: var(--color--foreground--shade-2);
	color: var(--color--foreground--tint-2);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	border-radius: var(--radius--sm);
	padding: 0 var(--spacing--4xs);
	line-height: var(--spacing--sm);
	text-align: center;
	flex-shrink: 0;
}

.url-text {
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
	word-break: break-all;
	line-height: var(--line-height--xl);
	flex: 1;
}
</style>
