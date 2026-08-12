<script setup lang="ts">
import {
	N8nCollapsiblePanel,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSectionHeader,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { INodeProperties } from 'n8n-workflow';
import { computed, reactive } from 'vue';

import PaneShell from './PaneShell.vue';
import UiActionEditor from './UiActionEditor.vue';
import { normaliseAction } from '../../core/actions';
import { pageLabel } from '../../core/pages';
import type { UiActionStep, UiNode, UiPageInfo, UiRegion } from '../../core/types';
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
	descriptors: INodeProperties[];
	pages: UiPageInfo[];
	targets: WebhookTarget[];
	disabled?: boolean;
	labelFor: (url: string) => string;
	browse: () => Promise<string | undefined>;
	createTrigger: (propName: string) => Promise<string | undefined>;
	run: (url: string) => void;
	history: (url: string) => void;
}>();

const emit = defineEmits<{
	setProp: [name: string, value: unknown];
}>();

const selectedDef = computed(() => (props.node ? getComponentDef(props.node.type) : undefined));

function steps(name: string): UiActionStep[] {
	return normaliseAction(props.node?.props[name]);
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

/**
 * Every value prop takes an expression, and nothing on screen said so: an
 * author had to know the syntax before they could discover it. The placeholder
 * carries it, keyed to the prop's own type so the example is one you might
 * actually write.
 */
function placeholderFor(descriptor: INodeProperties): string {
	if (descriptor.type === 'statePath') return 'form.name';
	if (descriptor.type === 'number') return '={{ $state.count }}';
	return '={{ $state.title }}';
}

/** A bound prop reads as an expression, so the field says which mode it is in. */
function isBound(name: string): boolean {
	return valueOf(name).startsWith('=');
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
				<!--
					An action is a chain of steps, not one value, so it gets its own
					subpanel rather than sharing the plain label row every other prop
					uses.
				-->
				<N8nCollapsiblePanel
					v-if="descriptor.type === 'action'"
					:title="descriptor.displayName"
					:model-value="isActionPanelOpen(descriptor.name)"
					@update:model-value="actionPanelsOpen[descriptor.name] = $event"
				>
					<UiActionEditor
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
				</N8nCollapsiblePanel>

				<!--
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
					<N8nSelect
						v-if="descriptor.type === 'options'"
						:model-value="node.props[descriptor.name]"
						:disabled="disabled"
						size="small"
						@update:model-value="emit('setProp', descriptor.name, $event)"
					>
						<N8nOption
							v-for="option in descriptor.options ?? []"
							:key="String((option as { value: unknown }).value)"
							:label="(option as { name: string }).name"
							:value="(option as { value: unknown }).value"
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

					<div class="ui-value-field">
						<N8nInput
							:model-value="valueOf(descriptor.name)"
							:disabled="disabled"
							size="small"
							:placeholder="placeholderFor(descriptor)"
							@update:model-value="emit('setProp', descriptor.name, $event)"
						/>

						<span
							v-if="descriptor.type !== 'statePath'"
							class="ui-value-field__mode"
							:class="{ 'ui-value-field__mode--bound': isBound(descriptor.name) }"
						>
							{{ isBound(descriptor.name) ? 'expression' : 'fixed' }}
						</span>
					</div>
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

.ui-value-field {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

/*
 * Which mode the field is in, rather than a control to switch it: the syntax
 * is the switch, and a label that lit up when you typed `=` teaches it faster
 * than a toggle would.
 */
.ui-value-field__mode {
	flex-shrink: 0;
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	font-variant: small-caps;
}

.ui-value-field__mode--bound {
	color: var(--color--primary);
}

.ui-inspector-empty {
	padding: var(--spacing--lg);
	text-align: center;
}
</style>
