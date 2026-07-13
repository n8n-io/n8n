import type {
	AcceptableInputValue,
	TagsInputInputProps,
	TagsInputRootEmits,
	TagsInputRootProps,
} from './reka-ui';
import type { InputSize } from '../../../components/N8nInput/Input.types';

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
	input?: (props: {
		id?: string;
		placeholder: string;
		autoFocus?: boolean;
		disabled?: boolean;
		class: string;
	}) => unknown;
	tag?: (props: {
		value: TagsInputValue;
		displayValue: string;
		index: number;
		disabled: boolean;
		ui: TagsInputTagUi;
	}) => unknown;
};
