<script lang="ts" setup>
interface Props {
	theme?: string;
	customIcon?: string;
	dismissible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	theme: 'info',
	dismissible: true,
});

const emit = defineEmits(['close']);

function onCloseClick() {
	emit('close');
}
</script>
<template>
	<n8n-callout :theme="props.theme" :icon="props.customIcon" :roundCorners="false">
		<div :class="$style.mainContent">
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
.trailingContent {
	display: flex;
	align-items: center;
	gap: var(--spacing-l);
}
</style>
