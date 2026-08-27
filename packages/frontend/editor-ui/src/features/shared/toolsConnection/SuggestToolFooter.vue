<script setup lang="ts">
import { N8nExternalLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<div :class="$style.footer" data-test-id="suggest-tool-footer">
		<N8nText size="small" color="text-light">
			{{ i18n.baseText('tools.connection.suggestion.prompt') }}
		</N8nText>
		<N8nExternalLink :class="$style.link" href="https://google.com" size="small">
			{{ i18n.baseText('tools.connection.suggestion.action') }}
		</N8nExternalLink>
	</div>
</template>

<style lang="scss" module>
.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-shrink: 0;
	width: 100%;
	margin-top: auto;
	padding: var(--spacing--sm) var(--spacing--2xs);
	border-top: 1px solid var(--border-color);
}

.footer .link {
	color: var(--text-color);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	line-height: 1;

	&:hover {
		color: var(--color--primary);
		background: transparent;
	}
}
</style>
