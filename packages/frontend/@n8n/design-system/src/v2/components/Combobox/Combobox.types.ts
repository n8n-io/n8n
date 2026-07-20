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
		openOnFocus?: boolean;
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
		teleported?: boolean;
		portalTarget?: string | HTMLElement;
	};

export type ComboboxEmits = ComboboxRootEmits<AcceptableValue | AcceptableValue[] | undefined>;

export type ComboboxListItem = ComboboxItemProps & {
	label?: string;
	type?: 'label' | 'separator' | 'item';
	icon?: IconName;
};

export type ComboboxItem = AcceptableValue | ComboboxListItem;

export type ComboboxSizes = InputSize;

type ComboboxItemUi = { class: string };

type SlotProps = (props: { item: ComboboxListItem; ui: ComboboxItemUi }) => unknown;

export type ComboboxItemSlots = {
	'item-leading'?: SlotProps;
	'item-label'?: (props: { item: ComboboxListItem }) => unknown;
	'item-trailing'?: SlotProps;
	'item-indicator'?: (props: { ui: ComboboxItemUi }) => unknown;
};

export type ComboboxSlots = {
	item: (props: { item: ComboboxListItem }) => unknown;
	label: (props: { item: ComboboxListItem }) => unknown;
	['item-leading']: SlotProps;
	['item-label']: (props: { item: ComboboxListItem }) => unknown;
	['item-trailing']: SlotProps;
	header?: () => unknown;
	footer?: () => unknown;
};
