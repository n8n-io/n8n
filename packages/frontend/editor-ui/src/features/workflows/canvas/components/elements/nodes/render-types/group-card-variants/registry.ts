import type { Component } from 'vue';

import GroupCardV1 from './GroupCardV1.vue';
import GroupCardV2 from './GroupCardV2.vue';
import GroupCardV3 from './GroupCardV3.vue';
import GroupCardV4 from './GroupCardV4.vue';

export interface GroupCardVariant {
	id: string;
	label: string;
	component: Component;
	/** When true, trigger nodes also render as a title + description card
	 * (see render-types/trigger-card). Lets a variant be a whole-canvas
	 * "version", not only a group-card swap. */
	triggerCard?: boolean;
	/** When true, the trigger card also surfaces its (mock-editable) trigger
	 * rules beneath the description. */
	triggerRules?: boolean;
}

/**
 * Prototype-only registry of collapsed group-card variants for usability
 * testing. To add a new variant: create `GroupCardV<n>.vue` (copy an existing
 * one) and append an entry here — the on-canvas switcher and persistence pick
 * it up automatically.
 */
export const GROUP_CARD_VARIANTS: GroupCardVariant[] = [
	{ id: 'v1', label: 'V1', component: GroupCardV1 },
	{ id: 'v2', label: 'V2', component: GroupCardV2, triggerCard: true },
	{ id: 'v3', label: 'V3', component: GroupCardV3, triggerCard: true, triggerRules: true },
	{ id: 'v4', label: 'V4', component: GroupCardV4, triggerCard: true },
];
