<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { N8nText } from '@n8n/design-system';
import { type ITaskData } from 'n8n-workflow';
import { computed } from 'vue';

const { title, data } = defineProps<{ title: string; data: ITaskData }>();

const locale = useI18n();
const itemCount = computed(() => (Object.values(data.data ?? {})[0] ?? []).length);
</script>

<template>
	<div :class="$style.container">
		<header :class="$style.header">
			<N8nText :class="$style.title" size="small" color="text-light" :bold="true">
				{{ title }}
			</N8nText>
			<N8nText size="small" color="text-light" :bold="true">
				{{
					locale.baseText('logs.details.body.itemCount', {
						interpolate: { count: itemCount },
					})
				}}
			</N8nText>
		</header>
	</div>
</template>

<style lang="scss" module>
.container {
	padding: var(--spacing-s);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.title {
	text-transform: uppercase;
	letter-spacing: 3px;
}
</style>
