import { ref, nextTick, useTemplateRef } from 'vue';
import { parseLooseDateInput } from '@/features/dataTable/utils/typeUtils';
import { isFocusableEl } from '@/utils/typesUtils';

export interface DatePickerCallbacks {
	onCommit?: () => void;
	onCancel?: () => void;
	onChange?: () => void;
}

export const useDatePickerCommon = (callbacks: DatePickerCallbacks = {}) => {
	const pickerRef = useTemplateRef('pickerRef');
	const wrapperRef = useTemplateRef('wrapperRef');
	const dateValue = ref<Date | null>(null);
	const initialValue = ref<Date | null>(null);

	const getInnerInput = (): HTMLInputElement | null => {
		if (!(wrapperRef.value instanceof HTMLElement)) return null;
		return wrapperRef.value.querySelector('input') ?? null;
	};

	const commitIfParsedFromInput = (target?: EventTarget | null): boolean => {
		const input = target instanceof HTMLInputElement ? target : null;
		const value = input?.value ?? '';
		const parsed = parseLooseDateInput(value);

		if (parsed) {
			dateValue.value = parsed;
			callbacks.onCommit?.();
			return true;
		}
		return false;
	};

	const onKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			e.stopPropagation();
			dateValue.value = initialValue.value;
			callbacks.onCancel?.();
			return;
		}
		if (e.key === 'Enter') {
			const committed = commitIfParsedFromInput(e.target);
			if (committed) {
				e.preventDefault();
				e.stopPropagation();
			}
		}
	};

	const onClear = () => {
		dateValue.value = null;
		callbacks.onCommit?.();
	};

	const onDateChange = () => {
		callbacks.onChange?.();
	};

	const focusPicker = async () => {
		await nextTick();
		if (isFocusableEl(pickerRef.value)) {
			pickerRef.value.focus();
		}
	};

	const getDate = (): Date | null => {
		// Prefer what's typed in the input
		// Element plus will not update the v-model if the input is invalid (loose)
		const input = getInnerInput();
		const typed = input?.value ?? '';
		const parsed = parseLooseDateInput(typed);
		if (parsed) return parsed;

		// Fallback to the v-model value
		return dateValue.value;
	};

	const setDate = (date: Date | null) => {
		dateValue.value = date;
		initialValue.value = date;
	};

	const initializeValue = (value: unknown) => {
		if (value === null || value === undefined) {
			dateValue.value = null;
		} else if (value instanceof Date) {
			dateValue.value = value;
		}
		initialValue.value = dateValue.value;
	};

	return {
		pickerRef,
		wrapperRef,
		dateValue,
		initialValue,
		getInnerInput,
		commitIfParsedFromInput,
		onKeydown,
		onClear,
		onDateChange,
		focusPicker,
		getDate,
		setDate,
		initializeValue,
	};
};
