<template>
	<span v-show="false" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { NotificationHandle } from 'element-plus';
import { sanitizeHtml } from '@/utils/htmlUtils';
import { useToast } from '@/composables/useToast';

export default defineComponent({
	name: 'PageAlert',
	props: {
		message: {
			type: String,
			required: true,
		},
		popupClass: {
			type: String,
		},
	},
	setup() {
		return {
			toast: useToast(),
		};
	},
	data() {
		return {
			alert: null as NotificationHandle | null,
		};
	},
	mounted() {
		this.alert = this.toast.showAlert({
			title: '',
			message: sanitizeHtml(this.message),
			type: 'warning',
			duration: 0,
			showClose: true,
			dangerouslyUseHTMLString: true,
			customClass: this.popupClass || '',
		});
	},
	beforeUnmount() {
		if (this.alert) {
			this.alert.close();
		}
	},
});
</script>
