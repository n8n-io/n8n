<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { PRE_BUILT_AGENTS_MODAL_KEY } from '@/constants';
import { N8nHeading } from '@n8n/design-system';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed } from 'vue';
import { useCalloutHelpers } from '@/composables/useCalloutHelpers';
import type { INodeCreateElement } from '@/Interface';

const i18n = useI18n();
const modalBus = createEventBus();

const calloutHelpers = useCalloutHelpers();

const preBuiltAgents = computed<INodeCreateElement[]>(() =>
	calloutHelpers.getPreBuiltAgentNodeCreatorItems(),
);

function onSelected(actionCreateElement: INodeCreateElement) {
	if (actionCreateElement.type === 'openTemplate') {
		calloutHelpers.openSampleWorkflowTemplate(actionCreateElement.properties.templateId, {
			telemetry: {
				source: 'modal',
			},
		});
	}
}
</script>

<template>
	<Modal
		max-width="500px"
		max-height="85vh"
		:event-bus="modalBus"
		:name="PRE_BUILT_AGENTS_MODAL_KEY"
		:center="true"
		:show-close="true"
		:class="$style.modal"
	>
		<template #header>
			<div :class="$style.header">
				<N8nHeading size="xlarge">{{ i18n.baseText('workflows.empty.preBuiltAgents') }}</N8nHeading>
			</div>
		</template>
		<template #content>
			<div :class="$style.container">
				<ItemsRenderer :elements="preBuiltAgents" :class="$style.items" @selected="onSelected" />
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.modal {
	:global(.el-dialog__body) {
		padding: 0;
		padding-bottom: var(--spacing-s);
	}
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: var(--spacing-s);
}

.container {
	display: flex;
	flex-direction: column;
	min-height: 100%;
}

.item {
	margin-left: 0;
	margin-right: 0;
	padding-right: 0;
}
</style>
