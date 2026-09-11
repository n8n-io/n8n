<script lang="ts" setup>
import type { AppBlueprint, AppThemeSettings } from '@n8n/api-types';
import {
	N8nButton,
	N8nColorPicker,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nSegmentControl,
	N8nText,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { useThread } from '../instanceAi.store';
import ConfirmationFooter from './ConfirmationFooter.vue';

const props = defineProps<{
	requestId: string;
	inputThreadId?: string;
	blueprint: AppBlueprint;
	readOnly?: boolean;
	expired?: boolean;
}>();

const thread = useThread();
const i18n = useI18n();
const telemetry = useTelemetry();
const rootStore = useRootStore();

// Same slug rule as `appNamespaceSchema` in @n8n/api-types.
const NAMESPACE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const toNamespace = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const name = ref(props.blueprint.name);
// Follows the name until the user types into the namespace field.
const editedNamespace = ref<string | null>(null);
const namespace = computed({
	get: () => editedNamespace.value ?? toNamespace(name.value),
	set: (value: string) => {
		editedNamespace.value = value;
	},
});
const removedWorkflowIds = ref(new Set<string>());
const primary = ref(props.blueprint.theme.primary);
const mode = ref<AppThemeSettings['mode']>(props.blueprint.theme.mode);
const requestingChanges = ref(false);
const feedback = ref('');
const submitted = ref(false);

// A re-proposed blueprint reuses the card instance when the tool call id is stable.
watch(
	() => props.blueprint,
	(next) => {
		name.value = next.name;
		editedNamespace.value = null;
		removedWorkflowIds.value = new Set();
		primary.value = next.theme.primary;
		mode.value = next.theme.mode;
	},
);

const isResolved = computed(
	() =>
		submitted.value ||
		Boolean(props.readOnly) ||
		Boolean(props.expired) ||
		thread.resolvedConfirmationIds.has(props.requestId),
);

const status = computed(() => thread.resolvedConfirmationIds.get(props.requestId));

const titleKey = computed<BaseTextKey>(() => {
	if (props.expired) return 'instanceAi.appBlueprint.titleExpired';
	if (isResolved.value) return 'instanceAi.appBlueprint.titleResolved';
	return 'instanceAi.appBlueprint.title';
});

const modeOptions = computed(() => [
	{ label: i18n.baseText('apps.builder.theme.mode.light'), value: 'light' as const },
	{ label: i18n.baseText('apps.builder.theme.mode.dark'), value: 'dark' as const },
	{ label: i18n.baseText('apps.builder.theme.mode.system'), value: 'system' as const },
]);

const workflows = computed(() =>
	props.blueprint.workflows.filter(
		(workflow) => !removedWorkflowIds.value.has(workflow.workflowId),
	),
);

const namespaceValid = computed(
	() => NAMESPACE_REGEX.test(namespace.value) && namespace.value.length <= 128,
);
const nameValid = computed(() => name.value.trim().length > 0 && name.value.length <= 128);
const canApprove = computed(() => nameValid.value && namespaceValid.value);

const edited = computed<AppBlueprint>(() => ({
	...props.blueprint,
	name: name.value.trim(),
	namespace: namespace.value,
	workflows: workflows.value,
	theme: { ...props.blueprint.theme, primary: primary.value, mode: mode.value },
}));

function removeWorkflow(workflowId: string) {
	removedWorkflowIds.value = new Set([...removedWorkflowIds.value, workflowId]);
}

function track(optionChosen: 'approve' | 'request-changes') {
	telemetry.track('User finished providing input', {
		thread_id: thread.id,
		input_thread_id: props.inputThreadId ?? '',
		instance_id: rootStore.instanceId,
		type: 'app-blueprint',
		provided_inputs: [
			{
				label: 'app-blueprint',
				options: ['approve', 'request-changes'],
				option_chosen: optionChosen,
			},
		],
		skipped_inputs: [],
		num_pages: props.blueprint.pages.length,
		num_workflows: workflows.value.length,
	});
}

async function approve() {
	if (isResolved.value || !canApprove.value) return;
	submitted.value = true;
	const confirmed = await thread.confirmAction(props.requestId, {
		kind: 'appBlueprint',
		approved: true,
		blueprint: edited.value,
	});
	if (!confirmed) {
		submitted.value = false;
		return;
	}
	track('approve');
	thread.resolveConfirmation(props.requestId, 'approved');
}

async function requestChanges() {
	if (isResolved.value || !feedback.value.trim()) return;
	submitted.value = true;
	const confirmed = await thread.confirmAction(props.requestId, {
		kind: 'appBlueprint',
		approved: false,
		feedback: feedback.value.trim(),
	});
	if (!confirmed) {
		submitted.value = false;
		return;
	}
	track('request-changes');
	thread.resolveConfirmation(props.requestId, 'changes-requested');
}
</script>

<template>
	<div
		:class="[$style.root, !isResolved && $style.awaitingInput]"
		data-test-id="instance-ai-app-blueprint"
	>
		<div :class="$style.header">
			<span :class="$style.headerTitleGroup">
				<N8nIcon icon="app-window" size="medium" />
				<N8nText size="large">{{ i18n.baseText(titleKey) }}</N8nText>
			</span>
			<N8nText
				v-if="status === 'changes-requested'"
				size="small"
				bold
				color="text-light"
				data-test-id="instance-ai-app-blueprint-changes-requested"
			>
				{{ i18n.baseText('instanceAi.planReview.changesRequested') }}
			</N8nText>
		</div>

		<div :class="$style.body">
			<div :class="$style.grid">
				<label :class="$style.field">
					<N8nText size="xsmall" bold color="text-light" :class="$style.label">
						{{ i18n.baseText('instanceAi.appBlueprint.name') }}
					</N8nText>
					<N8nInput
						v-model="name"
						size="small"
						:disabled="isResolved"
						data-test-id="instance-ai-app-blueprint-name"
					/>
				</label>
				<label :class="$style.field">
					<N8nText size="xsmall" bold color="text-light" :class="$style.label">
						{{ i18n.baseText('instanceAi.appBlueprint.namespace') }}
					</N8nText>
					<N8nInput
						v-model="namespace"
						size="small"
						:disabled="isResolved"
						data-test-id="instance-ai-app-blueprint-namespace"
					/>
					<N8nText
						size="xsmall"
						:color="namespaceValid ? 'text-light' : 'danger'"
						data-test-id="instance-ai-app-blueprint-url"
					>
						{{
							namespaceValid
								? `/apps/${namespace}/`
								: i18n.baseText('apps.add.input.namespace.error.regex')
						}}
					</N8nText>
				</label>
			</div>

			<div :class="$style.field">
				<N8nText size="xsmall" bold color="text-light" :class="$style.label">
					{{ i18n.baseText('instanceAi.appBlueprint.summary') }}
				</N8nText>
				<N8nText size="small">{{ blueprint.summary }}</N8nText>
			</div>

			<div :class="$style.field">
				<N8nText size="xsmall" bold color="text-light" :class="$style.label">
					{{ i18n.baseText('instanceAi.appBlueprint.pages') }}
				</N8nText>
				<ul :class="$style.list">
					<li
						v-for="page in blueprint.pages"
						:key="page.route"
						:class="$style.row"
						data-test-id="instance-ai-app-blueprint-page"
					>
						<code :class="$style.code">{{ page.route }}</code>
						<N8nText size="small" color="text-light">{{ page.purpose }}</N8nText>
					</li>
				</ul>
			</div>

			<div v-if="blueprint.workflows.length > 0" :class="$style.field">
				<N8nText size="xsmall" bold color="text-light" :class="$style.label">
					{{ i18n.baseText('instanceAi.appBlueprint.workflows') }}
				</N8nText>
				<ul :class="$style.list">
					<li
						v-for="workflow in workflows"
						:key="workflow.workflowId"
						:class="$style.row"
						data-test-id="instance-ai-app-blueprint-workflow"
					>
						<N8nIcon icon="workflow" size="small" />
						<N8nText size="small" :class="$style.rowGrow">{{ workflow.name }}</N8nText>
						<code :class="$style.code">{{ workflow.key }}</code>
						<N8nIconButton
							v-if="!isResolved"
							icon="x"
							variant="ghost"
							size="mini"
							:aria-label="i18n.baseText('generic.delete')"
							data-test-id="instance-ai-app-blueprint-workflow-remove"
							@click="removeWorkflow(workflow.workflowId)"
						/>
					</li>
					<li v-if="workflows.length === 0" :class="$style.row">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('instanceAi.appBlueprint.workflows.none') }}
						</N8nText>
					</li>
				</ul>
			</div>

			<div :class="$style.grid">
				<div :class="$style.field">
					<N8nText size="xsmall" bold color="text-light" :class="$style.label">
						{{ i18n.baseText('apps.builder.theme.accent.label') }}
					</N8nText>
					<div :class="$style.row">
						<N8nColorPicker
							v-model="primary"
							size="small"
							:disabled="isResolved"
							data-test-id="instance-ai-app-blueprint-primary"
						/>
						<code :class="$style.code">{{ primary }}</code>
					</div>
				</div>
				<div :class="$style.field">
					<N8nText size="xsmall" bold color="text-light" :class="$style.label">
						{{ i18n.baseText('apps.builder.theme.mode.label') }}
					</N8nText>
					<N8nSegmentControl
						v-model="mode"
						:options="modeOptions"
						size="small"
						:disabled="isResolved"
						data-test-id="instance-ai-app-blueprint-mode"
					/>
				</div>
			</div>
		</div>

		<template v-if="!isResolved">
			<ConfirmationFooter v-if="!requestingChanges" layout="row-between" bordered>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('instanceAi.appBlueprint.hint') }}
				</N8nText>
				<div :class="$style.footerActions">
					<N8nButton
						variant="outline"
						size="medium"
						data-test-id="instance-ai-app-blueprint-request-changes"
						@click="requestingChanges = true"
					>
						{{ i18n.baseText('instanceAi.appBlueprint.requestChanges') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						size="medium"
						:disabled="!canApprove"
						data-test-id="instance-ai-app-blueprint-approve"
						@click="approve"
					>
						{{ i18n.baseText('instanceAi.appBlueprint.approve') }}
					</N8nButton>
				</div>
			</ConfirmationFooter>
			<ConfirmationFooter v-else layout="column" bordered>
				<N8nInput
					v-model="feedback"
					type="textarea"
					:rows="2"
					:placeholder="i18n.baseText('instanceAi.appBlueprint.feedback.placeholder')"
					data-test-id="instance-ai-app-blueprint-feedback"
					@keydown.enter.exact.prevent="requestChanges"
				/>
				<div :class="$style.footerActions">
					<N8nButton variant="outline" size="medium" @click="requestingChanges = false">
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						size="medium"
						:disabled="!feedback.trim()"
						data-test-id="instance-ai-app-blueprint-feedback-submit"
						@click="requestChanges"
					>
						{{ i18n.baseText('instanceAi.appBlueprint.feedback.submit') }}
					</N8nButton>
				</div>
			</ConfirmationFooter>
		</template>
		<div v-else-if="expired" :class="$style.expiredHint">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('instanceAi.planReview.expiredHint') }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
	background-color: var(--color--background--light-3);
	max-width: 90%;
}

.awaitingInput {
	border: 0;
	box-shadow: var(--shadow--sm), var(--shadow--outline);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.headerTitleGroup {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.label {
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.rowGrow {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.code {
	padding: 0 var(--spacing--4xs);
	border-radius: var(--radius--sm);
	background: var(--color--background--light-2);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	white-space: nowrap;
}

.footerActions {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
}

.expiredHint {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
}
</style>
