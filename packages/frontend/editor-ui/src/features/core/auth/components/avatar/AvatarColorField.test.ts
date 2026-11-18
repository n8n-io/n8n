import userEvent from '@testing-library/user-event';
import { fireEvent, screen } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import AvatarColorField from './AvatarColorField.vue';

const renderField = createComponentRenderer(AvatarColorField, {
	props: {
		hue: 180,
		tone: 50,
		swatch: '#00aaaa',
		label: 'Color',
		valueText: 'Hue 180 degrees, tone 50 percent',
	},
});

describe('AvatarColorField', () => {
	beforeEach(() => {
		// jsdom has neither layout nor pointer capture.
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			right: 200,
			bottom: 100,
			width: 200,
			height: 100,
			toJSON: () => ({}),
		});
		HTMLElement.prototype.setPointerCapture = vi.fn();
		HTMLElement.prototype.releasePointerCapture = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('places the handle by hue and tone and describes it as a slider', () => {
		renderField();

		const handle = screen.getByRole('slider', { name: 'Color' });
		expect(handle).toHaveAttribute('aria-valuenow', '180');
		expect(handle).toHaveAttribute('aria-valuetext', 'Hue 180 degrees, tone 50 percent');
		expect(handle.style.getPropertyValue('--color-field--x')).toBe('0.5');
		expect(handle.style.getPropertyValue('--color-field--y')).toBe('0.5');
		expect(handle.style.backgroundColor).toBe('rgb(0, 170, 170)');
	});

	it('picks the spot under the pointer and keeps picking while dragging', async () => {
		const { emitted } = renderField();
		const field = screen.getByTestId('avatar-color-field');

		// The range is inset 18px from each edge: 164px wide and 64px tall here.
		await fireEvent.pointerDown(field, { clientX: 59, clientY: 34, button: 0 });
		await fireEvent.pointerMove(field, { clientX: 141, clientY: 100 });
		await fireEvent.pointerUp(field);
		await fireEvent.pointerMove(field, { clientX: 0, clientY: 0 });

		expect(emitted().change).toEqual([[{ hue: 90, tone: 75 }], [{ hue: 270, tone: 0 }]]);
	});

	it('keeps the handle inside the field at the ends of the range', async () => {
		const { emitted } = renderField();
		const field = screen.getByTestId('avatar-color-field');

		await fireEvent.pointerDown(field, { clientX: 0, clientY: 0, button: 0 });
		await fireEvent.pointerMove(field, { clientX: 18, clientY: 18 });
		await fireEvent.pointerMove(field, { clientX: 200, clientY: 100 });

		expect(emitted().change).toEqual([
			[{ hue: 0, tone: 100 }],
			[{ hue: 0, tone: 100 }],
			[{ hue: 360, tone: 0 }],
		]);
		expect(field.style.getPropertyValue('--color-field--inset')).toBe('18px');
	});

	it('moves with the arrow keys, further with shift, and clamps at the edges', async () => {
		const { emitted } = renderField({ props: { hue: 356, tone: 98 } });
		const handle = screen.getByRole('slider');
		handle.focus();

		await userEvent.keyboard('{ArrowRight}');
		await userEvent.keyboard('{ArrowUp}');
		await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
		await userEvent.keyboard('{ArrowDown}');
		await userEvent.keyboard('{Home}');

		expect(emitted().change).toEqual([
			[{ hue: 360, tone: 98 }],
			[{ hue: 356, tone: 100 }],
			[{ hue: 332, tone: 98 }],
			[{ hue: 356, tone: 93 }],
			[{ hue: 0, tone: 98 }],
		]);
	});

	it('ignores input while disabled', async () => {
		const { emitted } = renderField({ props: { disabled: true } });

		await fireEvent.pointerDown(screen.getByTestId('avatar-color-field'), {
			clientX: 10,
			clientY: 10,
			button: 0,
		});
		await fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

		expect(emitted().change).toBeUndefined();
	});
});
