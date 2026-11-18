<script lang="ts" setup>
import {
	N8nButton,
	N8nCallout,
	N8nCopyInput,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';

import { useMcpServersStore } from '../mcpServers.store';

const props = defineProps<{ serverId: string }>();
const emit = defineEmits<{ close: [] }>();

const i18n = useI18n();
const toast = useToast();
const store = useMcpServersStore();

const label = ref('');
const creating = ref(false);
/** The raw key. It lives only in this dialog and is gone when the dialog closes. */
const rawKey = ref<string | null>(null);

async function onCreate() {
	const value = label.value.trim();
	if (!value || creating.value) return;
	creating.value = true;
	try {
		const created = await store.createApiKey(props.serverId, value);
		rawKey.value = created.key;
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.apiKey.createError'));
	} finally {
		creating.value = false;
	}
}

function onClose() {
	rawKey.value = null;
	emit('close');
}
</script>

<template>
	<N8nDialog
		open
		:header="
			i18n.baseText(rawKey ? 'mcpServers.apiKey.created.title' : 'mcpServers.apiKey.new.title')
		"
		:close-on-overlay-click="!rawKey"
		data-testid="mcp-server-api-key-dialog"
		@update:open="!$event && onClose()"
	>
		<N8nDialogBody>
			<div v-if="!rawKey" :class="$style.body">
				<N8nInputLabel :label="i18n.baseText('mcpServers.apiKey.label')" required>
					<N8nInput
						v-model="label"
						:placeholder="i18n.baseText('mcpServers.apiKey.labelPlaceholder')"
						autofocus
						data-testid="mcp-server-api-key-label"
						@keydown.enter="onCreate"
					/>
				</N8nInputLabel>
			</div>
			<div v-else :class="$style.body">
				<N8nCallout theme="warning" icon="triangle-alert">
					{{ i18n.baseText('mcpServers.apiKey.created.warning') }}
				</N8nCallout>
				<N8nCopyInput
					:value="rawKey"
					:label="i18n.baseText('mcpServers.apiKey.created.label')"
					data-testid="mcp-server-api-key-value"
				/>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<template v-if="!rawKey">
				<N8nButton variant="ghost" @click="onClose">{{
					i18n.baseText('generic.cancel')
				}}</N8nButton>
				<N8nButton
					variant="brand"
					:disabled="!label.trim()"
					:loading="creating"
					data-testid="mcp-server-api-key-create"
					@click="onCreate"
				>
					{{ i18n.baseText('mcpServers.apiKey.create') }}
				</N8nButton>
			</template>
			<N8nButton v-else variant="brand" data-testid="mcp-server-api-key-done" @click="onClose">
				{{ i18n.baseText('mcpServers.apiKey.done') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
