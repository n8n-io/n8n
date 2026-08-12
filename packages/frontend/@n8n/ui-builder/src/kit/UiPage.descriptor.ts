import { ACTION_PROP_TYPE, type UiComponentDef } from '../core/types';
import UiPage from './UiPage.vue';
import { CHILDREN } from './shared';

export const PAGE_DEF: UiComponentDef = {
	type: 'page',
	group: 'Layout',
	label: 'Page',
	component: UiPage,
	regions: CHILDREN,
	props: [
		{
			displayName: 'Path',
			name: 'path',
			type: 'string',
			default: '/',
			description: 'The route this page answers, e.g. /orders or /orders/:id',
		},
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
			description: 'Shown in the browser tab, and available to a nav control as $pages',
		},
		{
			displayName: 'On Enter',
			name: 'onEnter',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			type: ACTION_PROP_TYPE as any,
			default: [],
			description: 'Runs each time this page becomes the current one',
		},
	],
};
