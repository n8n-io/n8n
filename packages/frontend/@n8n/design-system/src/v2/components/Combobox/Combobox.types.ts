import type { IconName } from '../../../components/N8nIcon/icons';
import type { InputSize } from '../../../components/N8nInput/Input.types';
import type {
	AcceptableValue,
	ComboboxItemProps,
	ComboboxRootEmits,
	ComboboxRootProps,
} from './reka-ui';

export type ComboboxProps<T extends AcceptableValue = AcceptableValue> = ComboboxRootProps<T>;

export type ComboboxEmits<T extends AcceptableValue = AcceptableValue> = ComboboxRootEmits<T>;

export type ComboboxListItem = Partial<ComboboxItemProps> & {
	label?: string;
	type?: 'label' | 'separator' | 'item';
	icon?: IconName;
	size?: ComboboxSizes;
	onSelect?: (event: Event) => void;
	class?: string | Record<string, boolean> | Array<string | Record<string, boolean>>;
};

export type ComboboxItem = AcceptableValue | ComboboxListItem;

export type ComboboxVariants = 'default' | 'ghost';
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
