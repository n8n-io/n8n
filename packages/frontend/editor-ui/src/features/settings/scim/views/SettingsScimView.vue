<script lang="ts" setup>
import CopyInput from '@/app/components/CopyInput.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { onMounted, ref } from 'vue';

import { N8nButton, N8nHeading, N8nInfoTip, N8nInput } from '@n8n/design-system';
import { useScimStore } from '../scim.store';

const i18n = useI18n();
const toast = useToast();
const scimStore = useScimStore();
const documentTitle = useDocumentTitle();

const isGeneratingScimToken = ref(false);
const isDeletingScimToken = ref(false);

async function handleGenerateToken() {
	try {
		isGeneratingScimToken.value = true;

		await scimStore.generateScimToken();

		toast.showMessage({
			title: 'SCIM Token Generated',
			message: 'Your SCIM token has been generated successfully',
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, 'Failed to generate SCIM token');
	} finally {
		isGeneratingScimToken.value = false;
	}
}

async function handleDeleteToken() {
	try {
		isDeletingScimToken.value = true;

		await scimStore.deleteScimToken();

		toast.showMessage({
			title: 'SCIM Token Deleted',
			message: 'Your SCIM token has been deleted successfully',
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, 'Failed to delete SCIM token');
	} finally {
		isDeletingScimToken.value = false;
	}
}

onMounted(async () => {
	documentTitle.set('SCIM Provisioning');
	await scimStore.loadScimToken();
});
</script>

<template>
	<div class="pb-2xl">
		<div :class="$style.heading">
			<N8nHeading size="2xlarge">SCIM Provisioning</N8nHeading>
		</div>
		<N8nInfoTip>
			Configure SCIM provisioning to automatically sync users from your identity provider.
			<a href="https://docs.n8n.io/user-management/scim/" target="_blank">
				Learn more about SCIM
			</a>
		</N8nInfoTip>

		<div :class="$style.group">
			<label>Base URL</label>
			<CopyInput
				:value="scimStore.scimBaseUrl"
				:copy-button-text="i18n.baseText('generic.clickToCopy')"
				toast-title="SCIM Base URL copied to clipboard"
			/>
			<small>Use this URL in your identity provider's SCIM configuration</small>
		</div>

		<div :class="$style.group">
			<label>SCIM Token</label>
			<div v-if="!scimStore.scimToken" :class="$style.tokenPlaceholder">
				<N8nButton
					size="large"
					:loading="isGeneratingScimToken"
					data-test-id="scim-generate-token"
					@click="handleGenerateToken"
				>
					Generate Token
				</N8nButton>
				<small>Generate a token to authenticate SCIM requests from your identity provider</small>
			</div>
			<div v-else>
				<N8nInput
					v-if="scimStore.isTokenObfuscated"
					:model-value="scimStore.scimToken"
					readonly
					disabled
					data-test-id="scim-token-obfuscated"
				/>
				<CopyInput
					v-else
					:value="scimStore.scimToken"
					:copy-button-text="i18n.baseText('generic.clickToCopy')"
					toast-title="SCIM Token copied to clipboard"
					data-test-id="scim-token-copy"
				/>
				<div :class="$style.tokenActions">
					<N8nButton
						size="small"
						type="tertiary"
						:loading="isGeneratingScimToken"
						data-test-id="scim-rotate-token"
						@click="handleGenerateToken"
					>
						Rotate Token
					</N8nButton>
					<N8nButton
						size="small"
						type="tertiary"
						:loading="isDeletingScimToken"
						data-test-id="scim-delete-token"
						@click="handleDeleteToken"
					>
						Delete Token
					</N8nButton>
				</div>
				<small v-if="scimStore.isTokenObfuscated">
					Token is hidden for security. Rotate to generate a new token or delete to remove it.
				</small>
				<small v-else>
					Keep this token secure. It will be used by your identity provider to sync users.
				</small>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.heading {
	margin-bottom: var(--spacing--sm);
}

.group {
	padding: var(--spacing--xl) 0 0;

	> label {
		display: inline-block;
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
		padding: 0 0 var(--spacing--2xs);
	}

	small {
		display: block;
		padding: var(--spacing--2xs) 0 0;
		font-size: var(--font-size--2xs);
		color: var(--color--text);
	}
}

.tokenPlaceholder {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);

	small {
		padding: 0;
	}
}

.tokenActions {
	display: flex;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}
</style>
