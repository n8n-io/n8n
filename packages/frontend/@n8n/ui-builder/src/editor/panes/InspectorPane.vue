<script setup lang="ts">
import {
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSectionHeader,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { INodePropertyOptions } from 'n8n-workflow';

import PaneShell from './PaneShell.vue';
import UiActionEditor from './UiActionEditor.vue';
import UiValueField from './UiValueField.vue';
import { normaliseAction } from '../../core/actions';
import { pageLabel } from '../../core/pages';
import type {
	UiActionStep,
	UiNode,
	UiPageInfo,
	UiProperty,
	UiRegion,
	UiScope,
} from '../../core/types';
import type { WebhookTarget } from '../composables/useWebhookTargets';

/**
 * The selected component's properties, driven entirely by its descriptors: the
 * pane knows the four prop kinds and nothing about any particular component.
 */
defineOptions({ name: 'InspectorPane' });

const props = defineProps<{
	node?: UiNode;
	descriptors: UiProperty[];
	regions: UiRegion[];
	targetRegion: string;
	pages: UiPageInfo[];
	targets: WebhookTarget[];
	/** What the selected node is being rendered with, so the preview matches the canvas. */
	scope: UiScope;
	disabled?: boolean;
	labelFor: (url: string) => string;
	browse: () => Promise<string | undefined>;
	createTrigger: (propName: string) => Promise<string | undefined>;
	run: (url: string) => void;
	history: (url: string) => void;
}>();

const emit = defineEmits<{
	setProp: [name: string, value: unknown];
	'update:targetRegion': [region: string];
}>();

function steps(name: string): UiActionStep[] {
	return normaliseAction(props.node?.props[name]);
}

function valueOf(name: string): string {
	return String(props.node?.props[name] ?? '');
}

/** Collections and nested properties can sit in `options` too; only real choices render. */
function choicesOf(descriptor: UiProperty): INodePropertyOptions[] {
	return (descriptor.options ?? []).filter(
		(option): option is INodePropertyOptions => 'value' in option,
	);
}
</script>

<template>
	<PaneShell title="Properties">
		<template v-if="node">
			<N8nSectionHeader :title="node.type" bordered />

			<!--
				A component with one drop point needs no choosing; with three, "add to
				the selection" has no answer without it.
			-->
			<div v-if="regions.length > 1" class="ui-field">
				<N8nInputLabel label="Add to" :bold="false" size="small" color="text-dark">
					<N8nSelect
						:model-value="targetRegion"
						size="small"
						:disabled="disabled"
						@update:model-value="emit('update:targetRegion', $event)"
					>
						<N8nOption
							v-for="region in regions"
							:key="region.name"
							:label="region.label"
							:value="region.name"
						/>
					</N8nSelect>
				</N8nInputLabel>
			</div>

			<div v-for="descriptor in descriptors" :key="descriptor.name" class="ui-field">
				<!--
					`description` is written on every descriptor and used to go nowhere.
					`show-tooltip` keeps the marker visible rather than only on hover,
					since a pane this narrow gives no other clue that there is more to
					read.
				-->
				<N8nInputLabel
					:label="descriptor.displayName"
					:tooltip-text="descriptor.description"
					:show-tooltip="Boolean(descriptor.description)"
					:bold="false"
					size="small"
					color="text-dark"
				>
					<N8nSelect
						v-if="descriptor.type === 'options'"
						:model-value="node.props[descriptor.name]"
						:disabled="disabled"
						size="small"
						@update:model-value="emit('setProp', descriptor.name, $event)"
					>
						<N8nOption
							v-for="option in choicesOf(descriptor)"
							:key="String(option.value)"
							:label="option.name"
							:value="option.value"
						/>
					</N8nSelect>

					<N8nSelect
						v-else-if="descriptor.type === 'boolean'"
						:model-value="Boolean(node.props[descriptor.name])"
						:disabled="disabled"
						size="small"
						@update:model-value="emit('setProp', descriptor.name, $event)"
					>
						<N8nOption label="false" :value="false" />
						<N8nOption label="true" :value="true" />
					</N8nSelect>

					<!--
						An action is a chain of steps, and the same editor serves every
						action prop on every component.
					-->
					<UiActionEditor
						v-else-if="descriptor.type === 'action'"
						:steps="steps(descriptor.name)"
						:targets="targets"
						:pages="pages"
						:disabled="disabled"
						:label-for="labelFor"
						:browse="browse"
						:create="async () => await createTrigger(descriptor.name)"
						:run="run"
						:history="history"
						@update="emit('setProp', descriptor.name, $event)"
					/>

					<!-- A page path, picked from the pages the document holds. -->
					<N8nSelect
						v-else-if="descriptor.type === 'route'"
						:model-value="valueOf(descriptor.name)"
						:disabled="disabled || pages.length === 0"
						size="small"
						clearable
						:placeholder="pages.length ? 'Pick a page' : 'This app has no pages yet'"
						@update:model-value="emit('setProp', descriptor.name, $event ?? '')"
					>
						<N8nOption
							v-for="page in pages"
							:key="page.id"
							:label="pageLabel(page)"
							:value="page.path"
						/>
					</N8nSelect>

					<!-- A dotted path into state, written as text: never an expression. -->
					<N8nInput
						v-if="descriptor.type === 'statePath'"
						:model-value="valueOf(descriptor.name)"
						:disabled="disabled"
						size="small"
						placeholder="form.name"
						@update:model-value="emit('setProp', descriptor.name, $event)"
					/>

					<UiValueField
						v-else
						:descriptor="descriptor"
						:model-value="node.props[descriptor.name]"
						:scope="scope"
						:disabled="disabled"
						@update="emit('setProp', descriptor.name, $event)"
					/>
				</N8nInputLabel>
			</div>
		</template>

		<div v-else class="ui-inspector-empty">
			<N8nText size="small" color="text-light">
				Select a component in the canvas to edit it.
			</N8nText>
		</div>
	</PaneShell>
</template>

<style scoped>
.ui-field {
	margin: var(--spacing--xs) 0;
}

.ui-inspector-empty {
	padding: var(--spacing--lg);
	text-align: center;
}
</style>
