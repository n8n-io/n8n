<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	startTime: Date;
}>();

const i18n = useI18n();

const nowTime = ref(-1);
const intervalTimer = ref<NodeJS.Timeout | null>(null);

const time = computed(() => {
	if (!props.startTime) {
		return '...';
	}
	const msPassed = nowTime.value - new Date(props.startTime).getTime();
	return i18n.displayTimer(msPassed);
});

onMounted(() => {
	setNow();
	intervalTimer.value = setInterval(() => {
		setNow();
	}, 1000);
});

onBeforeUnmount(() => {
	// Make sure that the timer gets destroyed once no longer needed
	if (intervalTimer.value !== null) {
		clearInterval(intervalTimer.value);
	}
});

function setNow() {
	nowTime.value = new Date().getTime();
}
</script>

<template>
	<span>
		{{ time }}
	</span>
</template>
