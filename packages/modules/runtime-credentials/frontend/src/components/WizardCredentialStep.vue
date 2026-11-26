<script setup lang="ts">
import {
	N8nBadge,
	N8nCallout,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nListbox,
	N8nListboxItem,
	N8nNodeIcon,
	N8nOption,
	N8nRadioGroup,
	N8nRadioGroupItem,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { useTypeIcons } from '../composables/useTypeIcons';
import { COMMON_CREDENTIAL_TYPES } from '../runtime-credentials.presets';
import { useRuntimeCredentialsStore } from '../runtime-credentials.store';
import { findRuleIssue, getFillableFields, isOAuth2Type } from '../runtime-credentials.utils';
import type { RuleIssue, TransformKind } from '../runtime-credentials.utils';

/** A list of hundreds of rows helps nobody, so the picker shows the first matches. */
const MAX_VISIBLE_TYPES = 40;

const credentialType = defineModel<string>('credentialType', { required: true });
const transformKind = defineModel<Exclude<TransformKind, 'none'>>('transformKind', {
	required: true,
});
const fieldName = defineModel<string>('fieldName', { required: true });

const i18n = useI18n();
const store = useRuntimeCredentialsStore();
const { credentialIcon } = useTypeIcons();

const query = ref('');

const hasCatalog = computed(() => store.credentialTypes.size > 0);

const matches = computed(() => {
	const text = query.value.trim().toLowerCase();
	const all = [...store.credentialTypes.values()];
	const found =
		text === ''
			? all
			: all.filter(
					(type) =>
						type.displayName.toLowerCase().includes(text) || type.name.toLowerCase().includes(text),
				);
	return [...found].sort((a, b) => a.displayName.localeCompare(b.displayName));
});
const visibleTypes = computed(() => {
	const shown = matches.value.slice(0, MAX_VISIBLE_TYPES);
	// The chosen type stays at the top, so it is in view when the wizard opens on an existing rule.
	const chosen = store.credentialTypes.get(credentialType.value);
	return chosen ? [chosen, ...shown.filter((type) => type !== chosen)] : shown;
});

const fields = computed(() => getFillableFields(credentialType.value, store.credentialTypes));
const suggested = computed<'bearer' | 'field'>(() =>
	isOAuth2Type(credentialType.value, store.credentialTypes) ? 'bearer' : 'field',
);

const issue = computed<RuleIssue | undefined>(() =>
	findRuleIssue(
		{
			credentialType: credentialType.value,
			transform: transformKind.value === 'field' ? `field:${fieldName.value}` : 'bearer',
		},
		store.credentialTypes,
	),
);

function issueText(found: RuleIssue): string {
	switch (found.kind) {
		case 'unknownType':
			return i18n.baseText('runtimeCredentials.rules.status.unknownType', {
				interpolate: { type: found.type },
			});
		case 'unknownField':
			return i18n.baseText('runtimeCredentials.rules.status.unknownField', {
				interpolate: { type: found.type, field: found.field },
			});
		case 'controlledField':
			return i18n.baseText('runtimeCredentials.rules.status.controlledField', {
				interpolate: { type: found.type, field: found.field },
			});
	}
}

/** Picks the transform that fits the type. The admin can change it afterwards. */
function selectType(name: string | undefined) {
	if (name === undefined || name === credentialType.value) return;
	credentialType.value = name;
	const bearer = isOAuth2Type(name, store.credentialTypes);
	const candidates = getFillableFields(name, store.credentialTypes);
	if (bearer || candidates.length === 0) {
		transformKind.value = 'bearer';
		fieldName.value = '';
	} else {
		transformKind.value = 'field';
		fieldName.value = candidates[0].name;
	}
}

function onTransform(value: string | undefined) {
	if (value === 'bearer' || value === 'field') transformKind.value = value;
}

function onFallbackType(value: string) {
	credentialType.value = value.trim();
}
</script>

<template>
	<div :class="$style.step" data-test-id="runtime-wizard-step-credential">
		<div :class="$style.field">
			<N8nText tag="span" size="small" bold>
				{{ i18n.baseText('runtimeCredentials.wizard.credential.label') }}
			</N8nText>

			<template v-if="hasCatalog">
				<N8nInput
					v-model="query"
					:placeholder="i18n.baseText('runtimeCredentials.wizard.credential.search.placeholder')"
					:aria-label="i18n.baseText('runtimeCredentials.wizard.credential.search.placeholder')"
					clearable
					data-test-id="runtime-credential-search"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
				<N8nListbox
					:model-value="credentialType"
					:label="i18n.baseText('runtimeCredentials.wizard.credential.label')"
					:class="$style.types"
					data-test-id="runtime-credential-list"
					@update:model-value="selectType"
				>
					<N8nListboxItem
						v-for="type in visibleTypes"
						:key="type.name"
						:value="type.name"
						:data-test-id="`runtime-credential-option-${type.name}`"
					>
						<template #leading>
							<N8nNodeIcon v-bind="credentialIcon(type.name)" :size="18" />
						</template>
						<span :class="$style.typeName">{{ type.displayName }}</span>
					</N8nListboxItem>
				</N8nListbox>
				<N8nText
					v-if="matches.length === 0"
					size="small"
					color="text-light"
					data-test-id="runtime-credential-no-match"
				>
					{{
						i18n.baseText('runtimeCredentials.wizard.credential.noMatch', {
							interpolate: { query: query.trim() },
						})
					}}
				</N8nText>
				<N8nText
					v-else-if="matches.length > MAX_VISIBLE_TYPES"
					size="small"
					color="text-light"
					data-test-id="runtime-credential-more"
				>
					{{
						i18n.baseText('runtimeCredentials.wizard.credential.more', {
							interpolate: { count: String(MAX_VISIBLE_TYPES) },
						})
					}}
				</N8nText>
			</template>

			<template v-else>
				<N8nCallout theme="info" slim data-test-id="runtime-credential-fallback-note">
					{{ i18n.baseText('runtimeCredentials.wizard.credential.fallback.note') }}
				</N8nCallout>
				<N8nInput
					:model-value="credentialType"
					:placeholder="i18n.baseText('runtimeCredentials.wizard.credential.fallback.placeholder')"
					:aria-label="i18n.baseText('runtimeCredentials.wizard.credential.label')"
					data-test-id="runtime-credential-type-input"
					@update:model-value="onFallbackType"
				/>
				<div :class="$style.suggestions">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('runtimeCredentials.wizard.credential.fallback.suggestions') }}
					</N8nText>
					<N8nBadge
						v-for="name in COMMON_CREDENTIAL_TYPES"
						:key="name"
						variant="outline"
						size="small"
						clickable
						@click="credentialType = name"
					>
						{{ name }}
					</N8nBadge>
				</div>
			</template>
		</div>

		<div v-if="credentialType.trim() !== ''" :class="$style.field">
			<N8nText tag="span" size="small" bold>
				{{ i18n.baseText('runtimeCredentials.wizard.transform.label') }}
			</N8nText>
			<N8nRadioGroup
				:model-value="transformKind"
				:aria-label="i18n.baseText('runtimeCredentials.wizard.transform.label')"
				data-test-id="runtime-transform-group"
				@update:model-value="onTransform"
			>
				<N8nRadioGroupItem
					value="bearer"
					:label="i18n.baseText('runtimeCredentials.rules.transform.bearer')"
					:description="i18n.baseText('runtimeCredentials.wizard.transform.bearer.description')"
					data-test-id="runtime-transform-bearer"
				>
				</N8nRadioGroupItem>
				<N8nRadioGroupItem
					value="field"
					:label="i18n.baseText('runtimeCredentials.wizard.transform.field.title')"
					:description="i18n.baseText('runtimeCredentials.wizard.transform.field.description')"
					data-test-id="runtime-transform-field"
				>
					<template v-if="transformKind === 'field'" #content>
						<div :class="$style.fieldPicker">
							<template v-if="hasCatalog && fields.length > 0">
								<N8nInputLabel
									:label="i18n.baseText('runtimeCredentials.wizard.field.label')"
									input-name="runtime-field-select"
									size="small"
								>
									<N8nSelect
										v-model="fieldName"
										:placeholder="i18n.baseText('runtimeCredentials.wizard.field.placeholder')"
										data-test-id="runtime-field-select"
									>
										<N8nOption
											v-for="field in fields"
											:key="field.name"
											:value="field.name"
											:label="`${field.displayName} (${field.name})`"
										/>
									</N8nSelect>
								</N8nInputLabel>
							</template>
							<template v-else-if="hasCatalog">
								<N8nText size="small" color="text-light" data-test-id="runtime-field-none">
									{{ i18n.baseText('runtimeCredentials.wizard.field.none') }}
								</N8nText>
							</template>
							<template v-else>
								<N8nInputLabel
									:label="i18n.baseText('runtimeCredentials.wizard.field.label')"
									input-name="runtime-field-input"
									size="small"
								>
									<N8nInput
										id="runtime-field-input"
										v-model="fieldName"
										:placeholder="
											i18n.baseText('runtimeCredentials.wizard.field.fallback.placeholder')
										"
										data-test-id="runtime-field-input"
									/>
								</N8nInputLabel>
							</template>
						</div>
					</template>
				</N8nRadioGroupItem>
			</N8nRadioGroup>
			<N8nText
				v-if="hasCatalog"
				size="small"
				color="text-light"
				data-test-id="runtime-transform-suggestion"
			>
				{{
					i18n.baseText(
						suggested === 'bearer'
							? 'runtimeCredentials.wizard.transform.suggestion.bearer'
							: 'runtimeCredentials.wizard.transform.suggestion.field',
					)
				}}
			</N8nText>
		</div>

		<N8nCallout v-if="issue" theme="danger" slim data-test-id="runtime-credential-issue">
			{{ issueText(issue) }}
		</N8nCallout>
	</div>
</template>

<style lang="scss" module>
.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-block-start: var(--spacing--xs);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.types {
	/* Roughly six rows. The list scrolls instead of pushing the footer off the screen. */
	max-height: calc(var(--spacing--xl) * 6);
	overflow-y: auto;
	padding: var(--spacing--4xs);
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius);
}

.typeName {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
}

.suggestions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.fieldPicker {
	margin-block-start: var(--spacing--2xs);
}
</style>
