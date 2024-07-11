<script setup lang="ts">
interface Props {
	title: string;
	content: string;
	replacing: boolean;
	replaced: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	replacing: false,
	replaced: false,
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.title">
			{{ props.title }}
		</div>
		<div>
			{{ props.content }}
		</div>
		<div>
			<n8n-button type="primary" size="mini">Replace my code</n8n-button>
			<!-- <button>Undo</button> -->
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	border: var(--border-base);
	background-color: var(--color-foreground-xlight);
	border-radius: 4px;
}

.title {
	padding: 8px;
	font-weight: 600;
	font-size: 12px;
}
</style>
