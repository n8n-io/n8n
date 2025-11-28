<script lang="ts" setup>
import { computed } from 'vue';
import { useDependencyGraphStore } from '../dependencyGraph.store';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants/navigation';
import {
	N8nButton,
	N8nIcon,
	N8nText,
	N8nBadge,
	N8nSpinner,
	N8nIconButton,
} from '@n8n/design-system';

const store = useDependencyGraphStore();
const router = useRouter();

const selectedNode = computed(() => store.selectedNode);
const workflowDependencies = computed(() => store.workflowDependencies);
const credentialUsage = computed(() => store.credentialUsage);
const impactAnalysis = computed(() => store.impactAnalysis);
const isLoading = computed(() => store.detailsLoading);

const nodeType = computed(() => selectedNode.value?.type ?? 'workflow');
const nodeId = computed(() => {
	if (!selectedNode.value) return '';
	return selectedNode.value.id.replace(`${nodeType.value}:`, '');
});

function navigateToWorkflow(workflowId: string) {
	void router.push({ name: VIEWS.WORKFLOW, params: { name: workflowId } });
}

function navigateToCredential(credentialId: string) {
	void router.push({ name: VIEWS.CREDENTIALS, query: { credentialId } });
}

function closePanel() {
	store.selectNode(null);
}
</script>

<template>
	<div v-if="selectedNode" :class="$style.sidebar">
		<!-- Header -->
		<div :class="$style.header">
			<div :class="$style.headerMain">
				<div :class="[$style.nodeIcon, selectedNode.type === 'credential' && $style.credential]">
					<N8nIcon
						:icon="selectedNode.type === 'workflow' ? 'waypoints' : 'key-round'"
						size="medium"
					/>
				</div>
				<div :class="$style.headerContent">
					<h3 :class="$style.title">{{ selectedNode.name }}</h3>
					<div :class="$style.meta">
						<N8nBadge
							:theme="selectedNode.type === 'workflow' ? 'default' : 'warning'"
							size="small"
						>
							{{ selectedNode.type === 'workflow' ? 'Workflow' : 'Credential' }}
						</N8nBadge>
						<N8nBadge
							v-if="selectedNode.type === 'workflow' && selectedNode.active"
							theme="success"
							size="small"
						>
							Active
						</N8nBadge>
					</div>
				</div>
			</div>
			<N8nIconButton icon="x" type="tertiary" size="small" text="Close" @click="closePanel" />
		</div>

		<!-- Actions -->
		<div :class="$style.actions">
			<N8nButton
				v-if="selectedNode.type === 'workflow'"
				type="primary"
				size="small"
				icon="external-link"
				@click="navigateToWorkflow(nodeId)"
			>
				Open Workflow
			</N8nButton>
			<N8nButton
				v-else
				type="primary"
				size="small"
				icon="external-link"
				@click="navigateToCredential(nodeId)"
			>
				View Credential
			</N8nButton>
		</div>

		<!-- Content -->
		<div :class="$style.content">
			<!-- Loading -->
			<div v-if="isLoading" :class="$style.loading">
				<N8nSpinner size="medium" />
				<N8nText color="text-light" size="small">Loading details...</N8nText>
			</div>

			<!-- Workflow Details -->
			<template v-else-if="selectedNode.type === 'workflow' && workflowDependencies">
				<!-- Credentials Used -->
				<div v-if="workflowDependencies.dependencies.credentials.length" :class="$style.section">
					<div :class="$style.sectionHeader">
						<N8nIcon icon="key-round" size="small" />
						<span>Credentials Used</span>
						<N8nBadge size="small" theme="default">
							{{ workflowDependencies.dependencies.credentials.length }}
						</N8nBadge>
					</div>
					<div :class="$style.list">
						<button
							v-for="cred in workflowDependencies.dependencies.credentials"
							:key="cred.id"
							:class="$style.listItem"
							@click="navigateToCredential(cred.id)"
						>
							<div :class="[$style.itemIcon, $style.credentialIcon]">
								<N8nIcon icon="key-round" size="small" />
							</div>
							<div :class="$style.itemContent">
								<span :class="$style.itemName">{{ cred.name ?? 'Unknown' }}</span>
								<span v-if="cred.type" :class="$style.itemMeta">{{ cred.type }}</span>
							</div>
							<N8nIcon icon="chevron-right" size="small" :class="$style.itemArrow" />
						</button>
					</div>
				</div>

				<!-- Calls Workflows -->
				<div
					v-if="workflowDependencies.dependencies.calledWorkflows.length"
					:class="$style.section"
				>
					<div :class="$style.sectionHeader">
						<N8nIcon icon="arrow-right" size="small" />
						<span>Calls Workflows</span>
						<N8nBadge size="small" theme="default">
							{{ workflowDependencies.dependencies.calledWorkflows.length }}
						</N8nBadge>
					</div>
					<div :class="$style.list">
						<button
							v-for="wf in workflowDependencies.dependencies.calledWorkflows"
							:key="wf.id"
							:class="$style.listItem"
							@click="navigateToWorkflow(wf.id)"
						>
							<div :class="[$style.itemIcon, $style.workflowIcon]">
								<N8nIcon icon="waypoints" size="small" />
							</div>
							<span :class="$style.itemName">{{ wf.name ?? 'Unknown' }}</span>
							<N8nIcon icon="chevron-right" size="small" :class="$style.itemArrow" />
						</button>
					</div>
				</div>

				<!-- Called By -->
				<div
					v-if="workflowDependencies.dependents.calledByWorkflows.length"
					:class="$style.section"
				>
					<div :class="$style.sectionHeader">
						<N8nIcon icon="arrow-left" size="small" />
						<span>Called By</span>
						<N8nBadge size="small" theme="default">
							{{ workflowDependencies.dependents.calledByWorkflows.length }}
						</N8nBadge>
					</div>
					<div :class="$style.list">
						<button
							v-for="wf in workflowDependencies.dependents.calledByWorkflows"
							:key="wf.id"
							:class="$style.listItem"
							@click="navigateToWorkflow(wf.id)"
						>
							<div :class="[$style.itemIcon, $style.workflowIcon]">
								<N8nIcon icon="waypoints" size="small" />
							</div>
							<span :class="$style.itemName">{{ wf.name }}</span>
							<N8nIcon icon="chevron-right" size="small" :class="$style.itemArrow" />
						</button>
					</div>
				</div>

				<!-- Node Types -->
				<div v-if="workflowDependencies.dependencies.nodeTypes.length" :class="$style.section">
					<div :class="$style.sectionHeader">
						<N8nIcon icon="box" size="small" />
						<span>Node Types</span>
						<N8nBadge size="small" theme="default">
							{{ workflowDependencies.dependencies.nodeTypes.length }}
						</N8nBadge>
					</div>
					<div :class="$style.tags">
						<span
							v-for="nt in workflowDependencies.dependencies.nodeTypes"
							:key="nt.type"
							:class="$style.tag"
						>
							{{ nt.type.split('.').pop() }}
							<span v-if="nt.count > 1" :class="$style.tagCount">×{{ nt.count }}</span>
						</span>
					</div>
				</div>

				<!-- No Dependencies -->
				<div
					v-if="
						!workflowDependencies.dependencies.credentials.length &&
						!workflowDependencies.dependencies.calledWorkflows.length &&
						!workflowDependencies.dependents.calledByWorkflows.length
					"
					:class="$style.empty"
				>
					<N8nIcon icon="circle-check" :class="$style.emptyIcon" />
					<N8nText color="text-light">No external dependencies</N8nText>
				</div>
			</template>

			<!-- Credential Details -->
			<template v-else-if="selectedNode.type === 'credential' && credentialUsage">
				<div :class="$style.section">
					<div :class="$style.infoCard">
						<span :class="$style.infoLabel">Type</span>
						<span :class="$style.infoValue">{{ credentialUsage.credentialType }}</span>
					</div>
				</div>

				<div v-if="credentialUsage.usedByWorkflows.length" :class="$style.section">
					<div :class="$style.sectionHeader">
						<N8nIcon icon="waypoints" size="small" />
						<span>Used By</span>
						<N8nBadge size="small" theme="default">
							{{ credentialUsage.usedByWorkflows.length }}
						</N8nBadge>
					</div>
					<div :class="$style.list">
						<button
							v-for="wf in credentialUsage.usedByWorkflows"
							:key="wf.id"
							:class="$style.listItem"
							@click="navigateToWorkflow(wf.id)"
						>
							<div :class="[$style.itemIcon, $style.workflowIcon]">
								<N8nIcon icon="waypoints" size="small" />
							</div>
							<span :class="$style.itemName">{{ wf.name }}</span>
							<N8nBadge v-if="wf.active" size="small" theme="success">Active</N8nBadge>
							<N8nIcon icon="chevron-right" size="small" :class="$style.itemArrow" />
						</button>
					</div>
				</div>

				<div v-else :class="$style.empty">
					<N8nIcon icon="info" :class="$style.emptyIcon" />
					<N8nText color="text-light">Not used by any workflow</N8nText>
				</div>
			</template>

			<!-- Impact Warning -->
			<div v-if="impactAnalysis && impactAnalysis.totalImpactedCount > 0" :class="$style.impact">
				<div :class="$style.impactHeader">
					<N8nIcon icon="triangle-alert" size="small" />
					<span>Impact Analysis</span>
				</div>
				<N8nText size="small" :class="$style.impactText">
					Removing this {{ impactAnalysis.resourceType }} will affect
					<strong>{{ impactAnalysis.totalImpactedCount }}</strong> workflow(s)
					<span v-if="impactAnalysis.activeImpactedCount > 0" :class="$style.impactActive">
						({{ impactAnalysis.activeImpactedCount }} active)
					</span>
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.sidebar {
	width: 320px;
	height: 100%;
	background: var(--color--background--light-1);
	border-left: 1px solid var(--color--foreground);
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--s);
	padding: var(--spacing--s);
	border-bottom: 1px solid var(--color--foreground);
}

.headerMain {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--s);
	min-width: 0;
	flex: 1;
}

.nodeIcon {
	width: 40px;
	height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color--foreground--tint-1);
	border-radius: var(--radius--base);
	color: var(--color--text);
	flex-shrink: 0;

	&.credential {
		background: var(--color--warning-tint-2);
		color: var(--color--warning);
	}
}

.headerContent {
	min-width: 0;
	flex: 1;
}

.title {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	margin: 0 0 var(--spacing--3xs) 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.meta {
	display: flex;
	gap: var(--spacing--2xs);
}

.actions {
	padding: var(--spacing--s);
	border-bottom: 1px solid var(--color--foreground);
}

.content {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--s);
}

.loading {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--s);
	padding: var(--spacing--xl);
}

.section {
	margin-bottom: var(--spacing--md);

	&:last-child {
		margin-bottom: 0;
	}
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin-bottom: var(--spacing--xs);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.listItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	background: var(--color--background--light-2);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--base);
	cursor: pointer;
	transition: all 0.15s ease;
	text-align: left;
	width: 100%;

	&:hover {
		background: var(--color--background);
		border-color: var(--color--foreground--shade-1);
	}
}

.itemIcon {
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius--sm);
	flex-shrink: 0;

	&.workflowIcon {
		background: var(--color--foreground--tint-1);
		color: var(--color--text);
	}

	&.credentialIcon {
		background: var(--color--warning-tint-2);
		color: var(--color--warning);
	}
}

.itemContent {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.itemName {
	font-size: var(--font-size--s);
	color: var(--color--text--shade-1);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	flex: 1;
}

.itemMeta {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.itemArrow {
	color: var(--color--text--tint-1);
	opacity: 0;
	transition: opacity 0.15s ease;

	.listItem:hover & {
		opacity: 1;
	}
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.tag {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	background: var(--color--background);
	border-radius: var(--radius--base);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}

.tagCount {
	color: var(--color--text--tint-1);
}

.infoCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);
	background: var(--color--background--light-2);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--base);
}

.infoLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.infoValue {
	font-size: var(--font-size--s);
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--medium);
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--l);
	text-align: center;
}

.emptyIcon {
	color: var(--color--text--tint-1);
	opacity: 0.5;
}

.impact {
	margin-top: var(--spacing--s);
	padding: var(--spacing--s);
	background: var(--color--warning-tint-2);
	border: 1px solid var(--color--warning-tint-1);
	border-radius: var(--radius--base);
}

.impactHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--warning);
	margin-bottom: var(--spacing--2xs);
}

.impactText {
	color: var(--color--text);
}

.impactActive {
	color: var(--color--warning);
	font-weight: var(--font-weight--bold);
}
</style>
