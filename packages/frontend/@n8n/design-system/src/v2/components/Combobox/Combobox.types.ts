import {
	ComboboxRootEmits,
	ComboboxRootProps,
	ComboboxItemProps,
	ComboboxContentProps,
} from 'reka-ui';
import type { IconName } from '../../../components/N8nIcon/icons';
import type { InputSize } from '../../../components/N8nInput/Input.types';

export type AcceptableValue = string | number | bigint | Record<string, unknown> | null;

export type ComboboxProps = ComboboxRootProps &
	ComboboxContentProps & {
		size: ComboboxSizes;
		icon?: IconName;
		placeholder?: string;
		autoFocus?: boolean;
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
