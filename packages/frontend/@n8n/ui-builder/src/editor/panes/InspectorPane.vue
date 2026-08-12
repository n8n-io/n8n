<script setup lang="ts">
import {
	N8nCollapsiblePanel,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSectionHeader,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { INodePropertyOptions } from 'n8n-workflow';
import { computed, reactive } from 'vue';

import PaneShell from './PaneShell.vue';
import UiActionEditor from './UiActionEditor.vue';
import UiValueField from './UiValueField.vue';
import { normaliseAction } from '../../core/actions';
import { pageLabel } from '../../core/pages';
import {
	ACTION_PROP_TYPE,
	STATE_PATH_PROP_TYPE,
	type UiActionStep,
	type UiHttpMethod,
	type UiNode,
	type UiPageInfo,
	type UiProperty,
	type UiRegion,
	type UiScope,
	type UiWebhookStep,
} from '../../core/types';
import { getComponentDef } from '../../kit';
import type { WebhookTarget } from '../composables/useWebhookTargets';

/**
 * The selected component's properties, driven entirely by its descriptors: the
 * pane knows the four prop kinds and nothing about any particular component.
 *
 * A fixed pseudo-component (the app frame's header, pages or footer) has no
 * descriptors of its own: `pseudo` names it instead, and the pane shows only
 * its icon and label, the way it shows the frame's when `node` has no props
 * worth listing either.
 */
defineOptions({ name: 'InspectorPane' });

const props = defineProps<{
	node?: UiNode;
	pseudo?: UiRegion;
	descriptors: UiProperty[];
	pages: UiPageInfo[];
	targets: WebhookTarget[];
	/** What the selected node is being rendered with, so the preview matches the canvas. */
	scope: UiScope;
	/** What each action step's call has answered in the canvas, by its reply key. */
	responses: Record<string, unknown>;
	disabled?: boolean;
	labelFor: (url: string, method?: UiHttpMethod) => string;
	browse: () => Promise<WebhookTarget | undefined>;
	createTrigger: (propName: string) => Promise<WebhookTarget | undefined>;
	run: (step: UiWebhookStep, following: UiActionStep[]) => void;
	history: (step: UiWebhookStep, following: UiActionStep[]) => void;
	runAll: (steps: UiActionStep[]) => void;
	/** What the last run/history click against a webhook step returned, if anything. */
	previewStatus?: string;
}>();

const emit = defineEmits<{
	setProp: [name: string, value: unknown];
}>();

const selectedDef = computed(() => (props.node ? getComponentDef(props.node.type) : undefined));

function steps(name: string): UiActionStep[] {
	return normaliseAction(props.node?.props[name]);
}

/** Nothing to run until a step points somewhere: the other step kinds call nothing. */
function callable(name: string): boolean {
	return steps(name).some((step) => step.kind === 'webhook' && Boolean(step.url));
}

/**
 * The action subpanel's own expanded state. N8nCollapsiblePanel needs its
 * `modelValue` wired up to actually toggle; local state is enough since
 * nothing else needs to know or persist whether it is open.
 */
const actionPanelsOpen = reactive<Record<string, boolean>>({});

function isActionPanelOpen(name: string): boolean {
	return actionPanelsOpen[name] ?? true;
}

function valueOf(name: string): string {
	return String(props.node?.props[name] ?? '');
}

const EDITED_BY_KIND: ReadonlyArray<UiProperty['type']> = [ACTION_PROP_TYPE, STATE_PATH_PROP_TYPE];

/**
 * Everything else falls through to a value field, which can hold an
 * expression. `options`, `boolean` and `route` render their own dropdown as
 * the value field's fixed-mode widget (see the `#fixed` templates below),
 * so they gain expression support without losing their picker UI.
 */
function hasOwnEditor(descriptor: UiProperty): boolean {
	return EDITED_BY_KIND.includes(descriptor.type);
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
			<div v-if="selectedDef?.icon" class="ui-inspector-heading">
				<N8nIcon :icon="selectedDef.icon" size="small" class="ui-inspector-heading__icon" />
				<N8nText size="small" :bold="true" color="text-dark">{{ selectedDef.label }}</N8nText>
			</div>
			<N8nSectionHeader v-else :title="selectedDef?.label ?? node.type" bordered />

			<div v-for="descriptor in descriptors" :key="descriptor.name" class="ui-field">
				<!-- Renders its own label, so the fixed/expression toggle can sit in it. -->
				<UiValueField
					v-if="!hasOwnEditor(descriptor)"
					:descriptor="descriptor"
					:model-value="node.props[descriptor.name]"
					:scope="scope"
					:disabled="disabled"
					@update="emit('setProp', descriptor.name, $event)"
				>
					<template
						v-if="descriptor.type === 'options'"
						#fixed="{ value, disabled: isDisabled, update }"
					>
						<N8nSelect
							:model-value="value"
							:disabled="isDisabled"
							size="small"
							@update:model-value="update"
						>
							<N8nOption
								v-for="option in choicesOf(descriptor)"
								:key="String(option.value)"
								:label="option.name"
								:value="option.value"
							/>
						</N8nSelect>
					</template>

					<template
						v-else-if="descriptor.type === 'boolean'"
						#fixed="{ value, disabled: isDisabled, update }"
					>
						<N8nSelect
							:model-value="Boolean(value)"
							:disabled="isDisabled"
							size="small"
							@update:model-value="update"
						>
							<N8nOption label="false" :value="false" />
							<N8nOption label="true" :value="true" />
						</N8nSelect>
					</template>

					<!-- A page path, picked from the pages the document holds. -->
					<template
						v-else-if="descriptor.type === 'route'"
						#fixed="{ value, disabled: isDisabled, update }"
					>
						<N8nSelect
							:model-value="value"
							:disabled="isDisabled || pages.length === 0"
							size="small"
							clearable
							:placeholder="pages.length ? 'Pick a page' : 'This app has no pages yet'"
							@update:model-value="update($event ?? '')"
						>
							<N8nOption
								v-for="page in pages"
								:key="page.id"
								:label="pageLabel(page)"
								:value="page.path"
							/>
						</N8nSelect>
					</template>
				</UiValueField>

				<!--
					An action is a chain of steps, not one value, so it gets its own
					subpanel rather than sharing the plain label row every other prop
					uses.
				-->
				<N8nCollapsiblePanel
					v-else-if="descriptor.type === 'action'"
					:title="descriptor.displayName"
					:model-value="isActionPanelOpen(descriptor.name)"
					:show-actions-on-hover="false"
					@update:model-value="actionPanelsOpen[descriptor.name] = $event"
				>
					<!--
						Runs the chain itself, beside its name rather than beside a step:
						it is the whole action a click performs, and where that leaves the
						app is what the canvas then shows.
					-->
					<template #actions>
						<N8nTooltip
							:content="
								callable(descriptor.name)
									? 'Run every step of this action and preview where it leaves the app'
									: 'No step of this action calls an endpoint yet'
							"
						>
							<N8nIconButton
								variant="ghost"
								size="xsmall"
								icon="play"
								:aria-label="`Run ${descriptor.displayName}`"
								:disabled="disabled || !callable(descriptor.name)"
								@click="runAll(steps(descriptor.name))"
							/>
						</N8nTooltip>
					</template>

					<UiActionEditor
						:steps="steps(descriptor.name)"
						:scope="scope"
						:responses="responses"
						:targets="targets"
						:pages="pages"
						:disabled="disabled"
						:label-for="labelFor"
						:browse="browse"
						:create="async () => await createTrigger(descriptor.name)"
						:run="run"
						:history="history"
						:preview-status="previewStatus"
						@update="emit('setProp', descriptor.name, $event)"
					/>
				</N8nCollapsiblePanel>

				<!--
					A dotted path into state, written as text: never an expression.
					`description` is written on every descriptor and used to go nowhere.
					`show-tooltip` keeps the marker visible rather than only on hover,
					since a pane this narrow gives no other clue that there is more to
					read.
				-->
				<N8nInputLabel
					v-else
					:label="descriptor.displayName"
					:tooltip-text="descriptor.description"
					:show-tooltip="Boolean(descriptor.description)"
					:bold="false"
					size="small"
					color="text-dark"
				>
					<N8nInput
						:model-value="valueOf(descriptor.name)"
						:disabled="disabled"
						size="small"
						placeholder="form.name"
						@update:model-value="emit('setProp', descriptor.name, $event)"
					/>
				</N8nInputLabel>
			</div>
		</template>

		<template v-else-if="pseudo">
			<div class="ui-inspector-heading">
				<N8nIcon
					v-if="pseudo.icon"
					:icon="pseudo.icon"
					size="small"
					class="ui-inspector-heading__icon"
				/>
				<N8nText size="small" :bold="true" color="text-dark">{{ pseudo.label }}</N8nText>
			</div>
			<div class="ui-inspector-empty">
				<N8nText size="small" color="text-light">
					A fixed part of the app frame. Add components to it from the palette.
				</N8nText>
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
/*
 * Only the app frame has an icon here: it is the one node on the canvas that
 * is not something an author composed, and the header should read that way
 * before any label does.
 */
.ui-inspector-heading {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-height: 26px;
	padding-bottom: var(--spacing--4xs);
	border-bottom: var(--border);
	margin-bottom: var(--spacing--4xs);
}

.ui-inspector-heading__icon {
	color: var(--color--text--tint-1);
}

.ui-field {
	margin: var(--spacing--xs) 0;
}

.ui-inspector-empty {
	padding: var(--spacing--lg);
	text-align: center;
}
</style>
