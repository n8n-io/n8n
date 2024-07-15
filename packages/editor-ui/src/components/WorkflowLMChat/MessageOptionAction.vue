<template>
	<N8nTooltip :placement="placement">
		<button :class="$style.button" :style="{ color: '#aaa' }" @click="emit('click')">
			<N8nIcon :icon="icon" size="small" />
		</button>
		<template #content>
			{{ label }}
		</template>
	</N8nTooltip>
</template>

<script setup lang="ts">
const emit = defineEmits<{
	click: [];
}>();

defineProps<{
	label: string;
	icon: string;
	placement: 'left' | 'right' | 'top' | 'bottom';
}>();
</script>

<style module>
.button {
	background: none;
	border: none;
	cursor: pointer;
	padding: 0;
}
</style>
