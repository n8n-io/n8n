<script setup lang="ts">
import { N8nButton, N8nCallout, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { BUILT_IN_MCP_BANNER_CALLOUT, MCP_SETTINGS_ROUTE } from '../mcp-servers.constants';

// Points builders to the instance-level n8n MCP settings. Dismissing hides it permanently
// for the signed-in user through their saved callout dismissals.
const i18n = useI18n();
const router = useRouter();
const usersStore = useUsersStore();

const dismissedLocally = ref(false);
const visible = computed(
	() => !dismissedLocally.value && !usersStore.isCalloutDismissed(BUILT_IN_MCP_BANNER_CALLOUT),
);

function openSettings() {
	void router.push({ name: MCP_SETTINGS_ROUTE });
}

function dismiss() {
	dismissedLocally.value = true;
	usersStore.setCalloutDismissed(BUILT_IN_MCP_BANNER_CALLOUT);
	void usersStore
		.updateUserSettings({
			dismissedCallouts: {
				...usersStore.currentUser?.settings?.dismissedCallouts,
				[BUILT_IN_MCP_BANNER_CALLOUT]: true,
			},
		})
		.catch(() => {
			// Keep the banner hidden in this session even if persisting user settings fails.
		});
}
</script>

<template>
	<N8nCallout v-if="visible" theme="secondary" icon="mcp" data-test-id="builtin-mcp-banner">
		{{ i18n.baseText('mcpServers.builtInBanner.text') }}
		<template #trailingContent>
			<div :class="$style.trailing">
				<N8nButton
					variant="outline"
					size="small"
					:label="i18n.baseText('mcpServers.builtInBanner.action')"
					data-test-id="builtin-mcp-banner-action"
					@click="openSettings"
				/>
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="xsmall"
					:aria-label="i18n.baseText('generic.dismiss')"
					data-test-id="builtin-mcp-banner-dismiss"
					@click="dismiss"
				/>
			</div>
		</template>
	</N8nCallout>
</template>

<style lang="scss" module>
.trailing {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}
</style>
