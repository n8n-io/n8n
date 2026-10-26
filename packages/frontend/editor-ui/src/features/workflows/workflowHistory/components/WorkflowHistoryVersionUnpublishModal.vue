<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { DependencyType, ResolvedDependency } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import uniqBy from 'lodash/uniqBy';
import Modal from '@/app/components/Modal.vue';
import { useDependencies } from '@/app/composables/useDependencies';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';
import type { EventBus } from '@n8n/utils/event-bus';

import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nScrollArea,
	N8nText,
} from '@n8n/design-system';

export type WorkflowHistoryVersionUnpublishModalEventBusEvents = {
	unpublish: undefined;
	cancel: undefined;
};

/** Dependents that run the published version, so they break when it goes away. */
const AFFECTED_TYPES: DependencyType[] = ['workflowParent', 'errorWorkflowParent', 'agentUsage'];

const props = defineProps<{
	modalName: string;
	data: {
		workflowId: string;
		workflowName: string;
		eventBus: EventBus<WorkflowHistoryVersionUnpublishModalEventBusEvents>;
	};
}>();

const i18n = useI18n();
const router = useRouter();
const uiStore = useUIStore();
const { fetchDependencies, getDependencies } = useDependencies();
const unpublishing = ref(false);

onMounted(async () => {
	await fetchDependencies([props.data.workflowId], 'workflow');
});

const hrefFor = (dep: ResolvedDependency): string | undefined => {
	if (dep.type === 'agentUsage') {
		if (!dep.projectId) return undefined;
		return router.resolve({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: dep.projectId, agentId: dep.id },
		}).href;
	}
	return router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId: dep.id } }).href;
};

const affectedDependencies = computed(() => {
	const dependencies = getDependencies(props.data.workflowId, 'workflow')?.dependencies ?? [];
	const affected = AFFECTED_TYPES.flatMap((type) =>
		dependencies.filter((dep) => dep.type === type),
	);
	const uniqueAffected = uniqBy(affected, (dep) => {
		const resourceType = dep.type === 'agentUsage' ? 'agent' : 'workflow';
		return `${resourceType}:${dep.id}`;
	});
	return uniqueAffected.map((dep) => ({ ...dep, href: hrefFor(dep) }));
});

const hiddenAffectedCount = computed(
	() => getDependencies(props.data.workflowId, 'workflow')?.inaccessibleAffectedCount ?? 0,
);

const affectedCount = computed(() => affectedDependencies.value.length + hiddenAffectedCount.value);

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};

const onCancel = () => {
	props.data.eventBus.emit('cancel');
	closeModal();
};

const onUnpublish = () => {
	unpublishing.value = true;
	props.data.eventBus.emit('unpublish');
	// Modal will be closed by parent after API call completes
};

onBeforeUnmount(() => {
	unpublishing.value = false;
});
</script>

<template>
	<Modal width="500px" max-height="85vh" :name="props.modalName" :before-close="onCancel">
		<template #header>
			<N8nHeading tag="h2" size="xlarge">
				{{ i18n.baseText('workflowHistory.action.unpublish.modal.title') }}
			</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nIcon :class="$style.icon" icon="triangle-alert" color="warning" size="xlarge" />
				<div :class="$style.body">
					<N8nText size="medium">
						{{
							i18n.baseText('workflowHistory.action.unpublish.modal.description', {
								interpolate: { workflowName: props.data.workflowName },
							})
						}}
					</N8nText>
					<template v-if="affectedCount > 0">
						<N8nText size="medium">
							{{
								i18n.baseText('workflowHistory.action.unpublish.modal.affected', {
									adjustToNumber: affectedCount,
									interpolate: { count: affectedCount },
								})
							}}
						</N8nText>
						<div :class="$style.affected" data-test-id="workflow-unpublish-affected-resources">
							<N8nText size="small" color="text-light" bold>
								{{ i18n.baseText('workflowHistory.action.unpublish.modal.usedBy') }}
							</N8nText>
							<N8nScrollArea max-height="30vh" type="auto">
								<ul v-if="affectedDependencies.length > 0" :class="$style.list">
									<li v-for="dep in affectedDependencies" :key="`${dep.type}-${dep.id}`">
										<N8nLink v-if="dep.href" :to="dep.href" new-window size="small">
											{{ dep.name }}
										</N8nLink>
										<N8nText v-else size="small">{{ dep.name }}</N8nText>
									</li>
								</ul>
								<N8nText v-if="hiddenAffectedCount > 0" size="small" color="text-light">
									{{
										i18n.baseText('workflows.dependencies.hiddenNotice', {
											adjustToNumber: hiddenAffectedCount,
											interpolate: { count: String(hiddenAffectedCount) },
										})
									}}
								</N8nText>
							</N8nScrollArea>
						</div>
					</template>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="outline" size="medium" :disabled="unpublishing" @click="onCancel">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton variant="solid" size="medium" :loading="unpublishing" @click="onUnpublish">
					{{ i18n.baseText('workflowHistory.action.unpublish.modal.button.unpublish') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;

	button {
		margin-left: var(--spacing--2xs);
	}
}

.content {
	display: flex;
	flex-direction: row;
	align-items: start;
	gap: var(--spacing--xs);
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--4xs);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
}

.affected {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.list {
	margin: 0;
	padding-left: var(--spacing--md);
	list-style: disc;
}
</style>
