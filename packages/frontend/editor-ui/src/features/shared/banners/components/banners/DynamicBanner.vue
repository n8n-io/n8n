<script setup lang="ts">
import { N8nMarkdown } from '@n8n/design-system';
import BaseBanner from './BaseBanner.vue';

interface Props {
	name: string;
	content: string;
	theme: 'info' | 'warning' | 'danger';
	isDismissible: boolean;
	dismissPermanently: boolean | null;
}

const props = defineProps<Props>();
</script>

<template>
	<BaseBanner
		:name="props.name"
		:theme="props.theme"
		:dismissible="props.isDismissible"
		:dismiss-permanently="props.dismissPermanently ?? false"
	>
		<template #mainContent>
			<N8nMarkdown :content="props.content" :class="$style.markdown" />
		</template>
	</BaseBanner>
</template>

<style lang="scss" module>
.markdown {
	p,
	strong,
	em,
	s,
	a {
		font-size: var(--font-size--2xs);
	}

	p {
		margin-bottom: 0;
	}
}
</style>
