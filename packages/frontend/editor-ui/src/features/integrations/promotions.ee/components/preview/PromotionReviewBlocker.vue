<script setup lang="ts">
import type { PromotionBlocker } from '@n8n/api-types';
import { INBOX_VIEW } from '@n8n/frontend-module-inbox';
import { N8nEmptyState } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

// The blocker carries the ID of the review. The link opens the Inbox list instead, because
// opening the Inbox also refreshes a stale review state. A deep link can use the ID later.
defineProps<{ blocker: PromotionBlocker }>();
const emit = defineEmits<{ navigate: [] }>();

const i18n = useI18n();
const router = useRouter();
const rbacStore = useRBACStore();

const canOpenInbox = computed(() => rbacStore.hasScope('gitConnection:readReviews'));

async function openInbox() {
	await router.push({ name: INBOX_VIEW });
	emit('navigate');
}
</script>

<template>
	<N8nEmptyState
		:icon="{ type: 'icon', value: 'git-branch' }"
		:heading="i18n.baseText('promotions.reviewBlocker.title')"
		:description="
			i18n.baseText(
				canOpenInbox ? 'promotions.reviewBlocker.description' : 'promotions.reviewBlocker.noAccess',
			)
		"
		:button-text="canOpenInbox ? i18n.baseText('promotions.reviewBlocker.link') : undefined"
		data-test-id="promotion-review-blocker"
		@click:button="openInbox"
	/>
</template>
