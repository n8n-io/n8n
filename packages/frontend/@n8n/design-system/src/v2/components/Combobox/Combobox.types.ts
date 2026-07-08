import type { IconName } from '../../../components/N8nIcon/icons';
import type { InputSize } from '../../../components/N8nInput/Input.types';
import type {
	ComboboxContentProps,
	ComboboxItemProps,
	ComboboxRootEmits,
	ComboboxRootProps,
} from '../../utils/reka-ui';

export type AcceptableValue = string | number | bigint | Record<string, unknown> | null | undefined;

export type ComboboxProps = Omit<ComboboxRootProps<AcceptableValue>, 'dir'> &
	Pick<ComboboxContentProps, 'side' | 'sideOffset' | 'align'> & {
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
		clearable?: boolean;
	};

export type ComboboxEmits = ComboboxRootEmits<AcceptableValue | AcceptableValue[]>;

export type ComboboxListItem = ComboboxItemProps & {
	label?: string;
	type?: 'label' | 'separator' | 'item';
	icon?: IconName;
	size?: ComboboxSizes;
};

export type ComboboxItem = Exclude<AcceptableValue, undefined> | ComboboxListItem;

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
