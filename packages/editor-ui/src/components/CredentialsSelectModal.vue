<template>
	<Modal
		:name="CREDENTIAL_SELECT_MODAL_KEY"
		:eventBus="modalBus"
		width="50%"
		:center="true"
		maxWidth="460px"
	>
		<template slot="header">
			<h2 :class="$style.title">{{ $locale.baseText('credentialSelectModal.addNewCredential') }}</h2>
		</template>
		<template slot="content">
			<div>
				<div :class="$style.subtitle">{{ $locale.baseText('credentialSelectModal.selectAnAppOrServiceToConnectTo') }}</div>
				<n8n-select
					filterable
					defaultFirstOption
					:placeholder="$locale.baseText('credentialSelectModal.searchForApp')"
					size="xlarge"
					ref="select"
					:value="selected"
					@change="onSelect"
				>
					<font-awesome-icon icon="search" slot="prefix" />
					<n8n-option
						v-for="credential in allCredentialTypes"
						:value="credential.name"
						:key="credential.name"
						:label="credential.displayName"
						filterable
					/>
				</n8n-select>
			</div>
		</template>
		<template slot="footer">
			<div :class="$style.footer">
				<n8n-button
					:label="$locale.baseText('credentialSelectModal.continue')"
					float="right"
					size="large"
					:disabled="!selected"
					@click="openCredentialType"
				/>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from "vuex";

import Modal from './Modal.vue';
import { CREDENTIAL_SELECT_MODAL_KEY } from '../constants';

export default Vue.extend({
	name: 'CredentialsSelectModal',
	components: {
		Modal,
	},
	mounted() {
		setTimeout(() => {
			const element = this.$refs.select as HTMLSelectElement;
			if (element) {
				element.focus();
			}
		}, 0);
	},
	data() {
		return {
			modalBus: new Vue(),
			selected: '',
			CREDENTIAL_SELECT_MODAL_KEY,
		};
	},
	computed: {
		...mapGetters('credentials', ['allCredentialTypes']),
	},
	methods: {
		onSelect(type: string) {
			this.selected = type;
		},
		openCredentialType () {
			this.modalBus.$emit('close');
			this.$store.dispatch('ui/openNewCredential', { type: this.selected });
			this.$telemetry.track('User opened Credential modal', { credential_type: this.selected, source: 'primary_menu', new_credential: true, workflow_id: this.$store.getters.workflowId });
		},
	},
});
</script>

<style module lang="scss">
.title {
	font-size: var(--font-size-xl);
	line-height: var(--font-line-height-regular);
}

.subtitle {
	margin-bottom: var(--spacing-s);
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
}
</style>
