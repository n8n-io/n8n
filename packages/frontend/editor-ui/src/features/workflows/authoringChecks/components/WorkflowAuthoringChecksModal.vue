<script setup lang="ts">
import type { WorkflowCheckResult } from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed } from 'vue';

import Modal from '@/app/components/Modal.vue';

import { WORKFLOW_AUTHORING_CHECKS_MODAL_KEY } from '../authoringChecks.constants';

const props = defineProps<{
	data: {
		results: WorkflowCheckResult[];
		onConfirm?: () => void;
	};
}>();

const i18n = useI18n();
const modalBus = createEventBus();

const hasBlocking = computed(() => props.data.results.some((r) => r.severity === 'blocking'));

const title = computed(() =>
	hasBlocking.value
		? i18n.baseText('workflowAuthoringChecks.modal.title.blocking')
		: i18n.baseText('workflowAuthoringChecks.modal.title.warning'),
);

const calloutTheme = computed<'danger' | 'warning'>(() =>
	hasBlocking.value ? 'danger' : 'warning',
);

const calloutMessage = computed(() =>
	hasBlocking.value
		? i18n.baseText('workflowAuthoringChecks.modal.callout.blocking')
		: i18n.baseText('workflowAuthoringChecks.modal.callout.warning'),
);

function closeModal() {
	modalBus.emit('close');
}

function confirm() {
	props.data.onConfirm?.();
	modalBus.emit('close');
}
</script>

<template>
	<Modal
		width="560px"
		:name="WORKFLOW_AUTHORING_CHECKS_MODAL_KEY"
		:title="title"
		:event-bus="modalBus"
		:center="true"
	>
		<template #content>
			<div :class="$style.container">
				<N8nCallout :theme="calloutTheme" data-test-id="workflow-authoring-checks-callout">
					{{ calloutMessage }}
				</N8nCallout>
				<ul :class="$style.list">
					<li
						v-for="result in data.results"
						:key="result.checkId"
						:class="$style.item"
						:data-test-id="`workflow-authoring-check-${result.checkId}`"
					>
						<div :class="$style.itemHeader">
							<N8nHeading tag="h4" size="small">{{ result.title }}</N8nHeading>
							<span
								:class="[
									$style.severity,
									result.severity === 'blocking' ? $style.blocking : $style.warning,
								]"
							>
								{{
									result.severity === 'blocking'
										? i18n.baseText('workflowAuthoringChecks.severity.blocking')
										: i18n.baseText('workflowAuthoringChecks.severity.warning')
								}}
							</span>
						</div>
						<ul :class="$style.violations">
							<li v-for="(violation, idx) in result.violations" :key="idx">
								<N8nText color="text-base">{{ violation.message }}</N8nText>
							</li>
						</ul>
					</li>
				</ul>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					:label="
						hasBlocking
							? i18n.baseText('workflowAuthoringChecks.button.close')
							: i18n.baseText('workflowAuthoringChecks.button.cancel')
					"
					data-test-id="workflow-authoring-checks-close-button"
					@click="closeModal"
				/>
				<N8nButton
					v-if="!hasBlocking"
					:label="i18n.baseText('workflowAuthoringChecks.button.publishAnyway')"
					data-test-id="workflow-authoring-checks-publish-anyway-button"
					@click="confirm"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	list-style: none;
	padding: 0;
	margin: 0;
}

.item {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
}

.itemHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--xs);
}

.severity {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.severity.blocking {
	color: var(--color--danger);
}

.severity.warning {
	color: var(--color--warning);
}

.violations {
	list-style: disc inside;
	padding-left: var(--spacing--2xs);
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
