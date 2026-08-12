import type { INodeProperties } from 'n8n-workflow';
import type { Component } from 'vue';

import type { UiComponentSpec, UiProperty, UiPropertyType } from '../schema/types';

/**
 * The format lives in `../schema`, which knows nothing of Vue and so can be read
 * by the node and by the workflow SDK. This file is the renderer's view of it:
 * the same types, plus the one thing a kit entry needs that a schema cannot
 * hold — a component to render.
 */
export * from '../schema/types';

/**
 * A kit entry: a spec, and what draws it.
 *
 * `props` are n8n node-property descriptors so the editor's inspector can be
 * n8n's own parameter inputs pointed at a component instead of a node.
 */
export interface UiComponentDef extends UiComponentSpec {
	component: Component;
}

/**
 * The inspector feeds descriptors to n8n's parameter inputs, so a descriptor has
 * to be one. `UiProperty` is declared structurally over in the schema to keep
 * that half of the package free of `n8n-workflow`; this is where the two are
 * held to each other.
 */
type AssertCompatible<T extends Omit<INodeProperties, 'type'> & { type: UiPropertyType }> = T;
export type UiPropertyIsNodeProperty = AssertCompatible<UiProperty>;
