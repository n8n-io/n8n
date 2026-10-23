<script setup lang="ts">
import { INBOX_VIEW } from '@n8n/frontend-module-inbox';
import { N8nEmptyState } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const i18n = useI18n();
const router = useRouter();
const rbacStore = useRBACStore();
const settingsStore = useSettingsStore();

// The link opens the Inbox list. Opening the Inbox also refreshes a stale review state.
const canOpenInbox = computed(
	() =>
		settingsStore.settings.inbox?.enabled === true &&
		rbacStore.hasScope('gitConnection:readReviews'),
);

async function openInbox() {
	await router.push({ name: INBOX_VIEW });
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
