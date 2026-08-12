<script setup lang="ts">
import { get } from 'lodash';
import { computed, inject, onBeforeUnmount, onMounted, watchEffect } from 'vue';

import { UiScopeRegistryKey } from './scope-registry';
import { isActionInFlight, normaliseAction } from '../core/actions';
import { childrenIn, regionsOf } from '../core/document';
import { resolveValue } from '../core/expressions';
import { getComponentDef } from '../kit';
import { currentPageId } from '../core/pages';
import { ACTION_PROP_TYPE, STATE_PATH_PROP_TYPE } from '../core/types';
import type { UiActionRequest, UiNode, UiScope } from '../core/types';

/**
 * The one renderer. The served page and the editor's canvas both mount this, so
 * what an author composes is literally what ships. `edit` suppresses actions and
 * layers on selection; nothing else differs.
 *
 * It renders one node and recurses, which makes it the thing any component uses
 * to render a subtree: a component declares regions, the renderer fills the
 * matching slots, and the component decides where in its own markup they go.
 */
defineOptions({ name: 'UiRenderer' });

const props = withDefaults(
	defineProps<{
		node: UiNode;
		scope: UiScope;
		/**
		 * False for every copy of this node except the one on the first-item path
		 * of every enclosing repeat. Only that one publishes its scope.
		 */
		primary?: boolean;
		edit?: boolean;
		selectedId?: string;
		hoveredId?: string;
		onSelect?: (id: string) => void;
		onHover?: (id: string | undefined) => void;
		onWrite?: (path: string, value: unknown) => void;
		onAct?: (request: UiActionRequest) => void;
	}>(),
	{
		primary: true,
		edit: false,
		selectedId: undefined,
		hoveredId: undefined,
		onSelect: undefined,
		onHover: undefined,
		onWrite: undefined,
		onAct: undefined,
	},
);

const def = computed(() => getComponentDef(props.node.type));

const regions = computed(() => regionsOf(props.node));

/** The props that hold a chain, which is the only place a webhook can be. */
const actionProps = computed(() =>
	(def.value?.props ?? [])
		.filter((descriptor) => descriptor.type === ACTION_PROP_TYPE)
		.map((descriptor) => descriptor.name),
);

/**
 * Whether one of this node's own actions is calling out right now. The canvas
 * is never busy: it fires no actions, so nothing there would ever turn it off
 * again.
 */
const busy = computed(
	() => !props.edit && isActionInFlight(props.node.props, actionProps.value, props.scope.$loading),
);

/** The dotted place in state this node binds to, if it binds to one. */
const statePath = computed(() => {
	const descriptor = def.value?.props.find((entry) => entry.type === STATE_PATH_PROP_TYPE);
	const path = descriptor ? props.node.props[descriptor.name] : undefined;

	return typeof path === 'string' && path ? path : undefined;
});

/**
 * Value props only. Action and state-path props are instructions to the runtime,
 * not things to render, so they never reach the component — except that a bound
 * component is handed back what is at its path, which is the other half of the
 * one binding its author wrote.
 */
const resolvedProps = computed(() => {
	const out: Record<string, unknown> = {};

	for (const descriptor of def.value?.props ?? []) {
		if (descriptor.type === ACTION_PROP_TYPE || descriptor.type === STATE_PATH_PROP_TYPE) continue;

		const raw = props.node.props[descriptor.name];
		out[descriptor.name] = resolveValue(raw === undefined ? descriptor.default : raw, props.scope);
	}

	const bound = def.value?.bindsValueTo;
	if (bound) {
		out[bound] = statePath.value ? get(props.scope.$state, statePath.value) : undefined;
	}

	if (def.value?.wantsEditFlag) out.editing = props.edit;
	if (def.value?.wantsBusyFlag) out.busy = busy.value;

	return out;
});

/**
 * One scope per iteration. A plain container has exactly one and passes its own
 * scope down untouched; a repeat has one per element, each with `$item` and
 * `$index` on top, so an expression inside the subtree can name what it is being
 * rendered for.
 *
 * The canvas always gets one iteration, even over an empty or unresolved array:
 * a subtree that renders zero times cannot be clicked, and so cannot be edited.
 */
const iterations = computed<UiScope[]>(() => {
	const over = def.value?.repeatOver;
	if (!over) return [props.scope];

	const items = resolvedProps.value[over];

	if (!Array.isArray(items) || items.length === 0) {
		return props.edit ? [{ ...props.scope, $item: undefined, $index: 0 }] : [];
	}

	return items.map((item, index) => ({ ...props.scope, $item: item, $index: index }));
});

/**
 * The children to render in a region. Ordinary regions render all of them; the
 * paged region of a frame renders the one page the route names, so a header and
 * a footer stay put while the content swaps.
 */
function childrenOf(region: string): UiNode[] {
	const children = childrenIn(props.node, region);

	if (def.value?.pagedRegion !== region) return children;

	const current = currentPageId(props.node, props.scope.$route);
	return children.filter((child) => child.id === current);
}

/**
 * The chain an action prop holds, fired with the scope it was fired in. The
 * steps are handed over raw: each one's expressions resolve as it runs, so a
 * notification after a webhook sees the state that webhook merged.
 */
function fire(name: string) {
	if (props.edit) return;

	const steps = normaliseAction(props.node.props[name]);
	if (steps.length) props.onAct?.({ steps, scope: props.scope });
}

function handleAct() {
	fire('onClick');
}

/**
 * The prop a component's input writes into, found by its descriptor type rather
 * than by being called `model`, so a component naming it anything else still
 * works.
 *
 * Not gated on edit, unlike actions: a write goes into the state the scope is
 * rendered against, and the canvas renders against a state of its own. Typing
 * into it is how an author fills the state their expressions read — the
 * inspector resolves against it, and so does a previewed request body.
 */
function handleWrite(value: unknown) {
	if (statePath.value) props.onWrite?.(statePath.value, value);
}

function handleSelect(event: MouseEvent) {
	if (!props.edit) return;
	// Innermost component wins, otherwise every click selects the page.
	event.stopPropagation();
	props.onSelect?.(props.node.id);
}

/**
 * Hover is tracked rather than left to CSS `:hover`, which would light up every
 * ancestor of the pointer at once and turn the canvas into a nest of boxes. The
 * same innermost-wins rule as selection.
 */
function handleHover(event: MouseEvent) {
	if (!props.edit) return;
	event.stopPropagation();
	props.onHover?.(props.node.id);
}

function handleLeave() {
	if (props.edit && props.hoveredId === props.node.id) props.onHover?.(undefined);
}

onMounted(() => {
	fire('onMount');
});

const scopeRegistry = inject(UiScopeRegistryKey, undefined);

if (scopeRegistry) {
	watchEffect(() => {
		if (props.primary) scopeRegistry.publish(props.node.id, props.scope);
	});
	onBeforeUnmount(() => {
		if (props.primary) scopeRegistry.forget(props.node.id);
	});
}
</script>

<template>
	<div
		v-if="def"
		:class="[
			'ui-node',
			{
				'ui-node--edit': edit,
				'ui-node--hovered': edit && hoveredId === node.id,
				'ui-node--selected': edit && selectedId === node.id,
			},
		]"
		@click="handleSelect"
		@mouseover="handleHover"
		@mouseleave="handleLeave"
	>
		<component :is="def.component" v-bind="resolvedProps" @act="handleAct" @write="handleWrite">
			<!--
				A region per slot, by name. The component decides where each one
				lands in its own markup, which is the whole point: a card puts
				`header` above `body`, and the document says nothing about layout.
			-->
			<template v-for="region in regions" :key="region.name" #[region.name]>
				<template v-for="(iterationScope, iteration) in iterations" :key="iteration">
					<UiRenderer
						v-for="child in childrenOf(region.name)"
						:key="`${child.id}#${iteration}`"
						:node="child"
						:scope="iterationScope"
						:primary="primary && iteration === 0"
						:edit="edit"
						:selected-id="selectedId"
						:hovered-id="hoveredId"
						:on-select="onSelect"
						:on-hover="onHover"
						:on-write="onWrite"
						:on-act="onAct"
					/>
				</template>

				<span v-if="edit && childrenOf(region.name).length === 0" class="ui-region-empty">
					{{ region.label }}
				</span>
			</template>
		</component>
	</div>
	<div v-else class="ui-node ui-node--unknown">Unknown component: {{ node.type }}</div>
</template>

<style scoped>
.ui-node--edit {
	/* No outline at rest: the canvas is a preview first, and an editor second. */
	cursor: pointer;
	border-radius: 2px;
	transition: outline-color 80ms ease-out;
	outline: 1px dashed transparent;
	outline-offset: 2px;
}

.ui-node--hovered {
	outline-color: var(--color--foreground--shade-2, #909399);
}

.ui-node--selected {
	outline: 2px solid var(--color--primary, #ff6d5a);
	outline-offset: 2px;
}

.ui-node--unknown {
	padding: 4px 8px;
	border: 1px dashed var(--color--danger, #b0342a);
	color: var(--color--danger, #b0342a);
	font-size: 12px;
}

/* An empty region is invisible, and so undroppable, without a placeholder. */
.ui-region-empty {
	display: block;
	padding: 6px 8px;
	border: 1px dashed var(--color--foreground, #dbdfe7);
	border-radius: 4px;
	color: var(--color--text--tint-1, #7d7d87);
	font-size: 11px;
}
</style>
