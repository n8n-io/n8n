<script setup lang="ts">
import type { AppResponse } from '@n8n/api-types';
import { N8nHeading, N8nIconButton, N8nPopover } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import AppLinkField from './AppLinkField.vue';
import AppProjectAccessNote from './AppProjectAccessNote.vue';

defineProps<{ app: AppResponse; url: string }>();

const i18n = useI18n();
</script>

<template>
	<N8nPopover side="bottom" align="end" width="400px" data-test-id="app-share">
		<template #trigger>
			<N8nIconButton
				variant="outline"
				icon="link"
				:aria-label="i18n.baseText('apps.share.ariaLabel')"
				data-test-id="app-share-trigger"
			/>
		</template>
		<template #content>
			<div :class="$style.content" data-test-id="app-share-content">
				<N8nHeading tag="h3" size="medium" color="text-dark">{{ app.name }}</N8nHeading>
				<AppLinkField :url="url" />
				<AppProjectAccessNote />
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
}
</style>
