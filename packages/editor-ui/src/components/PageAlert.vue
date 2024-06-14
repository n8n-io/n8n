<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useToast } from '@/composables/useToast';
import { sanitizeHtml } from '@/utils/htmlUtils';
interface Props {
	message: string;
	popupClass?: string;
}

const props = defineProps<Props>();

const toast = useToast();
const alert = ref<{ close: () => void } | null>(null);

onMounted(() => {
	alert.value = toast.showAlert({
		title: '',
		message: sanitizeHtml(props.message),
		type: 'warning',
		duration: 0,
		showClose: true,
		dangerouslyUseHTMLString: true,
		customClass: props.popupClass ?? '',
	});
});

onBeforeUnmount(() => {
	if (alert.value) {
		alert.value.close();
	}
});
</script>

<template>
	<span v-show="false" />
</template>
