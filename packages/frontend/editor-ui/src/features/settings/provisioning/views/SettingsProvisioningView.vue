<script lang="ts" setup>
import { onMounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { N8nHeading, N8nText } from '@n8n/design-system';

const i18n = useI18n();
const documentTitle = useDocumentTitle();

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.provisioning.title'));
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nHeading size="2xlarge">{{ i18n.baseText('settings.provisioning.title') }}</N8nHeading>
		</div>

		<div :class="$style.content">
			<N8nText color="text-light">
				{{ i18n.baseText('settings.provisioning.description' as any) }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	padding-bottom: 100px;

	> * {
		margin-bottom: var(--spacing--2xl);
	}
}

.header {
	display: flex;
	align-items: center;
	white-space: nowrap;
	margin-bottom: var(--spacing--xl);

	*:first-child {
		flex-grow: 1;
	}
}

.content {
	max-width: 800px;
}
</style>
