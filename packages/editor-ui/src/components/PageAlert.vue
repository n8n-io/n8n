<template>
	<span></span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { showMessage } from '@/mixins/showMessage';
import type { MessageInstance } from 'element-plus';
import { sanitizeHtml } from '@/utils';

export default defineComponent({
	name: 'PageAlert',
	mixins: [showMessage],

	props: {
		message: {
			type: String,
			required: true,
		},
		popupClass: {
			type: String,
		},
	},
	data() {
		return {
			alert: null as null | MessageInstance,
		};
	},
	mounted() {
		this.alert = this.$showAlert({
			message: sanitizeHtml(this.message),
			type: 'warning',
			duration: 0,
			showClose: true,
			dangerouslyUseHTMLString: true,
			// @ts-ignore
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
