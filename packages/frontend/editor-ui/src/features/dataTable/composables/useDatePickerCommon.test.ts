import { nextTick } from 'vue';
import { describe, it, vi, beforeEach } from 'vitest';
import { type DatePickerCallbacks, useDatePickerCommon } from './useDatePickerCommon';

vi.mock('vue', async () => {
	const actual = await vi.importActual('vue');
	return {
		...actual,
		useTemplateRef: vi.fn((name: string) => ({
			value: name === 'pickerRef' ? { focus: vi.fn() } : { querySelector: vi.fn() },
		})),
		nextTick: vi.fn().mockResolvedValue(undefined),
	};
});

const setupWrapperRef = (wrapperRef: unknown, inputValue: string) => {
	const wrapperElement = document.createElement('div');
	const mockInput = document.createElement('input');
	mockInput.value = inputValue;
	wrapperElement.appendChild(mockInput);
	// @ts-expect-error - wrapperRef is unknown
	wrapperRef.value = wrapperElement;
	return mockInput;
};

const setupPickerRef = (pickerRef: unknown, throwError = false) => {
	const focus = vi.fn();
	if (!throwError) {
		const pickerElement = document.createElement('div');
		pickerElement.focus = focus;
		// @ts-expect-error - pickerRef is unknown
		pickerRef.value = pickerElement;
	}
	return focus;
};

describe('useDatePickerCommon', () => {
	let callbacks: DatePickerCallbacks;

	beforeEach(() => {
		callbacks = {
			onCommit: vi.fn(),
			onCancel: vi.fn(),
			onChange: vi.fn(),
		};
	});

	describe('getInnerInput', () => {
		it('should return input element from wrapper', () => {
			const { getInnerInput, wrapperRef } = useDatePickerCommon(callbacks);
			const mockInput = setupWrapperRef(wrapperRef, '2023-07-09 05:06');

			const result = getInnerInput();
			expect(result).toBe(mockInput);
		});
	});

	describe('commitIfParsedFromInput', () => {
		it('should commit valid date input', () => {
			const { commitIfParsedFromInput, dateValue } = useDatePickerCommon(callbacks);
			const mockInput = document.createElement('input');
			mockInput.value = '2023-07-09 05:06';

			const result = commitIfParsedFromInput(mockInput);

			expect(result).toBe(true);
			expect(dateValue.value).toBeInstanceOf(Date);
			expect(callbacks.onCommit).toHaveBeenCalledTimes(1);
		});

		it('should not commit invalid date input', () => {
			const { commitIfParsedFromInput, dateValue } = useDatePickerCommon(callbacks);
			const mockInput = document.createElement('input');
			mockInput.value = 'completely-invalid-date';

			const result = commitIfParsedFromInput(mockInput);

			expect(result).toBe(false);
			expect(dateValue.value).toBeNull();
			expect(callbacks.onCommit).not.toHaveBeenCalled();
		});
	});

	describe('onKeydown', () => {
		it('should handle Escape key', () => {
			const { onKeydown, dateValue, setDate } = useDatePickerCommon(callbacks);
			const initialDate = new Date('2023-01-01');
			setDate(initialDate);
			dateValue.value = new Date('2023-12-01');

			const mockEvent = {
				key: 'Escape',
				stopPropagation: vi.fn(),
			} as unknown as KeyboardEvent;

			onKeydown(mockEvent);

			expect(mockEvent.stopPropagation).toHaveBeenCalled();
			expect(dateValue.value).toEqual(initialDate);
			expect(callbacks.onCancel).toHaveBeenCalledTimes(1);
		});

		it('should handle Enter key with valid input', () => {
			const { onKeydown } = useDatePickerCommon(callbacks);
			const mockInput = document.createElement('input');
			mockInput.value = '2023-07-09 05:06';
			const mockEvent = {
				key: 'Enter',
				target: mockInput,
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
			} as unknown as KeyboardEvent;

			onKeydown(mockEvent);

			expect(mockEvent.preventDefault).toHaveBeenCalled();
			expect(mockEvent.stopPropagation).toHaveBeenCalled();
			expect(callbacks.onCommit).toHaveBeenCalledTimes(1);
		});

		it('should handle Enter key with invalid input', () => {
			const { onKeydown } = useDatePickerCommon(callbacks);
			const mockInput = document.createElement('input');
			mockInput.value = 'completely-invalid-date';
			const mockEvent = {
				key: 'Enter',
				target: mockInput,
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
			} as unknown as KeyboardEvent;

			onKeydown(mockEvent);

			expect(mockEvent.preventDefault).not.toHaveBeenCalled();
			expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
			expect(callbacks.onCommit).not.toHaveBeenCalled();
		});
	});

	describe('onClear', () => {
		it('should clear date and call onCommit', () => {
			const { onClear, dateValue, setDate } = useDatePickerCommon(callbacks);
			setDate(new Date('2023-12-01'));

			onClear();

			expect(dateValue.value).toBeNull();
			expect(callbacks.onCommit).toHaveBeenCalledTimes(1);
		});
	});

	describe('onDateChange', () => {
		it('should call onChange callback', () => {
			const { onDateChange } = useDatePickerCommon(callbacks);

			onDateChange();

			expect(callbacks.onChange).toHaveBeenCalledTimes(1);
		});
	});

	describe('focusPicker', () => {
		it('should focus picker after nextTick', async () => {
			const { focusPicker, pickerRef } = useDatePickerCommon(callbacks);
			const mockFocus = setupPickerRef(pickerRef);

			await focusPicker();

			expect(nextTick).toHaveBeenCalled();
			expect(mockFocus).toHaveBeenCalled();
		});

		it('should handle focus error gracefully', async () => {
			const { focusPicker, pickerRef } = useDatePickerCommon(callbacks);
			setupPickerRef(pickerRef, true);

			await expect(focusPicker()).resolves.not.toThrow();
		});
	});

	describe('getDate', () => {
		it('should prefer parsed input over v-model value', () => {
			const { getDate, wrapperRef, setDate } = useDatePickerCommon(callbacks);
			setupWrapperRef(wrapperRef, '2023-12-01 00:00');
			setDate(new Date('2023-01-01'));

			const result = getDate();

			expect(result).toBeInstanceOf(Date);
			expect(result?.toISOString()).toBe('2023-12-01T00:00:00.000Z');
		});

		it('should fallback to v-model value when input is invalid', () => {
			const { getDate, wrapperRef, setDate } = useDatePickerCommon(callbacks);
			setupWrapperRef(wrapperRef, 'completely-invalid-date');
			const fallbackDate = new Date('2023-01-01');
			setDate(fallbackDate);

			const result = getDate();

			expect(result).toEqual(fallbackDate);
		});
	});

	describe('initializeValue', () => {
		it('should initialize with Date object', () => {
			const { initializeValue, dateValue, initialValue } = useDatePickerCommon(callbacks);
			const testDate = new Date('2023-12-01');

			initializeValue(testDate);

			expect(dateValue.value).toBe(testDate);
			expect(initialValue.value).toBe(testDate);
		});

		it('should initialize with null', () => {
			const { initializeValue, dateValue, initialValue } = useDatePickerCommon(callbacks);

			initializeValue(null);

			expect(dateValue.value).toBeNull();
			expect(initialValue.value).toBeNull();
		});

		it('should initialize with undefined', () => {
			const { initializeValue, dateValue, initialValue } = useDatePickerCommon(callbacks);

			initializeValue(undefined);

			expect(dateValue.value).toBeNull();
			expect(initialValue.value).toBeNull();
		});
	});
});
