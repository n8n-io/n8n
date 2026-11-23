<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';

const emit = defineEmits<{
	open: [];
	dismiss: [];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nCard data-test-id="mcp-preferences-banner">
		<template #prepend>
			<N8nIcon icon="brain" size="large" color="text-base" />
		</template>
		<template #header>
			<N8nText tag="p" size="medium" bold color="text-dark">
				{{ i18n.baseText('settings.mcp.preferencesEntry.banner.title') }}
			</N8nText>
		</template>
		<N8nText tag="p" size="small" color="text-base">
			{{ i18n.baseText('settings.mcp.preferencesEntry.banner.description') }}
		</N8nText>
		<template #footer>
			<N8nButton
				:class="$style.button"
				variant="solid"
				size="small"
				:label="i18n.baseText('settings.mcp.preferencesEntry.banner.button')"
				data-test-id="mcp-preferences-banner-button"
				data-attr="mcp-preferences-banner-button"
				@click="emit('open')"
			/>
		</template>
		<template #append>
			<N8nButton
				variant="ghost"
				size="small"
				icon="x"
				icon-only
				:aria-label="i18n.baseText('generic.dismiss')"
				data-test-id="mcp-preferences-banner-dismiss"
				data-attr="mcp-preferences-banner-dismiss"
				@click="emit('dismiss')"
			/>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.button {
	margin-top: var(--spacing--xs);
}
</style>
