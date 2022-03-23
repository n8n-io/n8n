<template>
	<fragment></fragment>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';

import { showMessage } from './mixins/showMessage';
import { ElMessageComponent } from 'element-ui/types/message';

export default mixins(
	showMessage,
).extend({
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
	data() {
		return {
			alert: null as null | ElMessageComponent,
		};
	},
	mounted() {
		this.alert = this.$showAlert({
			message: this.message,
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

