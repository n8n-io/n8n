<template>
	<span></span>
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
		if (this.isSmtpSetup) {
			return;
		}
		this.alert = this.$showAlert({
			message: `Set up SMTP before adding users (so that n8n can send them invitation emails). <a target="_blank" href="https://docs.n8n.io/reference/user-management#smtp">Instructions</a>`,
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
