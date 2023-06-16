<template>
	<fragment></fragment>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { ElNotificationComponent } from 'element-ui/types/notification';
import { sanitizeHtml } from '@/utils';
import { useToast } from '@/composables';

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
			...useToast(),
		};
	},
	data() {
		return {
			alert: null as null | ElNotificationComponent,
		};
	},
	mounted() {
		this.alert = this.showAlert({
			title: '',
			message: sanitizeHtml(this.message),
			type: 'warning',
			duration: 0,
			showClose: true,
			dangerouslyUseHTMLString: true,
			customClass: this.popupClass || '',
		});
	},
	beforeDestroy() {
		if (this.alert) {
			this.alert.close();
		}
	},
});
</script>
