<script setup lang="ts">
import {
	N8nButton,
	N8nInput,
	N8nInputLabel,
	N8nListbox,
	N8nListboxItem,
	N8nNodeIcon,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import PathChip from './PathChip.vue';
import SampleRequest from './SampleRequest.vue';
import { useTypeIcons } from '../composables/useTypeIcons';
import { PATH_PRESETS, RULE_TEMPLATES, TRIGGER_OPTIONS } from '../runtime-credentials.presets';
import type { PathPresetId, RuleTemplateId } from '../runtime-credentials.presets';
import type { PathProblem } from '../runtime-credentials.utils';

const { path, problem, showTemplates } = defineProps<{
	/** The path that the preset and the name produce. */
	path: string;
	problem?: PathProblem;
	showTemplates: boolean;
}>();

const emit = defineEmits<{ template: [id: RuleTemplateId] }>();

const nodeType = defineModel<string>('nodeType', { required: true });
const preset = defineModel<PathPresetId>('preset', { required: true });
const presetName = defineModel<string>('presetName', { required: true });
const customPath = defineModel<string>('customPath', { required: true });

const i18n = useI18n();
const { nodeIcon, credentialIcon } = useTypeIcons();

const PRESET_NAME_TEXT: Partial<
	Record<PathPresetId, { label: BaseTextKey; placeholder: BaseTextKey }>
> = {
	header: {
		label: 'runtimeCredentials.wizard.path.name.header',
		placeholder: 'runtimeCredentials.wizard.path.name.header.placeholder',
	},
	body: {
		label: 'runtimeCredentials.wizard.path.name.body',
		placeholder: 'runtimeCredentials.wizard.path.name.body.placeholder',
	},
	query: {
		label: 'runtimeCredentials.wizard.path.name.query',
		placeholder: 'runtimeCredentials.wizard.path.name.query.placeholder',
	},
};

const nameText = computed(() => PRESET_NAME_TEXT[preset.value]);

const problemText = computed(() => {
	switch (problem) {
		case 'empty':
			return i18n.baseText('runtimeCredentials.wizard.path.error.empty');
		case 'emptySegment':
			return i18n.baseText('runtimeCredentials.wizard.path.error.emptySegment');
		case 'unsafe':
			return i18n.baseText('runtimeCredentials.wizard.path.error.unsafe');
		default:
			return undefined;
	}
});

function onTrigger(value: string | undefined) {
	if (value !== undefined) nodeType.value = value;
}
</script>

<template>
	<div :class="$style.step" data-test-id="runtime-wizard-step-source">
		<div v-if="showTemplates" :class="$style.templates">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('runtimeCredentials.wizard.templates.label') }}
			</N8nText>
			<div :class="$style.row">
				<N8nButton
					v-for="template in RULE_TEMPLATES"
					:key="template.id"
					variant="outline"
					size="small"
					:data-test-id="`runtime-wizard-template-${template.id}`"
					@click="emit('template', template.id)"
				>
					<template #icon>
						<N8nNodeIcon v-bind="credentialIcon(template.credentialType)" :size="14" />
					</template>
					{{ i18n.baseText(template.titleKey) }}
				</N8nButton>
			</div>
		</div>

		<div :class="$style.field">
			<N8nText tag="span" size="small" bold>
				{{ i18n.baseText('runtimeCredentials.wizard.trigger.label') }}
			</N8nText>
			<N8nListbox
				:model-value="nodeType"
				:label="i18n.baseText('runtimeCredentials.wizard.trigger.label')"
				orientation="horizontal"
				:class="$style.triggers"
				data-test-id="runtime-trigger-list"
				@update:model-value="onTrigger"
			>
				<N8nListboxItem
					v-for="option in TRIGGER_OPTIONS"
					:key="option.id"
					:value="option.nodeType"
					:data-test-id="`runtime-trigger-${option.id}`"
				>
					<template #leading>
						<N8nNodeIcon v-bind="nodeIcon(option.nodeType)" :size="16" />
					</template>
					{{ i18n.baseText(option.labelKey) }}
				</N8nListboxItem>
			</N8nListbox>
			<N8nText v-if="nodeType === '*'" size="small" color="text-light">
				{{ i18n.baseText('runtimeCredentials.wizard.trigger.any.description') }}
			</N8nText>
		</div>

		<div :class="$style.field">
			<N8nText tag="span" size="small" bold>
				{{ i18n.baseText('runtimeCredentials.wizard.path.label') }}
			</N8nText>
			<div
				:class="$style.row"
				role="group"
				:aria-label="i18n.baseText('runtimeCredentials.wizard.path.label')"
			>
				<N8nButton
					v-for="option in PATH_PRESETS"
					:key="option.id"
					:variant="preset === option.id ? 'solid' : 'outline'"
					size="small"
					:aria-pressed="preset === option.id"
					:data-test-id="`runtime-path-preset-${option.id}`"
					@click="preset = option.id"
				>
					{{ i18n.baseText(option.labelKey) }}
				</N8nButton>
			</div>

			<N8nInputLabel
				v-if="nameText"
				:label="i18n.baseText(nameText.label)"
				input-name="runtime-path-name"
				size="small"
			>
				<N8nInput
					id="runtime-path-name"
					v-model="presetName"
					:placeholder="i18n.baseText(nameText.placeholder)"
					data-test-id="runtime-path-name"
				/>
			</N8nInputLabel>
			<N8nInputLabel
				v-else-if="preset === 'custom'"
				:label="i18n.baseText('runtimeCredentials.wizard.path.custom.label')"
				input-name="runtime-path-custom"
				size="small"
			>
				<N8nInput
					id="runtime-path-custom"
					v-model="customPath"
					:placeholder="i18n.baseText('runtimeCredentials.wizard.path.custom.placeholder')"
					:class="$style.mono"
					data-test-id="runtime-path-custom"
				/>
			</N8nInputLabel>

			<N8nText
				v-if="problemText && path.trim() !== ''"
				size="small"
				color="danger"
				data-test-id="runtime-path-error"
			>
				{{ problemText }}
			</N8nText>
			<div v-else-if="path.trim() !== ''" :class="$style.result">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('runtimeCredentials.wizard.path.result') }}
				</N8nText>
				<PathChip :path="path" />
			</div>
			<N8nText v-else size="small" color="text-light">
				{{ i18n.baseText('runtimeCredentials.wizard.path.hint') }}
			</N8nText>
		</div>

		<SampleRequest v-if="!problem" :path="path" />
	</div>
</template>

<style lang="scss" module>
.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-block-start: var(--spacing--xs);
}

.templates,
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.triggers {
	--n8n-listbox-item--padding: var(--spacing--4xs) var(--spacing--2xs);

	flex-wrap: wrap;
}

.result {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.mono input {
	font-family: var(--font-family--monospace);
}
</style>
