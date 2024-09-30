import { renderComponent } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { useKeybindings } from '../useKeybindings';

const renderTestComponent = async (...args: Parameters<typeof useKeybindings>) => {
	return renderComponent(
		defineComponent({
			setup() {
				useKeybindings(...args);
				return () => h('div', [h('input')]);
			},
		}),
	);
};

describe('useKeybindings', () => {
	it('should trigger case-insensitive keyboard shortcuts', async () => {
		const saveSpy = vi.fn();
		const saveAllSpy = vi.fn();
		await renderTestComponent({ Ctrl_s: saveSpy, ctrl_Shift_S: saveAllSpy });
		await userEvent.keyboard('{Control>}s');
		expect(saveSpy).toHaveBeenCalled();
		expect(saveAllSpy).not.toHaveBeenCalled();

		await userEvent.keyboard('{Control>}{Shift>}s');
		expect(saveAllSpy).toHaveBeenCalled();
	});

	it('should not trigger shortcuts when an input element has focus', async () => {
		const saveSpy = vi.fn();
		const saveAllSpy = vi.fn();
		const { getByRole } = await renderTestComponent({ Ctrl_s: saveSpy, ctrl_Shift_S: saveAllSpy });

		getByRole('textbox').focus();

		await userEvent.keyboard('{Control>}s');
		await userEvent.keyboard('{Control>}{Shift>}s');

		expect(saveSpy).not.toHaveBeenCalled();
		expect(saveAllSpy).not.toHaveBeenCalled();
	});
});
