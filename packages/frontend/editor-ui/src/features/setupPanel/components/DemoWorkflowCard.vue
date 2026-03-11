<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { type IPinData } from 'n8n-workflow';
import cloneDeep from 'lodash/cloneDeep';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { useRouter } from 'vue-router';

type CardState = 'init' | 'skip' | 'ran' | 'clear';

const router = useRouter();

const state = ref<CardState>('init');

const expanded = computed(() => state.value === 'init');

const emit = defineEmits<{
	exitDemo: [];
	reenterDemo: [];
	testWorkflow: [];
}>();

const pinDataHoldover = ref<IPinData | null>(null);

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();

const workflow = computed(() => workflowsStore.workflow);

const headerText = computed(
	() =>
		({
			init: i18n.baseText('setupPanel.readyToDemo.header'),
			clear: i18n.baseText('setupPanel.readyToDemo.ran'),
			ran: i18n.baseText('setupPanel.readyToDemo.ran'),
			skip: i18n.baseText('setupPanel.readyToDemo.skipped'),
		})[state.value],
);

const onExitDemo = () => {
	pinDataHoldover.value = cloneDeep(workflow.value.pinData ?? {});
	workflowsStore.setWorkflowPinData({});
	state.value = 'skip';
};

const onReenterDemo = () => {
	workflowsStore.setWorkflowPinData(pinDataHoldover.value ?? {});
	state.value = 'init';
};

const onClearDemoData = () => {
	pinDataHoldover.value = cloneDeep(workflow.value.pinData ?? {});
	workflowsStore.setWorkflowPinData({});
	state.value = 'clear';
};
const { runEntireWorkflow } = useRunWorkflow({ router });

const onTestClick = () => {
	state.value = 'ran';
	void runEntireWorkflow('main');
	emit('testWorkflow');
};
</script>

<template>
	<div
		:class="[
			$style.card,
			{ [$style.collapsed]: !expanded, [$style.completed]: state === 'ran' || state === 'clear' },
		]"
	>
		<header :class="$style.header">
			<N8nIcon
				v-if="state === 'ran' || state === 'clear'"
				icon="check"
				:class="$style['complete-icon']"
				size="medium"
			/>
			<span :class="$style['title']" data-test-id="dwc-header">{{ headerText }}</span>
			<N8nTooltip
				v-if="state === 'ran'"
				:content="i18n.baseText('setupPanel.readyToDemo.clearTooltip')"
			>
				<N8nText
					:class="$style.clickableText"
					size="xsmall"
					color="text-base"
					data-test-id="dwc-clear"
					@click="onClearDemoData"
					>{{ i18n.baseText('setupPanel.readyToDemo.clear') }}</N8nText
				>
			</N8nTooltip>
			<N8nTooltip
				v-else-if="state === 'clear' || state === 'skip'"
				:content="i18n.baseText('setupPanel.readyToDemo.undoTooltip')"
			>
				<N8nText
					:class="$style.clickableText"
					size="xsmall"
					color="text-base"
					data-test-id="dwc-undo"
					@click="onReenterDemo"
					>{{ i18n.baseText('generic.undo') }}</N8nText
				>
			</N8nTooltip>
		</header>

		<template v-if="expanded">
			<div :class="$style.content">
				<N8nText data-test-id="dwc-description">
					{{ i18n.baseText('setupPanel.readyToDemo.description') }}
				</N8nText>
			</div>

			<footer :class="$style.footer">
				<N8nTooltip :content="i18n.baseText('setupPanel.readyToDemo.skipTooltip')">
					<N8nButton
						data-test-id="dwc-skip-button"
						:label="i18n.baseText('setupPanel.readyToDemo.skip')"
						type="secondary"
						size="small"
						@click="onExitDemo"
					/>
				</N8nTooltip>
				<N8nTooltip :content="i18n.baseText('setupPanel.readyToDemo.runTooltip')">
					<N8nButton
						data-test-id="dwc-run-button"
						type="primary"
						:label="i18n.baseText('setupPanel.readyToDemo.run')"
						icon="play"
						size="small"
						@click="onTestClick"
					/>
				</N8nTooltip>
			</footer>
		</template>
	</div>
</template>

<style module lang="scss">
.card {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
}

.header {
	display: flex;
	gap: var(--spacing--xs);
	cursor: pointer;
	user-select: none;
	padding: var(--spacing--sm) var(--spacing--sm) 0;
	align-items: center;
}

.title {
	flex: 1;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
}

.complete-icon {
	color: var(--color--success);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: 0 var(--spacing--sm);
}

.shared-nodes-hint {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	cursor: default;
}

.credential-picker {
	flex: 1;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}

.card.collapsed {
	.header {
		padding: var(--spacing--sm);
	}

	.title {
		color: var(--color--text--tint-1);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
}

.card.completed {
	border-color: var(--color--success);

	.footer {
		justify-content: space-between;
	}
}

.clickableText {
	cursor: pointer;
	&:hover {
		text-decoration: underline;
	}
}
</style>
