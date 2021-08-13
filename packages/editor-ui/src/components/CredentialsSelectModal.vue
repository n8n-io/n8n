<template>
	<Modal
		:name="modalName"
		:eventBus="modalBus"
		size="sm"
	>
		<template slot="header">
			<div>Add new credential</div>
		</template>
		<template slot="content">
			<div :class="$style.container">
				<div>Select an app or service to connect to</div>
				<n8n-select
					filterable
					placeholder="Search for app..."
					@change="onSelect"
				>
					<font-awesome-icon icon="search" slot="prefix" />
					<n8n-option
						v-for="credential in allCredentials"
						:value="credential.name"
						:key="credential.name"
						:label="credential.displayName"
						filterable
					/>
				</n8n-select>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from "vuex";

import Modal from './Modal.vue';

export default Vue.extend({
	name: 'CredentialsSelectModal',
	components: {
		Modal,
	},
	data() {
		return {
			modalBus: new Vue(),
		};
	},
	computed: {
		...mapGetters('credentials', ['allCredentials']),
	},
	props: {
		modalName: {
			type: String,
		},
	},
	methods: {
		onSelect(type: string) {
			this.modalBus.$emit('close');
			this.$store.dispatch('ui/openNewCredentialDetails', { type });
		},
	},
});
</script>

<style module lang="scss">
.container {

}
</style>
