import type { InputSize } from '../../../components/N8nInput/Input.types';
import type {
	AcceptableInputValue,
	TagsInputInputProps,
	TagsInputRootEmits,
	TagsInputRootProps,
} from './reka-ui';

export type TagsInputValue = AcceptableInputValue;

export type TagsInputSizes = InputSize;

export type TagsInputProps = TagsInputRootProps<TagsInputValue> &
	Pick<TagsInputInputProps, 'placeholder' | 'autoFocus'> & {
		size?: TagsInputSizes;
	};

export type TagsInputEmits = TagsInputRootEmits<TagsInputValue>;

export type TagsInputTagUi = {
	text: string;
	delete: string;
};

export type TagsInputSlots = {
	/** Replace the default text input. Apply `class` to keep TagsInput field styles. */
	input?: (props: {
		id?: string;
		placeholder: string;
		autoFocus?: boolean;
		disabled?: boolean;
		class: string;
	}) => unknown;
	/** Replace tag content inside the item chrome. Prefer `TagsInputItemText` / `TagsInputItemDelete` for a11y. */
	tag?: (props: {
		value: TagsInputValue;
		displayValue: string;
		index: number;
		disabled: boolean;
		ui: TagsInputTagUi;
	}) => unknown;
};
