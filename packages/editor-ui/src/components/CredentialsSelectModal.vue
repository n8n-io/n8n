<template>
	<Modal
		:name="CREDENTIAL_SELECT_MODAL_KEY"
		:eventBus="modalBus"
		width="50%"
		:center="true"
		:loading="loading"
		maxWidth="460px"
		minHeight="250px"
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
						v-for="credential in credentialsStore.allCredentialTypes"
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
import mixins from 'vue-typed-mixins';

import Modal from './Modal.vue';
import { CREDENTIAL_SELECT_MODAL_KEY } from '../constants';
import { externalHooks } from '@/components/mixins/externalHooks';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { useCredentialsStore } from '@/stores/credentials';

export default mixins(externalHooks).extend({
	name: 'CredentialsSelectModal',
	components: {
		Modal,
	},
	async mounted() {
		try {
			await this.credentialsStore.fetchCredentialTypes(false);
		} catch (e) {
		}
		this.loading = false;

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
			loading: true,
			CREDENTIAL_SELECT_MODAL_KEY,
		};
	},
	computed: {
		...mapStores(
			useCredentialsStore,
			useUIStore,
			useWorkflowsStore,
		),
	},
	methods: {
		onSelect(type: string) {
			this.selected = type;
		},
		openCredentialType () {
			this.modalBus.$emit('close');
			this.uiStore.openNewCredential(this.selected);

			const telemetryPayload = {
				credential_type: this.selected,
				source: 'primary_menu',
				new_credential: true,
				workflow_id: this.workflowsStore.workflowId,
			};

			this.$telemetry.track('User opened Credential modal', telemetryPayload);
			this.$externalHooks().run('credentialsSelectModal.openCredentialType', telemetryPayload);
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
