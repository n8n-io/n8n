<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import type { BaseTextKey } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { DATA_TABLE_DETAILS } from '@/features/core/dataTable/constants';

interface ResolvedDependency {
	type: string;
	id: string;
	name: string;
	projectId?: string;
}

type DependencyType = 'credentialId' | 'dataTableId' | 'workflowCall' | 'workflowParent';

const props = defineProps<{
	modalName: string;
	data: {
		workflowId: string;
		workflowName: string;
		dependencies: ResolvedDependency[];
	};
}>();

const i18n = useI18n();
const router = useRouter();
const uiStore = useUIStore();
const typeConfig = {
	credentialId: {
		icon: 'key-round' as const,
		labelKey: 'workflows.dependencies.type.credentials' as BaseTextKey,
	},
	dataTableId: {
		icon: 'table' as const,
		labelKey: 'workflows.dependencies.type.dataTables' as BaseTextKey,
	},
	workflowCall: {
		icon: 'log-in' as const,
		labelKey: 'workflows.dependencies.type.subWorkflows' as BaseTextKey,
	},
	workflowParent: {
		icon: 'log-in' as const,
		labelKey: 'workflows.dependencies.type.parentWorkflows' as BaseTextKey,
	},
} satisfies Record<DependencyType, { icon: string; labelKey: BaseTextKey }>;

const displayOrder: DependencyType[] = [
	'credentialId',
	'dataTableId',
	'workflowCall',
	'workflowParent',
];

const groupedDependencies = computed(() => {
	const groups: Record<DependencyType, ResolvedDependency[]> = {
		credentialId: [],
		dataTableId: [],
		workflowCall: [],
		workflowParent: [],
	};
	for (const dep of props.data.dependencies) {
		const key = dep.type as DependencyType;
		if (groups[key]) {
			groups[key].push(dep);
		}
	}
	return groups;
});

function isClickable(dep: ResolvedDependency): boolean {
	return (
		dep.type === 'credentialId' ||
		dep.type === 'workflowCall' ||
		dep.type === 'workflowParent' ||
		(dep.type === 'dataTableId' && !!dep.projectId)
	);
}

function opensNewTab(dep: ResolvedDependency): boolean {
	return dep.type === 'workflowCall' || dep.type === 'workflowParent' || dep.type === 'dataTableId';
}

function onClickDependency(dep: ResolvedDependency) {
	if (dep.type === 'credentialId') {
		uiStore.openExistingCredential(dep.id);
	} else if (dep.type === 'workflowCall' || dep.type === 'workflowParent') {
		const href = router.resolve({ name: VIEWS.WORKFLOW, params: { name: dep.id } }).href;
		window.open(href, '_blank');
	} else if (dep.type === 'dataTableId' && dep.projectId) {
		const href = router.resolve({
			name: DATA_TABLE_DETAILS,
			params: { projectId: dep.projectId, id: dep.id },
		}).href;
		window.open(href, '_blank');
	}
}
</script>

<template>
	<Modal
		:name="modalName"
		width="500px"
		:title="i18n.baseText('workflows.dependencies.modal.title' as BaseTextKey)"
	>
		<template #content>
			<div :class="$style.content">
				<template v-for="typeKey in displayOrder" :key="typeKey">
					<div v-if="groupedDependencies[typeKey].length > 0" :class="$style.group">
						<div :class="$style.groupHeader">
							<N8nIcon :icon="typeConfig[typeKey].icon" size="small" />
							<N8nText bold size="small">
								{{ i18n.baseText(typeConfig[typeKey].labelKey) }}
							</N8nText>
						</div>
						<ul :class="$style.depList">
							<li
								v-for="dep in groupedDependencies[typeKey]"
								:key="dep.id"
								:class="[$style.depRow, isClickable(dep) && $style.depRowClickable]"
								data-test-id="workflow-dependency-item"
								@click="onClickDependency(dep)"
							>
								<N8nText size="small" :class="$style.depName">
									{{ dep.name }}
								</N8nText>
								<N8nIcon
									v-if="opensNewTab(dep)"
									icon="external-link"
									size="small"
									:class="$style.depLinkIcon"
								/>
							</li>
						</ul>
					</div>
				</template>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.groupHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--color--text--tint-1);
	padding-bottom: var(--spacing--4xs);
	border-bottom: var(--border);
	margin-bottom: var(--spacing--4xs);
}

.depList {
	list-style: none;
	padding: 0;
	margin: 0;
}

.depRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius);
}

.depRowClickable {
	cursor: pointer;

	&:hover {
		background-color: var(--color--background--light-2);
	}

	&:hover .depLinkIcon {
		opacity: 1;
	}
}

.depName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.depLinkIcon {
	flex-shrink: 0;
	opacity: 0;
	color: var(--color--text--tint-2);
	transition: opacity 0.15s ease;
}
</style>
