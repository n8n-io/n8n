<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import MCPCredentialsSelect from '../components/MCPCredentialsSelect.vue';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nNotice,
	N8nText,
} from '@n8n/design-system';
import { computed, ref, watch } from 'vue';
import type { McpCredential } from '../mcp.types';

const props = defineProps<{
	/** The credentials that the user can still enable. */
	credentials: McpCredential[];
	enableMcpAccess: (credentialIds: string[]) => Promise<void>;
}>();

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();

const isSaving = ref(false);
const selectedCredentialIds = ref<string[]>([]);
// typescript-eslint reads an SFC import as `any`, so the ref names the one method it calls.
const selectRef = ref<{ focusOnInput: () => void } | null>(null);

const canSave = computed(() => selectedCredentialIds.value.length > 0);
const hasCredentials = computed(() => props.credentials.length > 0);

// The view keeps this component mounted, so every opening starts from an empty selection.
watch(open, (isOpen) => {
	if (isOpen) {
		selectedCredentialIds.value = [];
	}
});

async function save() {
	if (selectedCredentialIds.value.length === 0) return;

	isSaving.value = true;
	try {
		await props.enableMcpAccess(selectedCredentialIds.value);
		open.value = false;
	} finally {
		isSaving.value = false;
	}
}

function onSelectReady() {
	selectRef.value?.focusOnInput();
}

function onConfirm() {
	if (!isSaving.value) {
		void save();
	}
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="xlarge"
		:header="i18n.baseText('settings.mcp.connectCredentials.modalTitle')"
		:close-on-overlay-click="false"
		data-test-id="mcp-connect-credentials-dialog"
	>
		<N8nDialogBody>
			<div :class="$style.content">
				<N8nNotice
					data-test-id="mcp-connect-credentials-info-notice"
					theme="info"
					:content="i18n.baseText('settings.mcp.connectCredentials.notice')"
					:class="$style.notice"
				/>
				<MCPCredentialsSelect
					v-if="hasCredentials"
					ref="selectRef"
					v-model="selectedCredentialIds"
					:credentials="props.credentials"
					:placeholder="i18n.baseText('settings.mcp.connectCredentials.input.placeholder')"
					:disabled="isSaving"
					@ready="onSelectReady"
					@confirm="onConfirm"
				/>
				<div v-else :class="$style.empty" data-test-id="mcp-connect-credentials-empty-state">
					<N8nText color="text-dark" bold>
						{{ i18n.baseText('settings.mcp.connectCredentials.empty.title') }}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.mcp.connectCredentials.empty.description') }}
					</N8nText>
				</div>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				:disabled="isSaving"
				data-test-id="mcp-connect-credentials-cancel-button"
				@click="open = false"
			/>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('settings.mcp.connectCredentials.confirm.label')"
				:loading="isSaving"
				:disabled="!canSave || isSaving"
				data-test-id="mcp-connect-credentials-save-button"
				@click="save"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);

	.notice {
		margin: 0;
	}
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--lg) 0;
	text-align: center;
}
</style>
