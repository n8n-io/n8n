import type { UiComponentDef } from '../core/types';
import UiIf from './UiIf.vue';
import { CHILDREN } from './shared';

export const IF_DEF: UiComponentDef = {
	type: 'if',
	group: 'Logic',
	label: 'If',
	component: UiIf,
	regions: CHILDREN,
	// Renders its subtree only when the condition holds. There are no named
	// branches: an "else" is a second If with a negated condition.
	wantsEditFlag: true,
	props: [
		{
			displayName: 'Condition',
			name: 'condition',
			type: 'string',
			default: '={{ $state.orders.length > 0 }}',
		},
	],
};
