<template>
	<span></span>
	<!-- <n8n-alert v-if="!isSmtpSetup" type="error" :closable="false">
		SMTP credentials are not set up. n8n cannot send emails until this is resolved.
		<n8n-link to="https://docs.n8n.io/reference/environment-variables.html#user-management" :newWindow="true" size="small">More info</n8n-link>
	</n8n-alert> -->
</template>

<script lang="ts">
import { mapGetters } from 'vuex';
import mixins from 'vue-typed-mixins';

import { showMessage } from './mixins/showMessage';
import { ElMessageComponent } from 'element-ui/types/message';

export default mixins(
	showMessage,
).extend({
	name: 'SmtpAlert',
	data: {
		alert: null as null | ElMessageComponent,
	},
	mounted() {
		this.alert = this.$showAlert({
			message: `SMTP credentials are not set up. n8n cannot send emails until this is resolved. <a href="https://docs.n8n.io/reference/environment-variables.html#user-management" style="margin-right: 10px" target="_blank">More info</a>`,
			type: 'warning',
			duration: 0,
			showClose: true,
			dangerouslyUseHTMLString: true,
			// @ts-ignore
			customClass: this.$style['message'],
		});
	},
	beforeDestroy() {
		if (this.alert) {
			this.alert.close();
		}
	},
	computed: {
		...mapGetters('settings', ['isSmtpSetup']),
	},
});
</script>

<style lang="scss" module>
.message {
	left: calc(50% + 100px);
}
</style>
