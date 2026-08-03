<script lang="ts" setup>
import startCase from 'lodash/startCase';

import type { IUpdateInformation } from '@/Interface';
import ParameterInputExpanded from '@/features/ndv/parameters/components/ParameterInputExpanded.vue';
import {
	cleanPlaceholderValue,
	extractTemplateMarkers,
	parsePlaceholderDefs,
	parsePlaceholderValues,
	parseTemplatedAuthField,
	storedPlaceholderValue,
	TEMPLATED_AUTH_REDACTED_VALUE,
	type TemplatedAuthPlaceholderDef,
} from '@/features/credentials/templatedAuth.utils';
import {
	N8nButton,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nRadioButtons,
	N8nSwitch,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	ICredentialDataDecryptedObject,
	INodeProperties,
	NodeParameterValueType,
} from 'n8n-workflow';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';
import { computed, ref, watch } from 'vue';

/**
 * Connection pane for a Templated Custom Auth credential — two in-place
 * states (designer prototype, 2026-07):
 * - Guided form (default): one real parameter input per template `{{marker}}`
 *   (same component as native credential fields, so masking, expressions and
 *   secrets/variables references behave identically), labeled from the stored
 *   placeholder defs. An untouched input keeps the stored (redacted) value —
 *   the `***` sentinels merge back to the real secrets server-side on save;
 *   typing replaces it.
 * - Edit setup: the machinery behind the form — auth template, one definition
 *   card per placeholder, test URL, accepted status codes.
 */
const props = defineProps<{
	credentialData: ICredentialDataDecryptedObject;
}>();

const emit = defineEmits<{
	update: [value: IUpdateInformation];
}>();

const i18n = useI18n();

const templateText = computed(() =>
	typeof props.credentialData.template === 'string' ? props.credentialData.template : '',
);

const template = computed(() =>
	parseTemplatedAuthField<unknown>(props.credentialData.template, {}),
);

const markers = computed(() => extractTemplateMarkers(template.value));

const defsByName = computed(() => {
	const defs = parsePlaceholderDefs(props.credentialData.placeholderDefs);
	return new Map(defs.map((def) => [def.name, def]));
});

const savedValues = computed(() => parsePlaceholderValues(props.credentialData.placeholderValues));

// Which state to show follows the template: markers → guided form, markerless
// → straight to the editor. The modal loads credential data asynchronously,
// so the state keeps following the template until the user takes over —
// either by switching states or by editing the setup (adding the first marker
// to the template must not eject them from the editor).
const editing = ref(markers.value.length === 0);
const userDrivenState = ref(false);

watch(markers, (next) => {
	if (!userDrivenState.value) editing.value = next.length === 0;
});

function setEditing(value: boolean) {
	userDrivenState.value = true;
	editing.value = value;
}

// ── Guided form ─────────────────────────────────────────────────────────────

// Inputs start from the stored values (redacted `***` sentinels render masked,
// expressions render in the expression editor — same as native credential
// fields); typing over one stages a replacement, while an untouched `***`
// merges back to the stored secret server-side on save. Seeded once on mount
// deliberately: re-seeding when credentialData changes would visibly wipe
// just-typed plain values right after save (the re-fetch returns them redacted).
const editedValues = ref<Record<string, string>>({ ...savedValues.value });

function isRequired(name: string): boolean {
	return defsByName.value.get(name)?.optional !== true;
}

// ParameterInputExpanded truncates dotted parameter names to their last path
// segment (collection-path convention), so inputs get index-based names and
// map back to the real marker on update.
const inputNameFor = (index: number) => `marker_${index}`;
const markerFor = (inputName: string) => markers.value[Number(inputName.slice('marker_'.length))];

/** One native credential parameter per template marker; defs give the UI.
 *  The def's info renders in the label's tooltip bubble like every other
 *  credential field's help text. */
const placeholderProperties = computed<INodeProperties[]>(() =>
	markers.value.map((name, index) => {
		const def = defsByName.value.get(name);
		return {
			displayName: def?.title || startCase(name),
			name: inputNameFor(index),
			type: 'string',
			default: '',
			required: isRequired(name),
			...(def?.info ? { description: def.info } : {}),
			...(def?.type === 'plain' ? {} : { typeOptions: { password: true } }),
		};
	}),
);

// Display-only mapping: in masked inputs the stored 3-char `***` sentinel
// renders as the same full-length mask native credential fields blank to, so
// redacted secrets don't look suspiciously short (plain inputs keep the bare
// sentinel — the blanking constant would read as a real value there).
// Composition still reads `editedValues`, so an untouched input keeps sending
// `***` (the server merge-back contract).
const parameterValues = computed<Record<string, NodeParameterValueType>>(() =>
	Object.fromEntries(
		markers.value.map((name, index) => {
			const value = editedValues.value[name] ?? '';
			const masked = defsByName.value.get(name)?.type !== 'plain';
			return [
				inputNameFor(index),
				value === TEMPLATED_AUTH_REDACTED_VALUE && masked ? CREDENTIAL_BLANKING_VALUE : value,
			];
		}),
	),
);

function onParameterUpdate(update: IUpdateInformation) {
	const marker = markerFor(update.name);
	if (!marker) return;
	// storedPlaceholderValue keeps the display mask out of the stored values:
	// the expression toggle re-emits the displayed value, which would otherwise
	// overwrite the real secret with the mask itself on save.
	editedValues.value[marker] = storedPlaceholderValue(String(update.value ?? ''));
	const composed: Record<string, string> = {};
	for (const name of markers.value) {
		const edited = editedValues.value[name] ?? savedValues.value[name] ?? '';
		const cleaned = cleanPlaceholderValue(template.value, name, edited);
		// An empty optional stays out of the stored values entirely — a stored ''
		// would come back redacted (***) and read like a saved secret.
		if (cleaned === '' && !isRequired(name)) continue;
		composed[name] = cleaned;
	}
	emit('update', { name: 'placeholderValues', value: JSON.stringify(composed, null, 2) });
}

// ── Edit setup ──────────────────────────────────────────────────────────────

function chipLabel(name: string): string {
	return '{{' + name + '}}';
}

// Any edit-state change means the user is working in the editor — freeze the
// template-driven state switching on top of emitting the field update.
function emitSetupUpdate(name: string, value: string) {
	userDrivenState.value = true;
	emit('update', { name, value });
}

function defFor(name: string): TemplatedAuthPlaceholderDef {
	return defsByName.value.get(name) ?? { name, title: '' };
}

// Rewrites the stored defs to exactly the template's current markers, merged
// with the changed field; defs for markers no longer in the template drop out.
function setDefField(name: string, patch: Partial<TemplatedAuthPlaceholderDef>) {
	const defs = markers.value.map((marker) => {
		const existing = defFor(marker);
		return marker === name ? { ...existing, ...patch } : existing;
	});
	emitSetupUpdate('placeholderDefs', JSON.stringify(defs, null, 2));
}

// Deliberately does NOT rebuild placeholderDefs: this fires per keystroke on
// raw JSON, so the template is transiently invalid/half-typed and a rebuild
// would persist the loss of def metadata (titles, hints, optional flags).
// Stale defs are inert (only current markers are ever looked up) and defs
// reconcile to the markers on the next def-card edit (setDefField).
function onTemplateInput(value: string) {
	emitSetupUpdate('template', value);
}

const testUrlText = computed(() =>
	typeof props.credentialData.testUrl === 'string' ? props.credentialData.testUrl : '',
);

const docsUrlText = computed(() =>
	typeof props.credentialData.docsUrl === 'string' ? props.credentialData.docsUrl : '',
);

// Local buffer: the stored value is a JSON array, so echoing the parsed value
// back into the input would eat separators as the user types them.
const codesText = ref(
	parseTemplatedAuthField<number[]>(props.credentialData.acceptedStatusCodes, []).join(', '),
);

function onCodesInput(value: string) {
	codesText.value = value;
	const codes = value
		.split(/[\s,]+/)
		.map(Number)
		.filter((code) => Number.isInteger(code) && code > 0);
	emitSetupUpdate('acceptedStatusCodes', codes.length ? JSON.stringify(codes) : '');
}

const typeOptions = [
	{ label: i18n.baseText('credentialEdit.templatedAuth.fieldType.secret'), value: 'password' },
	{ label: i18n.baseText('credentialEdit.templatedAuth.fieldType.plain'), value: 'plain' },
];
</script>

<template>
	<div :class="$style.view" data-test-id="templated-auth-simple-view" @keydown.stop>
		<!-- ── Guided form ── -->
		<template v-if="!editing">
			<template v-if="markers.length">
				<!-- form-per-input matches CredentialInputs: breaks up inputs and prevents Chrome autofill -->
				<form
					v-for="parameter in placeholderProperties"
					:key="parameter.name"
					:class="$style.field"
					autocomplete="off"
					data-test-id="templated-auth-value-input"
					@submit.prevent
				>
					<ParameterInputExpanded
						:parameter="parameter"
						:value="parameterValues[parameter.name]"
						:node-values="parameterValues"
						:label="{ size: 'medium' }"
						documentation-url=""
						event-source="credentials"
						@update="onParameterUpdate"
					/>
				</form>
			</template>
			<div v-else :class="$style.empty" data-test-id="templated-auth-empty">
				{{ i18n.baseText('credentialEdit.templatedAuth.noFieldsYet') }}
			</div>

			<div :class="$style.provenance">
				<N8nButton
					variant="subtle"
					size="small"
					data-test-id="templated-auth-edit-setup"
					@click="setEditing(true)"
				>
					<N8nIcon icon="pen" size="xsmall" />
					{{ i18n.baseText('credentialEdit.templatedAuth.editSetup') }}
				</N8nButton>
			</div>
		</template>

		<!-- ── Edit setup ── -->
		<template v-else>
			<div :class="$style.editHead">
				<N8nButton
					variant="ghost"
					size="small"
					icon-only
					:aria-label="i18n.baseText('credentialEdit.templatedAuth.backToForm')"
					data-test-id="templated-auth-back"
					@click="setEditing(false)"
				>
					<N8nIcon icon="arrow-left" />
				</N8nButton>
				<N8nText size="medium" color="text-dark" bold>
					{{ i18n.baseText('credentialEdit.templatedAuth.editSetup') }}
				</N8nText>
			</div>

			<div :class="$style.section">
				<N8nInputLabel
					:label="i18n.baseText('credentialEdit.templatedAuth.template')"
					:tooltip-text="i18n.baseText('credentialEdit.templatedAuth.template.tooltip')"
					:bold="false"
					size="medium"
				>
					<N8nInput
						:model-value="templateText"
						type="textarea"
						:rows="6"
						:class="$style.mono"
						data-test-id="templated-auth-template-input"
						@update:model-value="onTemplateInput"
					/>
				</N8nInputLabel>
			</div>

			<div :class="$style.section">
				<N8nInputLabel
					:label="i18n.baseText('credentialEdit.templatedAuth.fields')"
					:tooltip-text="i18n.baseText('credentialEdit.templatedAuth.fields.tooltip')"
					:bold="false"
					size="medium"
				>
					<div v-if="markers.length" :class="$style.defs">
						<div
							v-for="name in markers"
							:key="name"
							:class="$style.defCard"
							data-test-id="templated-auth-def-card"
						>
							<div :class="$style.defTop">
								<code :class="$style.chip">{{ chipLabel(name) }}</code>
								<N8nSwitch
									:model-value="isRequired(name)"
									:label="i18n.baseText('credentialEdit.templatedAuth.fieldRequired')"
									size="small"
									@update:model-value="setDefField(name, { optional: $event ? undefined : true })"
								/>
							</div>
							<div :class="$style.defGrid">
								<N8nInputLabel
									:label="i18n.baseText('credentialEdit.templatedAuth.fieldLabel')"
									:tooltip-text="i18n.baseText('credentialEdit.templatedAuth.fieldLabel.tooltip')"
									:bold="false"
									size="small"
								>
									<N8nInput
										size="small"
										:model-value="defFor(name).title"
										:placeholder="startCase(name)"
										@update:model-value="setDefField(name, { title: $event })"
									/>
								</N8nInputLabel>
								<div :class="$style.typePick">
									<N8nRadioButtons
										size="small"
										:model-value="defFor(name).type === 'plain' ? 'plain' : 'password'"
										:options="typeOptions"
										@update:model-value="
											setDefField(name, { type: $event === 'plain' ? 'plain' : 'password' })
										"
									/>
								</div>
								<N8nInputLabel
									:label="i18n.baseText('credentialEdit.templatedAuth.fieldHint')"
									:tooltip-text="i18n.baseText('credentialEdit.templatedAuth.fieldHint.tooltip')"
									:bold="false"
									size="small"
									:class="$style.defWide"
								>
									<N8nInput
										size="small"
										:model-value="defFor(name).info ?? ''"
										@update:model-value="setDefField(name, { info: $event || undefined })"
									/>
								</N8nInputLabel>
							</div>
						</div>
					</div>
					<div v-else :class="$style.empty">
						{{ i18n.baseText('credentialEdit.templatedAuth.fields.empty') }}
					</div>
				</N8nInputLabel>
			</div>

			<div :class="$style.section">
				<N8nInputLabel
					:label="i18n.baseText('credentialEdit.templatedAuth.testUrl')"
					:tooltip-text="i18n.baseText('credentialEdit.templatedAuth.testUrl.tooltip')"
					:bold="false"
					size="medium"
				>
					<N8nInput
						size="small"
						:model-value="testUrlText"
						:placeholder="i18n.baseText('credentialEdit.templatedAuth.testUrl.placeholder')"
						:class="$style.mono"
						data-test-id="templated-auth-test-url-input"
						@update:model-value="emitSetupUpdate('testUrl', $event)"
					/>
				</N8nInputLabel>
			</div>

			<div :class="$style.section">
				<N8nInputLabel
					:label="i18n.baseText('credentialEdit.templatedAuth.codes')"
					:tooltip-text="i18n.baseText('credentialEdit.templatedAuth.codes.tooltip')"
					:bold="false"
					size="medium"
				>
					<N8nInput
						size="small"
						:model-value="codesText"
						:placeholder="i18n.baseText('credentialEdit.templatedAuth.codes.placeholder')"
						:class="[$style.mono, $style.narrow]"
						data-test-id="templated-auth-codes-input"
						@update:model-value="onCodesInput"
					/>
				</N8nInputLabel>
			</div>

			<div :class="$style.section">
				<N8nInputLabel
					:label="i18n.baseText('credentialEdit.templatedAuth.docsUrl')"
					:tooltip-text="i18n.baseText('credentialEdit.templatedAuth.docsUrl.tooltip')"
					:bold="false"
					size="medium"
				>
					<N8nInput
						size="small"
						:model-value="docsUrlText"
						:placeholder="i18n.baseText('credentialEdit.templatedAuth.docsUrl.placeholder')"
						:class="$style.mono"
						data-test-id="templated-auth-docs-url-input"
						@update:model-value="emitSetupUpdate('docsUrl', $event)"
					/>
				</N8nInputLabel>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
}

.empty {
	border: var(--border-width) dashed var(--color--foreground);
	border-radius: var(--radius);
	padding: var(--spacing--sm);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	text-align: center;
}

.provenance {
	display: flex;
	justify-content: flex-end;
	margin-top: var(--spacing--sm);
	padding-top: var(--spacing--sm);
	border-top: var(--border-width) solid var(--color--foreground--tint-1);
}

.editHead {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.section {
	display: flex;
	flex-direction: column;
}

.mono {
	:global(input),
	:global(textarea) {
		font-family: var(--font-family--monospace);
		font-size: var(--font-size--2xs);
	}

	:global(textarea) {
		line-height: 1.6;
	}
}

.narrow {
	max-width: 220px;
}

.defs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.defCard {
	border: var(--border-width) solid var(--color--foreground--tint-1);
	border-radius: var(--radius);
	padding: var(--spacing--xs) var(--spacing--sm);
	background-color: var(--color--background--light-3);
}

.defTop {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--xs);
}

.chip {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	background-color: var(--color--background);
	color: var(--color--text--shade-1);
	border-radius: var(--radius--sm);
	padding: var(--spacing--5xs) var(--spacing--3xs);
}

.defGrid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--2xs) var(--spacing--xs);
	align-items: end;
}

.typePick {
	display: flex;
	justify-content: flex-start;
	padding-bottom: var(--spacing--5xs);
}

.defWide {
	grid-column: 1 / -1;
}
</style>
