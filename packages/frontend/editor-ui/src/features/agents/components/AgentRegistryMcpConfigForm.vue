<script setup lang="ts">
import { N8nInput, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { McpToolPermissions } from '@n8n/api-types';
import { computed, ref, watch } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';
import McpConnectionStatusCallout from '@/features/shared/toolsConnection/McpConnectionStatusCallout.vue';
import McpDetailBody from '@/features/shared/toolsConnection/McpDetailBody.vue';
import McpToolPermissionsEditor from '@/features/shared/toolsConnection/McpToolPermissionsEditor.vue';
import type { McpToolSettings } from '@/features/shared/toolsConnection/types';

import {
	DEFAULT_AGENT_MCP_CONNECTION_TIMEOUT_MS,
	MAX_AGENT_MCP_CONNECTION_TIMEOUT_MS,
	MIN_AGENT_MCP_CONNECTION_TIMEOUT_MS,
	type AgentRegistryMcpModalData,
	useAgentRegistryMcpConfig,
} from '../composables/useAgentRegistryMcpConfig';

const props = defineProps<{
	data: AgentRegistryMcpModalData;
}>();

const emit = defineEmits<{
	'credential-deleted': [];
	'request-credential-picker': [];
	'update:title': [title: string];
}>();

const i18n = useI18n();
const message = useMessage();
const modalData = computed(() => props.data);
const config = useAgentRegistryMcpConfig(modalData, () => emit('credential-deleted'));
const item = config.item;
const title = config.title;
const submitted = ref(false);
const initialConnectionTimeoutMs =
	props.data.mcpServer.connectionTimeoutMs ?? DEFAULT_AGENT_MCP_CONNECTION_TIMEOUT_MS;
const draftSettings = ref<McpToolSettings>({
	categories: {
		read: 'always_allow',
		write: 'always_allow',
	},
	connectionTimeoutMs: initialConnectionTimeoutMs,
});
const draftPermissions = computed<McpToolPermissions>({
	get: () => draftSettings.value,
	set: (permissions) => {
		draftSettings.value = {
			...permissions,
			connectionTimeoutMs: draftSettings.value.connectionTimeoutMs,
		};
	},
});
const timeoutInput = computed({
	get: () => String(draftSettings.value.connectionTimeoutMs ?? ''),
	set: (value: string) => {
		draftSettings.value = {
			...draftSettings.value,
			connectionTimeoutMs: value.trim() ? Number(value) : undefined,
		};
	},
});

watch(
	() => config.item.value?.id,
	() => {
		const settings = config.item.value?.settings;
		if (settings) {
			draftSettings.value = {
				...settings,
				connectionTimeoutMs: settings.connectionTimeoutMs ?? initialConnectionTimeoutMs,
			};
		}
	},
	{ immediate: true },
);

watch(title, (value) => emit('update:title', value), { immediate: true });

const normalizedTitle = computed(() => title.value.trim());
const titleError = computed(() => {
	if (!submitted.value) return '';
	if (!normalizedTitle.value) {
		return i18n.baseText('agents.toolConfig.name.validation.required' as BaseTextKey);
	}
	if (props.data.existingToolNames?.includes(normalizedTitle.value)) {
		return i18n.baseText('agents.toolConfig.name.validation.duplicate' as BaseTextKey);
	}
	return '';
});
const parsedTimeout = computed(() => {
	const timeout = draftSettings.value.connectionTimeoutMs;
	return timeout !== undefined &&
		Number.isInteger(timeout) &&
		timeout >= MIN_AGENT_MCP_CONNECTION_TIMEOUT_MS &&
		timeout <= MAX_AGENT_MCP_CONNECTION_TIMEOUT_MS
		? timeout
		: null;
});
const timeoutError = computed(() =>
	submitted.value && parsedTimeout.value === null
		? i18n.baseText('agents.toolConfig.mcp.timeout.validation')
		: '',
);
const saveDisabled = computed(() => item.value?.status !== 'connected');

function confirm(): boolean {
	submitted.value = true;
	if (parsedTimeout.value === null) return false;
	return config.save(draftSettings.value);
}

async function remove(): Promise<boolean> {
	if (!props.data.onRemove) return false;
	const confirmed = await message.confirm(
		i18n.baseText('tools.connection.settings.removeConfirm.description', {
			interpolate: { service: title.value },
		}),
		{
			title: i18n.baseText('tools.connection.settings.removeConfirm.title', {
				interpolate: { name: title.value },
			}),
			confirmButtonText: i18n.baseText('tools.connection.settings.removeConfirm.confirmButton'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (confirmed !== MODAL_CONFIRM) return false;
	props.data.onRemove();
	return true;
}

function changeTitle(title: string) {
	config.changeTitle(title);
}

defineExpose({
	changeTitle,
	confirm,
	credentialAdapter: config.credentialAdapter,
	headerItem: item,
	remove,
	saveDisabled,
	selectCredential: config.selectCredential,
	title,
	titleError,
});
</script>

<template>
	<div v-if="!item" :class="$style.loading">
		<N8nSpinner />
	</div>
	<div v-else :class="$style.content">
		<McpDetailBody :item="item" />
		<McpConnectionStatusCallout
			v-if="item.status === 'disconnected'"
			:failure-reason="item.connectionFailureReason"
			@reconnect="emit('request-credential-picker')"
			@retry="config.discover()"
		/>
		<div :class="$style.settings">
			<McpToolPermissionsEditor
				v-model="draftPermissions"
				actor="agent"
				:available-tools="item.availableTools"
				:server-title="title"
				:status="item.status"
				:supports-approval="data.supportsToolApproval !== false"
			/>
			<div :class="$style.timeoutSection">
				<N8nText tag="label" for="agent-mcp-connection-timeout" size="medium" bold>
					{{ i18n.baseText('agents.toolConfig.mcp.timeout.label') }}
				</N8nText>
				<N8nInput
					id="agent-mcp-connection-timeout"
					:model-value="timeoutInput"
					type="number"
					:disabled="item.status !== 'connected'"
					:aria-invalid="Boolean(timeoutError)"
					aria-describedby="agent-mcp-connection-timeout-help"
					data-testid="agent-mcp-connection-timeout"
					@update:model-value="timeoutInput = $event"
				>
					<template #suffix>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.toolConfig.mcp.timeout.unit') }}
						</N8nText>
					</template>
				</N8nInput>
				<N8nText id="agent-mcp-connection-timeout-help" size="small" color="text-light">
					{{ i18n.baseText('agents.toolConfig.mcp.timeout.help') }}
				</N8nText>
				<N8nText
					v-if="timeoutError"
					size="small"
					color="danger"
					data-testid="agent-mcp-timeout-error"
				>
					{{ timeoutError }}
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: calc(var(--height--5xl) * 3);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-height: 0;
	overflow-x: hidden;
}

.settings,
.timeoutSection {
	display: flex;
	flex-direction: column;
}

.settings {
	gap: var(--spacing--lg);
}

.timeoutSection {
	gap: var(--spacing--2xs);
}
</style>
