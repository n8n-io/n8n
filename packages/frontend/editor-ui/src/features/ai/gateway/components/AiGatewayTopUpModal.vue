<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { BUILTIN_CREDENTIALS_DOCS_URL } from '@/app/constants/urls';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';
import Modal from '@/app/components/Modal.vue';

const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();

const modalData = computed(() => uiStore.modalsById[AI_GATEWAY_TOP_UP_MODAL_KEY]?.data);
const credentialType = computed<string | undefined>(
	() => modalData.value?.credentialType as string | undefined,
);

const credentialTypeInfo = computed(() => {
	if (!credentialType.value) return null;
	return credentialsStore.getCredentialTypeByName(credentialType.value) ?? null;
});

const credentialDocsUrl = computed(() => {
	const type = credentialTypeInfo.value;
	if (!type?.documentationUrl) return '';

	if (type.documentationUrl.startsWith('http')) {
		return type.documentationUrl;
	}

	return `${BUILTIN_CREDENTIALS_DOCS_URL}${type.documentationUrl}/`;
});

const credentialDocsLinkText = computed(() => {
	const name = credentialTypeInfo.value?.displayName;
	return name ? `See how to configure the ${name} credential` : 'See credential setup guide';
});
</script>

<template>
	<Modal
		:name="AI_GATEWAY_TOP_UP_MODAL_KEY"
		width="520px"
		custom-class="ai-gateway-topup-dialog"
		data-test-id="ai-gateway-topup-modal"
	>
		<template #content>
			<div :class="$style.contentWrapper">
				<div :class="$style.body">
					<N8nIcon icon="hourglass" size="xlarge" color="text-base" :class="$style.icon" />
					<N8nText :class="$style.title" bold color="text-dark">Top up is coming soon</N8nText>

					<div :class="$style.paragraphs">
						<p :class="$style.paragraph">
							You'll be notified in the coming weeks when this feature becomes available.
						</p>
						<p :class="$style.paragraph">
							In the meantime you can switch to using your own credentials.
						</p>
						<p v-if="credentialType" :class="$style.paragraph">
							<N8nLink
								:to="credentialDocsUrl"
								new-window
								data-test-id="ai-gateway-topup-credentials-docs-link"
							>
								{{ credentialDocsLinkText }}
							</N8nLink>
						</p>
					</div>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.contentWrapper {
	display: flex;
	flex-direction: column;
	justify-content: center;
	min-height: 300px;
}

.body {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0 var(--spacing--xl);
}

.icon {
	flex-shrink: 0;
}

.title {
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
	margin: 0;
}

.paragraphs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.paragraph {
	margin: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
	text-align: center;
}
</style>

<style lang="scss">
.ai-gateway-topup-dialog.el-dialog {
	background-color: var(--color--background);
}
</style>
