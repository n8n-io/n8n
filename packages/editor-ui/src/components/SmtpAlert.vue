<template>
	<n8n-alert v-if="!isSmtpSetup" type="error" :closable="false">
		SMTP credentials are not set up. n8n cannot send emails until this is resolved.
		<n8n-link to="https://docs.n8n.io/reference/environment-variables.html#user-management" :newWindow="true" size="small">More info</n8n-link>
	</n8n-alert>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from 'vuex';

export default Vue.extend({
	name: 'SmtpAlert',
	computed: {
		...mapGetters('settings', ['isSmtpSetup']),
	},
});
</script>
