<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nIcon, N8nSwitch2, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useMCPStore } from '@n8n/frontend-module-mcp';

const props = defineProps<{
	credentialId: string;
	credentialTypeName: string;
	availableInMcp: boolean;
	canUpdate: boolean;
}>();

const i18n = useI18n();
const toast = useToast();
const settingsStore = useSettingsStore();
const mcpStore = useMCPStore();

const eligibleTypes = ref<Set<string> | null>(null);
const isSaving = ref(false);
// The saved value after a toggle in this dialog. null means no local change yet.
const savedAvailability = ref<boolean | null>(null);

const isMcpEnabled = computed(
	() => settingsStore.isModuleActive('mcp') && mcpStore.mcpAccessEnabled,
);

const isAvailableInMcp = computed(() => savedAvailability.value ?? props.availableInMcp);

const showToggle = computed(
	() =>
		isMcpEnabled.value &&
		!!props.credentialId &&
		eligibleTypes.value?.has(props.credentialTypeName) === true,
);

const isCredentialUseBlocked = computed(() => mcpStore.credentialUseMode === 'blocked');

const description = computed(() =>
	isAvailableInMcp.value && isCredentialUseBlocked.value
		? i18n.baseText('credentialEdit.mcpAccess.description.blocked')
		: i18n.baseText('credentialEdit.mcpAccess.description'),
);

watch(
	isMcpEnabled,
	async (enabled) => {
		if (!enabled || eligibleTypes.value) return;
		try {
			eligibleTypes.value = await mcpStore.fetchEligibleCredentialTypes();
		} catch {
			// The switch stays hidden. The MCP settings page can still change the credential.
		}
	},
	{ immediate: true },
);

watch(
	() => props.credentialId,
	() => {
		savedAvailability.value = null;
	},
);

async function onToggle(enabled: boolean) {
	if (isSaving.value) return;
	isSaving.value = true;
	// Show the new state at once. A failure puts the saved state back.
	const previous = savedAvailability.value;
	savedAvailability.value = enabled;
	try {
		await mcpStore.toggleCredentialsMcpAccess([props.credentialId], enabled);
		toast.showMessage({
			type: 'success',
			title: i18n.baseText(
				enabled
					? 'credentialEdit.mcpAccess.enabled.success'
					: 'credentialEdit.mcpAccess.disabled.success',
			),
		});
	} catch (error) {
		savedAvailability.value = previous;
		toast.showError(error, i18n.baseText('credentialEdit.mcpAccess.error.title'));
	} finally {
		isSaving.value = false;
	}
}
</script>

<template>
	<div v-if="showToggle" :class="$style.container" data-test-id="credential-mcp-access">
		<N8nIcon :class="$style.icon" icon="mcp" size="large" />
		<div :class="$style.info">
			<N8nText tag="p" size="medium" color="text-dark" bold>
				{{ i18n.baseText('credentialEdit.mcpAccess.title') }}
			</N8nText>
			<N8nText tag="p" size="small" color="text-light">
				{{ description }}
			</N8nText>
		</div>
		<N8nTooltip
			placement="top"
			:disabled="canUpdate"
			:content="i18n.baseText('credentialEdit.mcpAccess.noPermission.tooltip')"
		>
			<span :class="$style.switch">
				<N8nSwitch2
					:model-value="isAvailableInMcp"
					:disabled="!canUpdate || isSaving"
					size="large"
					:aria-label="i18n.baseText('credentialEdit.mcpAccess.title')"
					data-test-id="credential-mcp-access-toggle"
					@update:model-value="onToggle"
				/>
			</span>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
}

.icon {
	flex-shrink: 0;
	color: var(--color--text);
}

.info {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.switch {
	display: inline-flex;
	flex-shrink: 0;
}
</style>
