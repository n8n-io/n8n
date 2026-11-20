<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';

const emit = defineEmits<{
	open: [];
	dismiss: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.banner" data-test-id="mcp-preferences-banner">
		<div :class="$style.icon">
			<N8nIcon icon="brain" size="medium" />
		</div>
		<div :class="$style.content">
			<N8nText tag="p" size="medium" bold color="text-dark">
				{{ i18n.baseText('settings.mcp.preferencesEntry.banner.title') }}
			</N8nText>
			<N8nText tag="p" size="small" color="text-base">
				{{ i18n.baseText('settings.mcp.preferencesEntry.banner.description') }}
			</N8nText>
			<N8nButton
				:class="$style.button"
				variant="solid"
				size="small"
				:label="i18n.baseText('settings.mcp.preferencesEntry.banner.button')"
				data-test-id="mcp-preferences-banner-button"
				data-attr="mcp-preferences-banner-button"
				@click="emit('open')"
			/>
		</div>
		<N8nButton
			variant="ghost"
			size="small"
			icon="x"
			icon-only
			:aria-label="i18n.baseText('settings.mcp.preferencesEntry.banner.dismiss')"
			data-test-id="mcp-preferences-banner-dismiss"
			data-attr="mcp-preferences-banner-dismiss"
			@click="emit('dismiss')"
		/>
	</div>
</template>

<style lang="scss" module>
.banner {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border: var(--border);
	border-radius: 50%;
	color: var(--color--text);
}

.content {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--4xs);
}

.button {
	margin-top: var(--spacing--2xs);
}
</style>
