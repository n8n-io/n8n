<script lang="ts" setup>
import { useUIStore } from '@/stores/ui.store';
import { computed, useSlots } from 'vue';
import type { BannerName } from 'n8n-workflow';

interface Props {
	name: BannerName;
	theme?: string;
	customIcon?: string;
	dismissible?: boolean;
}

const uiStore = useUIStore();
const slots = useSlots();

const props = withDefaults(defineProps<Props>(), {
	theme: 'info',
	dismissible: true,
});

const emit = defineEmits(['close']);

const hasTrailingContent = computed(() => {
	return !!slots.trailingContent;
});

async function onCloseClick() {
	await uiStore.dismissBanner(props.name);
	emit('close');
}
</script>
<template>
	<n8n-callout
		:theme="props.theme"
		:icon="props.customIcon"
		icon-size="medium"
		:round-corners="false"
		:data-test-id="`banners-${props.name}`"
	>
		<div :class="[$style.mainContent, !hasTrailingContent ? $style.keepSpace : '']">
			<slot name="mainContent" />
		</div>
		<template #trailingContent>
			<div :class="$style.trailingContent">
				<slot name="trailingContent" />
				<n8n-icon
					v-if="dismissible"
					size="small"
					icon="times"
					title="Dismiss"
					class="clickable"
					:data-test-id="`banner-${props.name}-close`"
					@click="onCloseClick"
				/>
			</div>
		</template>
	</n8n-callout>
</template>

<style lang="scss" module>
.mainContent {
	display: flex;
	gap: var(--spacing-4xs);
}

.keepSpace {
	padding: 5px 0;
}
.trailingContent {
	display: flex;
	align-items: center;
	gap: var(--spacing-l);
}

:global(.n8n-callout) {
	border-top: 0;
	border-left: 0;
	border-right: 0;
}
</style>
