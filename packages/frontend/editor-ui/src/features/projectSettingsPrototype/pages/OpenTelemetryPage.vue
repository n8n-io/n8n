<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSaveBar,
	N8nSettingsSection,
	N8nStatusDot,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import SourceBadge from '@/features/projectSettingsPrototype/components/SourceBadge.vue';
import type { SpanAttribute, TracingConfig } from '@/features/projectSettingsPrototype/data/types';
import { useCan } from '@/features/projectSettingsPrototype/state/session';
import {
	newSpanAttribute,
	projectState,
	setProjectSpanAttributes,
	store,
} from '@/features/projectSettingsPrototype/state/store';

/**
 * Tracing for this project's executions.
 *
 * The tracing configuration belongs to the instance, so a project only reads
 * it. What a project can add is its own span attributes, on top of the ones
 * the instance sets, and only while the instance lets projects add them.
 */
const props = defineProps<{ projectId: string }>();

const can = useCan();
const toast = useToast();

/* ── Tracing ── */

const PROTOCOL_LABELS: Record<TracingConfig['protocol'], string> = {
	'http/protobuf': 'HTTP/protobuf',
	grpc: 'gRPC',
};

const percentFormat = new Intl.NumberFormat('en-US', {
	style: 'percent',
	maximumFractionDigits: 1,
});

interface TracingDetail {
	id: string;
	label: string;
	value: string;
	/** Identifiers and addresses read as code. */
	monospace?: boolean;
}

const tracing = computed(() => store.instance.tracing);

const tracingDetails = computed<TracingDetail[]>(() => [
	{
		id: 'endpoint',
		label: 'Endpoint',
		value: tracing.value.endpoint || 'Not set',
		monospace: tracing.value.endpoint !== '',
	},
	{ id: 'protocol', label: 'Protocol', value: PROTOCOL_LABELS[tracing.value.protocol] },
	{
		id: 'service-name',
		label: 'Service name',
		value: tracing.value.serviceName || 'Not set',
		monospace: tracing.value.serviceName !== '',
	},
	{
		id: 'sample-rate',
		label: 'Sample rate',
		value: percentFormat.format(tracing.value.sampleRate),
	},
	{
		id: 'node-spans',
		label: 'Node spans',
		value: tracing.value.includeNodeSpans ? 'Included' : 'Not included',
	},
	{
		id: 'scope',
		label: 'Scope',
		value: tracing.value.productionOnly ? 'Production executions only' : 'All executions',
	},
]);

/* ── Span attributes ── */

const instanceAttributes = computed(() => store.instance.spanAttributes);
const projectsAddAttributes = computed(() => store.instance.allowProjects.spanAttributes);
const canEdit = computed(() => projectsAddAttributes.value && can('project:settings:edit'));

const savedAttributes = computed(() => projectState(props.projectId).spanAttributes);

const copyAttributes = (attributes: SpanAttribute[]): SpanAttribute[] =>
	attributes.map((attribute) => ({ ...attribute }));

/** Edits stay here until the person saves them. */
const draft = ref<SpanAttribute[]>(copyAttributes(savedAttributes.value));
/** Rows whose key the person has left, so an empty one may show its error. */
const touched = ref(new Set<string>());

function resetDraft() {
	draft.value = copyAttributes(savedAttributes.value);
	touched.value = new Set();
}

watch([savedAttributes, canEdit], resetDraft);

const isDirty = computed(() => {
	const saved = savedAttributes.value;
	if (draft.value.length !== saved.length) return true;
	return draft.value.some((attribute, index) => {
		const other = saved.at(index);
		return (
			attribute.id !== other?.id || attribute.key !== other.key || attribute.value !== other.value
		);
	});
});

const errors = computed(() => {
	const instanceKeys = new Set(instanceAttributes.value.map((attribute) => attribute.key.trim()));
	const counts = new Map<string, number>();
	for (const attribute of draft.value) {
		const key = attribute.key.trim();
		if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	const result = new Map<string, string>();
	for (const attribute of draft.value) {
		const key = attribute.key.trim();
		if (!key) result.set(attribute.id, 'Enter a key');
		else if (instanceKeys.has(key)) result.set(attribute.id, 'The instance already sets this key');
		else if ((counts.get(key) ?? 0) > 1) {
			result.set(attribute.id, 'Another attribute already uses this key');
		}
	}
	return result;
});

const hasErrors = computed(() => errors.value.size > 0);

/** An empty key blocks saving at once, but only reads as an error after the person leaves it. */
function visibleError(attribute: SpanAttribute): string | undefined {
	const error = errors.value.get(attribute.id);
	if (!error) return undefined;
	if (attribute.key.trim() === '' && !touched.value.has(attribute.id)) return undefined;
	return error;
}

const errorId = (attribute: SpanAttribute) => `proto-otel-error-${attribute.id}`;

const removeLabel = (attribute: SpanAttribute) => {
	const key = attribute.key.trim();
	return key ? `Remove attribute ${key}` : 'Remove attribute';
};

const root = ref<HTMLElement | null>(null);

async function addAttribute() {
	const attribute = newSpanAttribute();
	draft.value.push(attribute);
	await nextTick();
	root.value?.querySelector<HTMLInputElement>(`[data-attribute-key="${attribute.id}"]`)?.focus();
}

function removeAttribute(id: string) {
	draft.value = draft.value.filter((attribute) => attribute.id !== id);
	touched.value.delete(id);
}

function save() {
	if (!canEdit.value || !isDirty.value || hasErrors.value) return;
	setProjectSpanAttributes(props.projectId, draft.value);
	resetDraft();
	toast.showMessage({ title: 'Span attributes saved', type: 'success' });
}
</script>

<template>
	<div ref="root" :class="$style.page" data-test-id="proto-otel-page">
		<N8nSettingsSection
			description="Instance admins set tracing for every project."
			:class="$style.section"
			data-test-id="proto-otel-tracing-section"
		>
			<template #title>
				<div :class="$style.sectionHeader">
					<div :class="$style.sectionTitle">
						<N8nHeading tag="h2" step="md" color="text-dark">Tracing</N8nHeading>
						<SourceBadge source="locked" />
					</div>
					<RouterLink
						v-if="can('instance:settings:view')"
						to="/settings/opentelemetry"
						:class="$style.link"
						data-test-id="proto-otel-instance-link"
					>
						Open instance tracing settings
					</RouterLink>
				</div>
			</template>

			<N8nSettingsRowGroup>
				<N8nSettingsRow layout="custom">
					<dl :class="$style.details" data-test-id="proto-otel-tracing-details">
						<div :class="$style.detail">
							<N8nText tag="dt" color="text-light">Status</N8nText>
							<N8nText
								tag="dd"
								color="text-dark"
								:class="[$style.definition, $style.status]"
								data-test-id="proto-otel-tracing-status"
							>
								<N8nStatusDot :variant="tracing.enabled ? 'success' : 'neutral'" />
								{{ tracing.enabled ? 'On' : 'Off' }}
							</N8nText>
						</div>
						<div v-for="detail in tracingDetails" :key="detail.id" :class="$style.detail">
							<N8nText tag="dt" color="text-light">{{ detail.label }}</N8nText>
							<N8nText
								tag="dd"
								color="text-dark"
								:class="[$style.definition, { [$style.code]: detail.monospace }]"
								:data-test-id="`proto-otel-tracing-${detail.id}`"
							>
								{{ detail.value }}
							</N8nText>
						</div>
					</dl>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nSettingsSection
			title="Span attributes"
			description="Custom attributes added to every span of this project's executions."
			:class="$style.section"
			data-test-id="proto-otel-attributes-section"
		>
			<N8nSettingsRowGroup :class="$style.attributes">
				<N8nSettingsRow layout="custom" :class="$style.columnsRow">
					<div :class="$style.attribute">
						<N8nText size="small" color="text-light">Key</N8nText>
						<N8nText size="small" color="text-light">Value</N8nText>
					</div>
				</N8nSettingsRow>

				<N8nSettingsRow
					v-for="attribute in instanceAttributes"
					:key="attribute.id"
					layout="custom"
					data-test-id="proto-otel-instance-attribute"
				>
					<div :class="$style.attribute">
						<span :class="[$style.cell, $style.code]">{{ attribute.key }}</span>
						<span :class="$style.valueCell">
							<span :class="[$style.cell, $style.code]">{{ attribute.value }}</span>
							<SourceBadge source="locked" />
						</span>
					</div>
				</N8nSettingsRow>

				<N8nSettingsRow
					v-if="!projectsAddAttributes"
					layout="custom"
					data-test-id="proto-otel-attributes-locked-note"
				>
					<N8nText size="small" color="text-light">
						Instance admins set span attributes for every project.
					</N8nText>
				</N8nSettingsRow>

				<template v-else-if="canEdit">
					<N8nSettingsRow
						v-for="attribute in draft"
						:key="attribute.id"
						layout="custom"
						data-test-id="proto-otel-project-attribute"
					>
						<div :class="$style.attribute">
							<N8nInput
								v-model="attribute.key"
								:class="$style.code"
								size="medium"
								placeholder="team"
								aria-label="Attribute key"
								:aria-invalid="visibleError(attribute) ? 'true' : undefined"
								:aria-describedby="visibleError(attribute) ? errorId(attribute) : undefined"
								:data-attribute-key="attribute.id"
								data-test-id="proto-otel-attribute-key"
								@blur="touched.add(attribute.id)"
							/>
							<N8nInput
								v-model="attribute.value"
								:class="$style.code"
								size="medium"
								placeholder="platform"
								aria-label="Attribute value"
								data-test-id="proto-otel-attribute-value"
							/>
							<N8nTooltip content="Remove attribute" placement="top">
								<N8nIconButton
									icon="trash-2"
									variant="ghost"
									size="medium"
									:aria-label="removeLabel(attribute)"
									data-test-id="proto-otel-attribute-remove"
									@click="removeAttribute(attribute.id)"
								/>
							</N8nTooltip>
							<N8nText
								v-if="visibleError(attribute)"
								:id="errorId(attribute)"
								:class="$style.error"
								size="small"
								color="danger"
								role="alert"
								data-test-id="proto-otel-attribute-error"
							>
								{{ visibleError(attribute) }}
							</N8nText>
						</div>
					</N8nSettingsRow>
					<N8nSettingsRow
						v-if="draft.length === 0"
						layout="custom"
						data-test-id="proto-otel-attributes-empty"
					>
						<N8nText size="small" color="text-light">
							This project adds no attributes of its own yet. Add one to tag its spans, for example
							with a team or a cost center.
						</N8nText>
					</N8nSettingsRow>
				</template>

				<template v-else>
					<N8nSettingsRow
						v-for="attribute in savedAttributes"
						:key="attribute.id"
						layout="custom"
						data-test-id="proto-otel-project-attribute"
					>
						<div :class="$style.attribute">
							<span :class="[$style.cell, $style.code]">{{ attribute.key }}</span>
							<span :class="$style.valueCell">
								<span :class="[$style.cell, $style.code]">{{ attribute.value }}</span>
								<SourceBadge source="project" />
							</span>
						</div>
					</N8nSettingsRow>
					<N8nSettingsRow
						v-if="savedAttributes.length === 0"
						layout="custom"
						data-test-id="proto-otel-attributes-empty"
					>
						<N8nText size="small" color="text-light">
							This project adds no attributes of its own.
						</N8nText>
					</N8nSettingsRow>
				</template>
			</N8nSettingsRowGroup>

			<N8nButton
				v-if="canEdit"
				variant="outline"
				data-test-id="proto-otel-attribute-add"
				@click="addAttribute"
			>
				<template #icon>
					<N8nIcon icon="plus" />
				</template>
				Add attribute
			</N8nButton>
		</N8nSettingsSection>

		<N8nSettingsSaveBar
			floating
			:visible="canEdit && isDirty"
			:save-disabled="hasErrors"
			@save="save"
			@discard="resetDraft"
		/>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);

	// N8nSettingsSection adds its own margin between two sections. The page gap is the distance here.
	> .section + .section {
		margin-block-start: 0;
	}
}

.sectionHeader {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--4xs) var(--spacing--sm);
	min-height: var(--height--sm);
}

.sectionTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.link {
	color: var(--text-color);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	text-decoration: underline;
	text-underline-offset: var(--spacing--5xs);
	border-radius: var(--radius--4xs);

	&:hover {
		color: var(--text-color--subtle);
	}

	@include focus.focus-visible-ring-offset;
}

.code {
	font-family: var(--font-family--monospace);
}

/* ── Tracing ── */

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
}

.detail {
	display: grid;
	grid-template-columns: var(--spacing--4xl) minmax(0, 1fr);
	align-items: baseline;
	column-gap: var(--spacing--sm);
}

.definition {
	margin: 0;
	overflow-wrap: anywhere;
}

.status {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

/* ── Span attributes ── */

// The key and the value share the width. The last column holds the remove button.
.attribute {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) var(--height--md);
	align-items: center;
	gap: var(--spacing--4xs) var(--spacing--xs);
	width: 100%;
}

// Column labels sit tighter than a row and on the group's quieter shade.
.attributes .columnsRow {
	padding-block: var(--spacing--2xs);
	background-color: var(--background--subtle);
}

.cell {
	min-width: 0;
	color: var(--text-color);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--lg);
	overflow-wrap: anywhere;
}

// A read-only value has no remove button, so it runs to the row's edge with its source.
.valueCell {
	display: flex;
	grid-column: 2 / -1;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	min-width: 0;
}

.error {
	grid-column: 1 / -1;
}
</style>
