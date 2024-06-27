<template>
	<Modal
		:name="CREDENTIAL_SELECT_MODAL_KEY"
		:event-bus="modalBus"
		width="50%"
		:center="true"
		:loading="loading"
		max-width="460px"
		min-height="250px"
	>
		<template #header>
			<h2 :class="$style.title">
				{{ $locale.baseText('credentialSelectModal.addNewCredential') }}
			</h2>
		</template>
		<template #content>
			<div>
				<div :class="$style.subtitle">
					{{ $locale.baseText('credentialSelectModal.selectAnAppOrServiceToConnectTo') }}
				</div>
				<n8n-select
					ref="select"
					filterable
					default-first-option
					:placeholder="$locale.baseText('credentialSelectModal.searchForApp')"
					size="xlarge"
					:model-value="selected"
					data-test-id="new-credential-type-select"
					@update:model-value="onSelect"
				>
					<template #prefix>
						<font-awesome-icon icon="search" />
					</template>
					<n8n-option
						v-for="credential in credentialsStore.allCredentialTypes"
						:key="credential.name"
						:value="credential.name"
						:label="credential.displayName"
						filterable
						data-test-id="new-credential-type-select-option"
					/>
				</n8n-select>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<n8n-button
					:label="$locale.baseText('credentialSelectModal.continue')"
					float="right"
					size="large"
					:disabled="!selected"
					data-test-id="new-credential-type-button"
					@click="openCredentialType"
				/>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Modal from './Modal.vue';
import { CREDENTIAL_SELECT_MODAL_KEY } from '../constants';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { createEventBus } from 'n8n-design-system/utils';
import { useExternalHooks } from '@/composables/useExternalHooks';

export default defineComponent({
	name: 'CredentialsSelectModal',
	components: {
		Modal,
	},
	setup() {
		const externalHooks = useExternalHooks();
		return {
			externalHooks,
		};
	},
	data() {
		return {
			modalBus: createEventBus(),
			selected: '',
			loading: true,
			CREDENTIAL_SELECT_MODAL_KEY,
		};
	},
	async mounted() {
		try {
			await this.credentialsStore.fetchCredentialTypes(false);
		} catch (e) {}
		this.loading = false;

		setTimeout(() => {
			const elementRef = this.$refs.select as HTMLSelectElement | undefined;
			if (elementRef) {
				elementRef.focus();
			}
		}, 0);
	},
	computed: {
		...mapStores(useCredentialsStore, useUIStore, useWorkflowsStore),
	},
	methods: {
		onSelect(type: string) {
			this.selected = type;
		},
		openCredentialType() {
			this.modalBus.emit('close');
			this.uiStore.openNewCredential(this.selected);

			const telemetryPayload = {
				credential_type: this.selected,
				source: 'primary_menu',
				new_credential: true,
				workflow_id: this.workflowsStore.workflowId,
			};

			this.$telemetry.track('User opened Credential modal', telemetryPayload);
			void this.externalHooks.run('credentialsSelectModal.openCredentialType', telemetryPayload);
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
