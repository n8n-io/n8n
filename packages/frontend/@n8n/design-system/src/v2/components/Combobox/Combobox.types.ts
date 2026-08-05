import type { IconName } from '../../../components/N8nIcon/icons';
import type { InputSize } from '../../../components/N8nInput/Input.types';
import type {
	ComboboxContentProps,
	ComboboxItemProps,
	ComboboxRootEmits,
	ComboboxRootProps,
} from '../../utils/reka-ui';

export type AcceptableValue = string | Record<string, unknown>;

export type ComboboxProps = Omit<ComboboxRootProps<AcceptableValue>, 'dir' | 'openOnFocus'> &
	Pick<ComboboxContentProps, 'side' | 'sideOffset' | 'align'> & {
		size?: ComboboxSizes;
		icon?: IconName;
		placeholder?: string;
		autoFocus?: boolean;
		emptyText?: string;
		valueKey?: string;
		labelKey?: string;
		items?: Array<ComboboxItem | Record<string, unknown>>;
		contentClass?: string;
		id?: string;
		clearable?: boolean;
		teleported?: boolean;
		portalTarget?: string | HTMLElement;
	};

export type ComboboxEmits = ComboboxRootEmits<AcceptableValue | AcceptableValue[] | undefined>;

type ComboboxListItemBase = Omit<ComboboxItemProps, 'value'> & {
	label?: string;
	icon?: IconName;
};

export type ComboboxLabelItem = ComboboxListItemBase & {
	type: 'label';
	label: string;
	value?: AcceptableValue;
};

export type ComboboxSeparatorItem = ComboboxListItemBase & {
	type: 'separator';
	value?: AcceptableValue;
};

export type ComboboxOptionItem = ComboboxListItemBase & {
	type?: 'item';
	value: AcceptableValue;
};

export type ComboboxListItem = ComboboxLabelItem | ComboboxSeparatorItem | ComboboxOptionItem;

export type ComboboxItem = string | ComboboxListItem;

export type ComboboxSizes = InputSize;

type ComboboxItemUi = { class: string };

type SlotProps = (props: { item: ComboboxListItem; ui: ComboboxItemUi }) => unknown;

export type ComboboxItemSlots = {
	['item-leading']?: SlotProps;
	['item-label']?: (props: { item: ComboboxListItem }) => unknown;
	['item-trailing']?: SlotProps;
};

export type ComboboxSlots = {
	item?: (props: { item: ComboboxListItem }) => unknown;
	label?: (props: { item: ComboboxListItem }) => unknown;
	['item-leading']?: SlotProps;
	['item-label']?: (props: { item: ComboboxListItem }) => unknown;
	['item-trailing']?: SlotProps;
	header?: () => unknown;
	footer?: () => unknown;
};
