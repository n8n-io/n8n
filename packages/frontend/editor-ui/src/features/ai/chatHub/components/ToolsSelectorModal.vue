<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { createEventBus } from '@n8n/utils/event-bus';
import { type ChatHubAgentTool } from '@n8n/api-types';
import { type INode, deepCopy, JINA_AI_TOOL_NODE_TYPE } from 'n8n-workflow';
import { AVAILABLE_TOOLS, type ChatHubToolProvider } from '../composables/availableTools';
import { ElSwitch } from 'element-plus';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useI18n } from '@n8n/i18n';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { getResourcePermissions } from '@n8n/permissions';

const props = defineProps<{
	modalName: string;
	data: {
		selected: INode[];
		onConfirm: (tools: INode[]) => void;
	};
}>();

const i18n = useI18n();
const modalBus = ref(createEventBus());
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();
const projectStore = useProjectsStore();
const uiStore = useUIStore();

const canCreateCredentials = computed(() => {
	return getResourcePermissions(projectStore.personalProject?.scopes).credential.create;
});

const selectedByProvider = ref<Record<ChatHubAgentTool, Set<string>>>({
	[JINA_AI_TOOL_NODE_TYPE]: new Set(),
});

const credentialIdByProvider = ref<Record<ChatHubAgentTool, string | null>>({
	[JINA_AI_TOOL_NODE_TYPE]: null,
});

function resetSelections() {
	selectedByProvider.value = {
		[JINA_AI_TOOL_NODE_TYPE]: new Set(),
	};
	credentialIdByProvider.value = {
		[JINA_AI_TOOL_NODE_TYPE]: null,
	};
}

function restoreFromInitial(nodes: INode[]) {
	resetSelections();

	const toolsByProvider = new Map<ChatHubAgentTool, Set<string>>();
	Object.entries(AVAILABLE_TOOLS).forEach(([key, p]) => {
		toolsByProvider.set(key as ChatHubAgentTool, new Set(p.tools.map((t) => t.node.name)));
	});

	for (const node of nodes) {
		const providerKey = node.type as ChatHubAgentTool;
		const provider = AVAILABLE_TOOLS[providerKey];
		if (!provider) continue;

		const isValid = toolsByProvider.get(providerKey)?.has(node.name);
		if (!isValid) continue;

		selectedByProvider.value[providerKey].add(node.name);
		if (provider.credentialType) {
			const credentialId = node.credentials?.[provider.credentialType].id;
			if (
				credentialId &&
				typeof credentialId === 'string' &&
				!credentialIdByProvider.value[providerKey]
			) {
				credentialIdByProvider.value[providerKey] = credentialId;
			}
		}
	}

	selectedByProvider.value = { ...selectedByProvider.value };
	credentialIdByProvider.value = { ...credentialIdByProvider.value };
}

function getAvailableCredentials(toolNodeType: ChatHubAgentTool): ICredentialsResponse[] {
	const provider = AVAILABLE_TOOLS[toolNodeType];
	if (!provider.credentialType) return [];
	return credentialsStore.getCredentialsByType(provider.credentialType);
}

const providers = computed<Array<[ChatHubAgentTool, ChatHubToolProvider]>>(() => {
	return Object.entries(AVAILABLE_TOOLS) as Array<[ChatHubAgentTool, ChatHubToolProvider]>;
});

const selectedCount = computed(() => {
	return providers.value.reduce(
		(acc, [key]) => acc + (selectedByProvider.value[key]?.size ?? 0),
		0,
	);
});

const getNodeIcon = (nodeType: ChatHubAgentTool) => {
	return nodeTypesStore.getNodeType(nodeType);
};

function toggleTool(
	providerKey: ChatHubAgentTool,
	toolId: string,
	value: string | number | boolean,
) {
	const enabled = typeof value === 'boolean' ? value : Boolean(value);
	if (!selectedByProvider.value[providerKey]) {
		selectedByProvider.value[providerKey] = new Set();
	}
	const set = selectedByProvider.value[providerKey];
	if (enabled) {
		set.add(toolId);
	} else {
		set.delete(toolId);
	}

	selectedByProvider.value = { ...selectedByProvider.value };
}

function onCredentialSelect(providerKey: ChatHubAgentTool, id: string) {
	credentialIdByProvider.value[providerKey] = id;
}

function onCreateNewCredential(providerKey: ChatHubAgentTool) {
	const provider = AVAILABLE_TOOLS[providerKey];
	if (!provider.credentialType) return;

	uiStore.openNewCredential(provider.credentialType);
}

const isMissingCredentials = computed(() => {
	for (const [providerKey, provider] of providers.value) {
		const selectedIds = selectedByProvider.value[providerKey];
		if (!selectedIds || selectedIds.size === 0) {
			continue;
		}

		// If provider requires credential, ensure one is selected
		if (provider.credentialType) {
			const selectedCredential = credentialIdByProvider.value[providerKey];
			if (!selectedCredential) {
				return true;
			}
		}
	}

	return false;
});

function handleConfirm() {
	const tools: INode[] = [];
	for (const [providerKey, provider] of providers.value) {
		const selected = selectedByProvider.value[providerKey];
		if (!selected || selected.size === 0) continue;

		const pickedId = credentialIdByProvider.value[providerKey] ?? null;

		let credential: ICredentialsResponse | undefined;
		if (provider.credentialType && pickedId) {
			credential = getAvailableCredentials(providerKey).find((c) => c.id === pickedId);
		}

		for (const toolName of selected) {
			const tool = provider.tools.find((t) => t.node.name === toolName);
			if (!tool) continue;

			const node = deepCopy(tool.node);

			// If the provider defines a credentialType and user chose a credential, attach/override it
			if (provider.credentialType && credential) {
				node.credentials = node.credentials ?? {};
				node.credentials[provider.credentialType] = { id: credential.id, name: credential.name };
			}

			tools.push(node);
		}
	}

	props.data.onConfirm(tools);

	modalBus.value.emit('close');
}

function onCancel() {
	modalBus.value.emit('close');
}

watch(
	() => props.data.selected,
	(toolNodes: INode[]) => {
		if (toolNodes?.length > 0) {
			restoreFromInitial(toolNodes);
		} else {
			resetSelections();
		}
	},
	{ immediate: true },
);

onMounted(async () => {
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
});
</script>

<template>
	<Modal
		:name="modalName"
		:event-bus="modalBus"
		width="50%"
		max-width="720px"
		min-height="340px"
		:center="true"
	>
		<template #header>
			<div :class="$style.header">
				<N8nIcon icon="settings2" :size="24" />
				<N8nHeading size="large" color="text-dark">{{
					i18n.baseText('chatHub.tools.editor.title')
				}}</N8nHeading>
			</div>
		</template>

		<template #content>
			<div :class="$style.content">
				<div v-for="[key, provider] in providers" :key="key" :class="$style.provider">
					<div :class="$style.providerHeader">
						<div :class="$style.providerTitle">
							<NodeIcon :node-type="getNodeIcon(key)" :size="18" />
							<N8nHeading color="text-dark" size="medium">{{ provider.name }}</N8nHeading>
						</div>
						<N8nText size="small" color="text-base">{{ provider.description }}</N8nText>
					</div>

					<div v-if="provider.credentialType" :class="$style.row">
						<N8nText size="small" color="text-base">{{
							i18n.baseText('chatHub.tools.editor.credential')
						}}</N8nText>
						<div :class="$style.credentials">
							<N8nSelect
								:model-value="credentialIdByProvider[key] ?? null"
								size="large"
								:placeholder="i18n.baseText('chatHub.tools.editor.credential.placeholder')"
								@update:model-value="onCredentialSelect(key, $event)"
							>
								<N8nOption
									v-for="c in getAvailableCredentials(key)"
									:key="c.id"
									:value="c.id"
									:label="c.name"
								/>
							</N8nSelect>
							<N8nTooltip
								placement="left"
								:disabled="canCreateCredentials"
								:content="
									i18n.baseText('chatHub.tools.editor.credential.createNew.permissionDenied')
								"
							>
								<N8nButton
									size="medium"
									type="secondary"
									:disabled="!canCreateCredentials"
									@click="onCreateNewCredential(key)"
								>
									{{ i18n.baseText('chatHub.tools.editor.credential.createNew') }}
								</N8nButton>
							</N8nTooltip>
						</div>
					</div>

					<div :class="$style.toolsList">
						<div v-for="tool in provider.tools" :key="tool.node.id" :class="$style.toolRow">
							<div :class="$style.toolInfo">
								<N8nText size="medium" bold color="text-base">{{
									tool.title || tool.node.name
								}}</N8nText>
								<N8nText size="small" color="text-base">
									{{ tool.node.name }}
								</N8nText>
							</div>

							<ElSwitch
								size="large"
								:aria-label="`Toggle ${tool.title || tool.node.name}`"
								:model-value="!!selectedByProvider[key]?.has(tool.node.name)"
								@update:model-value="
									(val: string | number | boolean) => toggleTool(key, tool.node.name, val)
								"
							/>
						</div>
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nText color="text-base">
					{{
						i18n.baseText('chatHub.tools.editor.selectedCount', {
							interpolate: { count: selectedCount },
						})
					}}
				</N8nText>
				<div :class="$style.footerRight">
					<N8nButton type="tertiary" @click="onCancel">{{
						i18n.baseText('chatHub.tools.editor.cancel')
					}}</N8nButton>
					<N8nButton type="primary" :disabled="isMissingCredentials" @click="handleConfirm">{{
						i18n.baseText('chatHub.tools.editor.confirm')
					}}</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: var(--spacing--sm) 0 var(--spacing--md);
}
.provider {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--md);
}
.providerHeader {
	display: grid;
	gap: var(--spacing--2xs);
}
.providerTitle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.row {
	display: grid;
	gap: var(--spacing--2xs);
}
.credentials {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.toolsList {
	display: grid;
	gap: var(--spacing--sm);
}
.toolRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) 0;
}
.toolInfo {
	display: grid;
	gap: 2px;
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
}
.footerRight {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
