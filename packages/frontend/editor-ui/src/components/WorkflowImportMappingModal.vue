<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/stores/ui.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { nodeViewEventBus } from '@/event-bus';
import { WORKFLOW_IMPORT_MAPPING_MODAL_KEY } from '@/constants';
import { N8nSelect, N8nOption } from '@n8n/design-system';

const props = defineProps<{
	data: {
		workflowData: any;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const workflowsStore = useWorkflowsStore();

// Available workflows for subworkflow mapping (sorted by last modified)
const availableWorkflows = ref<{ id: string; name: string; updatedAt: number }[]>([]);
const loadingWorkflows = ref(true);

onMounted(async () => {
	try {
		const workflows = await workflowsStore.fetchAllWorkflows();
		// Sort by updatedAt descending (most recent first)
		availableWorkflows.value = workflows
			.map((w) => ({
				id: w.id,
				name: w.name,
				updatedAt: new Date(w.updatedAt).getTime(),
			}))
			.sort((a, b) => b.updatedAt - a.updatedAt);
	} catch (error) {
		console.error('Failed to fetch workflows:', error);
	} finally {
		loadingWorkflows.value = false;
	}
});

// Extract nodes from workflow data
const nodes = computed(() => props.data?.workflowData?.nodes || []);

// Extract unique credential types with their original references
const credentialInfo = computed(() => {
	const credMap = new Map<
		string,
		{ type: string; originalIds: Set<string>; originalNames: Set<string> }
	>();

	nodes.value.forEach((node: any) => {
		if (node.credentials) {
			Object.entries(node.credentials).forEach(([credType, credData]: [string, any]) => {
				if (!credMap.has(credType)) {
					credMap.set(credType, {
						type: credType,
						originalIds: new Set(),
						originalNames: new Set(),
					});
				}
				const info = credMap.get(credType)!;
				if (credData.id) info.originalIds.add(credData.id);
				if (credData.name) info.originalNames.add(credData.name);
			});
		}
	});

	return Array.from(credMap.values());
});

// Extract subworkflow references from executeWorkflow nodes
const subworkflowInfo = computed(() => {
	const subworkflows: {
		nodeId: string;
		nodeName: string;
		originalId: string;
		originalName: string;
	}[] = [];

	nodes.value.forEach((node: any) => {
		if (node.type === 'n8n-nodes-base.executeWorkflow') {
			const workflowId = node.parameters?.workflowId;
			if (workflowId) {
				subworkflows.push({
					nodeId: node.id,
					nodeName: node.name,
					originalId: workflowId.value || workflowId,
					originalName: workflowId.cachedResultName || 'Unknown workflow',
				});
			}
		}
	});

	return subworkflows;
});

// Credential mappings: { [credentialType]: selectedCredentialId }
const credentialMappings = reactive<Record<string, string>>({});

// Subworkflow mappings: { [nodeId]: selectedWorkflowId }
const subworkflowMappings = reactive<Record<string, string>>({});

// Get available credentials for a given type
const getAvailableCredentials = (credType: string) => {
	return credentialsStore.getCredentialsByType(credType);
};

// Check if credentials of a given type exist in the current n8n instance
const hasAvailableCredentials = (credType: string) => {
	return getAvailableCredentials(credType).length > 0;
};

const closeModal = () => {
	uiStore.closeModal(WORKFLOW_IMPORT_MAPPING_MODAL_KEY);
};

const confirm = () => {
	// Apply mappings to workflow data before importing
	const workflowData = JSON.parse(JSON.stringify(props.data.workflowData));

	if (workflowData.nodes) {
		workflowData.nodes.forEach((node: any) => {
			// Apply credential mappings
			if (node.credentials) {
				Object.keys(node.credentials).forEach((credType) => {
					const mappedCredId = credentialMappings[credType];
					if (mappedCredId && mappedCredId !== '__keep__') {
						const mappedCred = credentialsStore.getCredentialById(mappedCredId);
						if (mappedCred) {
							node.credentials[credType] = {
								id: mappedCred.id,
								name: mappedCred.name,
							};
						}
					}
				});
			}

			// Apply subworkflow mappings
			if (node.type === 'n8n-nodes-base.executeWorkflow') {
				const mappedWorkflowId = subworkflowMappings[node.id];
				if (mappedWorkflowId && mappedWorkflowId !== '__keep__') {
					const mappedWorkflow = availableWorkflows.value.find((w) => w.id === mappedWorkflowId);
					if (mappedWorkflow && node.parameters?.workflowId) {
						node.parameters.workflowId = {
							__rl: true,
							value: mappedWorkflow.id,
							mode: 'list',
							cachedResultName: mappedWorkflow.name,
							cachedResultUrl: `/workflow/${mappedWorkflow.id}`,
						};
					}
				}
			}
		});
	}

	nodeViewEventBus.emit('importWorkflowData', { data: workflowData });
	closeModal();
};
</script>

<template>
	<Modal
		:name="WORKFLOW_IMPORT_MAPPING_MODAL_KEY"
		title="Import Workflow (Bitovi Enhanced)"
		:show-close="true"
		:center="true"
		width="700px"
	>
		<template #content>
			<div :class="$style.content">
				<p :class="$style.description">
					Review the workflow configuration below. Map credentials and subworkflows to existing ones
					in your instance before importing.
				</p>

				<div :class="$style.section">
					<h3 :class="$style.heading">Nodes</h3>
					<div :class="$style.list">
						<div v-for="node in nodes" :key="node.id" :class="$style.item">
							<strong>{{ node.name }}</strong>
							<span :class="$style.details">{{ node.type }} (v{{ node.typeVersion }})</span>
						</div>
					</div>
				</div>

				<div v-if="credentialInfo.length > 0" :class="$style.section">
					<h3 :class="$style.heading">Credential Mapping</h3>
					<p :class="$style.hint">
						Map imported credentials to existing credentials in your n8n instance.
					</p>
					<div :class="$style.mappingList">
						<div v-for="cred in credentialInfo" :key="cred.type" :class="$style.mappingRow">
							<div :class="$style.mappingInfo">
								<span :class="$style.mappingType">{{ cred.type }}</span>
								<span :class="$style.mappingOriginal">
									Original: {{ Array.from(cred.originalNames).join(', ') || 'Unknown' }}
								</span>
							</div>
							<div :class="$style.mappingSelect">
								<N8nSelect
									v-if="hasAvailableCredentials(cred.type)"
									v-model="credentialMappings[cred.type]"
									placeholder="Select credential..."
									size="small"
								>
									<N8nOption value="__keep__" label="Keep original (may fail)" />
									<N8nOption
										v-for="availCred in getAvailableCredentials(cred.type)"
										:key="availCred.id"
										:value="availCred.id"
										:label="availCred.name"
									/>
								</N8nSelect>
								<span v-else :class="$style.noItems"> No {{ cred.type }} credentials found </span>
							</div>
						</div>
					</div>
				</div>

				<div v-if="subworkflowInfo.length > 0" :class="$style.section">
					<h3 :class="$style.heading">Subworkflow Mapping</h3>
					<p :class="$style.hint">
						Map subworkflow calls to existing workflows in your n8n instance.
					</p>
					<div :class="$style.mappingList">
						<div v-for="sub in subworkflowInfo" :key="sub.nodeId" :class="$style.mappingRow">
							<div :class="$style.mappingInfo">
								<span :class="$style.mappingType">{{ sub.nodeName }}</span>
								<span :class="$style.mappingOriginal"> Original: {{ sub.originalName }} </span>
							</div>
							<div :class="$style.mappingSelect">
								<N8nSelect
									v-if="!loadingWorkflows && availableWorkflows.length > 0"
									v-model="subworkflowMappings[sub.nodeId]"
									placeholder="Select workflow..."
									size="small"
									filterable
								>
									<N8nOption value="__keep__" label="Keep original (may fail)" />
									<N8nOption
										v-for="wf in availableWorkflows"
										:key="wf.id"
										:value="wf.id"
										:label="wf.name"
									/>
								</N8nSelect>
								<span v-else-if="loadingWorkflows" :class="$style.loading">
									Loading workflows...
								</span>
								<span v-else :class="$style.noItems"> No workflows found </span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<n8n-button type="primary" float="right" @click="confirm"> Import </n8n-button>
				<n8n-button type="secondary" float="right" @click="closeModal"> Cancel </n8n-button>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	padding: var(--spacing-s);
	max-height: 60vh;
	overflow-y: auto;
}

.description {
	margin-bottom: var(--spacing-m);
	color: var(--color-text-base);
}

.section {
	margin-top: var(--spacing-m);
}

.heading {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-base);
	margin-bottom: var(--spacing-xs);
	border-bottom: 1px solid var(--color-border-base);
	padding-bottom: var(--spacing-2xs);
}

.hint {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
	margin-bottom: var(--spacing-s);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing-2xs) var(--spacing-xs);
	background: var(--color-background-xlight);
	border-radius: var(--border-radius-base);
}

.details {
	color: var(--color-text-light);
	font-size: var(--font-size-xs);
}

.mappingList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
}

.mappingRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing-xs);
	background: var(--color-background-xlight);
	border-radius: var(--border-radius-base);
	gap: var(--spacing-m);
}

.mappingInfo {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-3xs);
	flex: 1;
}

.mappingType {
	font-weight: var(--font-weight-bold);
	color: var(--color-text-base);
}

.mappingOriginal {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
}

.mappingSelect {
	min-width: 220px;
}

.noItems {
	font-size: var(--font-size-xs);
	color: var(--color-danger);
	font-style: italic;
}

.loading {
	font-size: var(--font-size-xs);
	color: var(--color-text-light);
	font-style: italic;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing-xs);
}
</style>
