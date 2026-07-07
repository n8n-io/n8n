import type { IconName } from '../../../components/N8nIcon/icons';
import type { InputSize } from '../../../components/N8nInput/Input.types';
import type {
	ComboboxContentProps,
	ComboboxItemProps,
	ComboboxRootEmits,
	ComboboxRootProps,
} from '../../utils/reka-ui';

export type AcceptableValue = string | number | bigint | Record<string, unknown> | null;

export type ComboboxProps = Omit<ComboboxRootProps, 'dir'> &
	Pick<ComboboxContentProps, 'side' | 'sideOffset'> & {
		size?: ComboboxSizes;
		icon?: IconName;
		placeholder?: string;
		autoFocus?: boolean;
		emptyText?: string;
		valueKey?: string;
		labelKey?: string;
		items?: ComboboxItem[];
		contentClass?: string;
		id?: string;
	};

export type ComboboxEmits = ComboboxRootEmits;

export type ComboboxListItem = ComboboxItemProps & {
	label?: string;
	type?: 'label' | 'separator' | 'item';
	icon?: IconName;
	size?: ComboboxSizes;
};

export type ComboboxItem = AcceptableValue | ComboboxListItem;

export type ComboboxSizes = InputSize;

type SlotProps = (props: { item: ComboboxListItem; ui: Record<string, unknown> }) => unknown;

export type ComboboxSlots = {
	default(props: { modelValue?: AcceptableValue | AcceptableValue[]; open: boolean }): unknown;
	item: (props: { item: ComboboxListItem }) => unknown;
	label: (props: { item: ComboboxListItem }) => unknown;
	['item-leading']: SlotProps;
	['item-label']: (props: { item: ComboboxListItem }) => unknown;
	['item-trailing']: SlotProps;
	header?: () => unknown;
	footer?: () => unknown;
};
