import { VueRenderer } from '@tiptap/vue-3';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';

import SuggestionMenu from './SuggestionMenu.vue';
import type { SuggestionMenuItem } from './types';

type SuggestionMenuRenderer = VueRenderer & {
	ref?: {
		onKeyDown?: (props: SuggestionKeyDownProps) => boolean;
	};
};

type SuggestionMenuRenderOptions = {
	ariaLabel: string;
	dataTestId?: string;
	itemDataTestIdPrefix?: string;
};

export const renderSuggestionMenu = <TItem extends SuggestionMenuItem>({
	ariaLabel,
	dataTestId,
	itemDataTestIdPrefix,
}: SuggestionMenuRenderOptions) => {
	let component: SuggestionMenuRenderer | undefined;

	const getProps = (props: SuggestionProps<TItem, TItem>) => ({
		...props,
		ariaLabel,
		dataTestId,
		itemDataTestIdPrefix,
		onSelect: (item: TItem) => props.command(item),
	});

	return {
		onStart: (props: SuggestionProps<TItem, TItem>) => {
			component = new VueRenderer(SuggestionMenu, {
				props: getProps(props),
				editor: props.editor,
			}) as SuggestionMenuRenderer;
		},
		onUpdate: (props: SuggestionProps<TItem, TItem>) => {
			component?.updateProps(getProps(props));
		},
		onExit: () => {
			component?.destroy();
			component = undefined;
		},
		onKeyDown: (props: SuggestionKeyDownProps) => component?.ref?.onKeyDown?.(props) ?? false,
	};
};
