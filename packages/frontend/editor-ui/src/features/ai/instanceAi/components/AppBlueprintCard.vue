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
	type IconName,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { useThread } from '../instanceAi.store';
import ConfirmationFooter from './ConfirmationFooter.vue';
import ConnectionRow from './ConnectionRow.vue';

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

const CONNECTION_ICONS: Record<AppBlueprint['connections'][number]['kind'], IconName> = {
	workflow: 'workflow',
	dataTable: 'table',
	agent: 'robot',
};

const name = ref(props.blueprint.name);
// Follows the name until the user types into the namespace field.
const editedNamespace = ref<string | null>(null);
const namespace = computed({
	get: () => editedNamespace.value ?? toNamespace(name.value),
	set: (value: string) => {
		editedNamespace.value = value;
	},
});
const removedConnectionKeys = ref(new Set<string>());
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
		removedConnectionKeys.value = new Set();
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

const connections = computed(() =>
	props.blueprint.connections.filter(
		(connection) => !removedConnectionKeys.value.has(connection.key),
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
	connections: connections.value,
	theme: { ...props.blueprint.theme, primary: primary.value, mode: mode.value },
}));

function removeConnection(key: string) {
	removedConnectionKeys.value = new Set([...removedConnectionKeys.value, key]);
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
		num_connections: connections.value.length,
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
		:class="[$style.card, !isResolved && $style.awaitingInput]"
		data-test-id="instance-ai-app-blueprint"
	>
		<header :class="$style.header">
			<N8nIcon icon="app-window" size="medium" />
			<N8nText size="medium" color="text-dark" bold>{{ i18n.baseText(titleKey) }}</N8nText>
			<N8nText
				v-if="status === 'changes-requested'"
				size="small"
				color="text-light"
				:class="$style.headerStatus"
				data-test-id="instance-ai-app-blueprint-changes-requested"
			>
				{{ i18n.baseText('instanceAi.planReview.changesRequested') }}
			</N8nText>
		</header>

		<section :class="$style.section">
			<div :class="$style.identity">
				<label :class="$style.field">
					<N8nText size="small" color="text-light">
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
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.appBlueprint.namespace') }}
					</N8nText>
					<N8nInput
						v-model="namespace"
						size="small"
						:disabled="isResolved"
						data-test-id="instance-ai-app-blueprint-namespace"
					>
						<template #prepend>/apps/</template>
					</N8nInput>
					<N8nText
						v-if="!namespaceValid"
						size="xsmall"
						color="danger"
						data-test-id="instance-ai-app-blueprint-url"
					>
						{{ i18n.baseText('apps.add.input.namespace.error.regex') }}
					</N8nText>
				</label>
			</div>
			<N8nText size="small" color="text-base" data-test-id="instance-ai-app-blueprint-summary">
				{{ blueprint.summary }}
			</N8nText>
		</section>

		<section :class="$style.section">
			<N8nText size="small" color="text-dark" bold>
				{{ i18n.baseText('instanceAi.appBlueprint.pages') }}
			</N8nText>
			<div :class="$style.rows">
				<ConnectionRow
					v-for="page in blueprint.pages"
					:key="page.route"
					:name="page.route"
					:subtitle="page.purpose"
					icon="file"
					:clickable="false"
					data-test-id="instance-ai-app-blueprint-page"
				/>
			</div>
		</section>

		<section v-if="blueprint.connections.length > 0" :class="$style.section">
			<N8nText size="small" color="text-dark" bold>
				{{ i18n.baseText('instanceAi.appBlueprint.connections') }}
			</N8nText>
			<div :class="$style.rows">
				<ConnectionRow
					v-for="connection in connections"
					:key="connection.key"
					:name="connection.name"
					:subtitle="connection.purpose ?? connection.key"
					:icon="CONNECTION_ICONS[connection.kind]"
					:clickable="false"
					data-test-id="instance-ai-app-blueprint-connection"
				>
					<template #action>
						<N8nIconButton
							v-if="!isResolved"
							icon="x"
							variant="ghost"
							size="small"
							:aria-label="i18n.baseText('generic.delete')"
							data-test-id="instance-ai-app-blueprint-connection-remove"
							@click="removeConnection(connection.key)"
						/>
					</template>
				</ConnectionRow>
				<N8nText v-if="connections.length === 0" size="small" color="text-light">
					{{ i18n.baseText('instanceAi.appBlueprint.connections.none') }}
				</N8nText>
			</div>
		</section>

		<section :class="[$style.section, $style.themeRow]">
			<N8nText size="small" color="text-dark" bold>
				{{ i18n.baseText('apps.builder.theme') }}
			</N8nText>
			<div :class="$style.themeControls">
				<N8nColorPicker
					v-model="primary"
					size="small"
					:disabled="isResolved"
					data-test-id="instance-ai-app-blueprint-primary"
				/>
				<N8nSegmentControl
					v-model="mode"
					:options="modeOptions"
					size="small"
					:disabled="isResolved"
					data-test-id="instance-ai-app-blueprint-mode"
				/>
			</div>
		</section>

		<template v-if="!isResolved">
			<ConfirmationFooter v-if="!requestingChanges" layout="row-between" bordered>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('instanceAi.appBlueprint.hint') }}
				</N8nText>
				<div :class="$style.footerActions">
					<N8nButton
						variant="ghost"
						size="small"
						data-test-id="instance-ai-app-blueprint-request-changes"
						@click="requestingChanges = true"
					>
						{{ i18n.baseText('instanceAi.appBlueprint.requestChanges') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						size="small"
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
					autofocus
					:placeholder="i18n.baseText('instanceAi.appBlueprint.feedback.placeholder')"
					data-test-id="instance-ai-app-blueprint-feedback"
					@keydown.enter.exact.prevent="requestChanges"
				/>
				<div :class="$style.footerActions">
					<N8nButton variant="ghost" size="small" @click="requestingChanges = false">
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						size="small"
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
.card {
	display: flex;
	flex-direction: column;
	max-width: 90%;
	margin: var(--spacing--2xs) 0;
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
	overflow: hidden;
}

.awaitingInput {
	border: 0;
	box-shadow: var(--shadow--sm), var(--shadow--outline);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.headerStatus {
	margin-left: auto;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);

	& + & {
		border-top: var(--border);
	}
}

.identity {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: var(--spacing--xs);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.rows {
	display: flex;
	flex-direction: column;
	margin-left: calc(var(--spacing--2xs) * -1);
}

.themeRow {
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
}

.themeControls {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
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
