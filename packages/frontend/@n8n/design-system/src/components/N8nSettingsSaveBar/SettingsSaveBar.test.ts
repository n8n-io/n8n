import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { nextTick } from 'vue';

import N8nSettingsSaveBar, { type SettingsSaveBarProps } from './SettingsSaveBar.vue';

describe('N8nSettingsSaveBar', () => {
	it('matches snapshot', () => {
		const { html } = render(N8nSettingsSaveBar, {
			global: { stubs: ['N8nButton', 'N8nIcon', 'N8nText'] },
		});

		expect(html()).toMatchSnapshot();
	});

	it('renders the default status message and Save/Discard buttons when visible', () => {
		render(N8nSettingsSaveBar);

		expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
		expect(screen.getByText('Save settings')).toBeInTheDocument();
		expect(screen.getByText('Discard changes')).toBeInTheDocument();
	});

	it('renders custom message and labels', () => {
		render(N8nSettingsSaveBar, {
			props: { message: 'You have changes', saveLabel: 'Save', discardLabel: 'Reset' },
		});

		expect(screen.getByText('You have changes')).toBeInTheDocument();
		expect(screen.getByText('Save')).toBeInTheDocument();
		expect(screen.getByText('Reset')).toBeInTheDocument();
	});

	it('does not render anything while hidden', () => {
		render(N8nSettingsSaveBar, { props: { visible: false } });

		expect(screen.queryByTestId('settings-save-bar')).not.toBeInTheDocument();
	});

	it('emits save when the Save button is clicked', async () => {
		const { emitted } = render(N8nSettingsSaveBar);

		await fireEvent.click(screen.getByTestId('settings-save-bar-save'));

		expect(emitted().save).toHaveLength(1);
	});

	it('emits discard when the Discard button is clicked', async () => {
		const { emitted } = render(N8nSettingsSaveBar);

		await fireEvent.click(screen.getByTestId('settings-save-bar-discard'));

		expect(emitted().discard).toHaveLength(1);
	});

	it('puts the Save button in its loading state while saving', () => {
		render(N8nSettingsSaveBar, { props: { saving: true } });

		const save = screen.getByTestId('settings-save-bar-save');
		expect(save).toHaveAttribute('aria-busy', 'true');
		expect(save).toBeDisabled();
	});

	it('disables the Discard button while saving', () => {
		render(N8nSettingsSaveBar, { props: { saving: true } });

		expect(screen.getByTestId('settings-save-bar-discard')).toBeDisabled();
	});

	it('disables only the Save button when saveDisabled is set', () => {
		render(N8nSettingsSaveBar, { props: { saveDisabled: true } });

		expect(screen.getByTestId('settings-save-bar-save')).toBeDisabled();
		expect(screen.getByTestId('settings-save-bar-discard')).not.toBeDisabled();
	});

	it('exposes the message as the region accessible name', () => {
		render(N8nSettingsSaveBar, { props: { message: 'Unsaved changes' } });

		const region = screen.getByRole('region', { name: 'Unsaved changes' });
		expect(region).toHaveAttribute('aria-live', 'polite');
	});

	it('renders the primary Save action last so it sits on the far right', () => {
		render(N8nSettingsSaveBar);

		const discard = screen.getByTestId('settings-save-bar-discard');
		const save = screen.getByTestId('settings-save-bar-save');
		// DOM order matches visual order: Discard before Save (primary on the far right).
		expect(discard.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('applies the floating class when floating', () => {
		render(N8nSettingsSaveBar, { props: { floating: true } });

		expect(screen.getByTestId('settings-save-bar').className).toContain('floating');
	});

	it('saves on Cmd/Ctrl+S while visible and enabled', () => {
		const { emitted } = render(N8nSettingsSaveBar);

		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true }),
		);

		expect(emitted().save).toHaveLength(1);
	});

	it('ignores Cmd/Ctrl+S while saving', () => {
		const { emitted } = render(N8nSettingsSaveBar, { props: { saving: true } });

		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true }),
		);

		expect(emitted().save).toBeUndefined();
	});

	it('does not bind the save shortcut when saveShortcut is false', () => {
		const { emitted } = render(N8nSettingsSaveBar, { props: { saveShortcut: false } });

		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true }),
		);

		expect(emitted().save).toBeUndefined();
	});

	describe('docked chrome while floating', () => {
		// jsdom has no layout, so geometry is simulated: the bar and its parent report the
		// bottoms set here, and the paddings/margins measureStuck() subtracts are zeroed out.
		const bottoms = { bar: 0, parent: 0 };

		beforeEach(() => {
			vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
				this: Element,
			) {
				const isBar = this.getAttribute('data-test-id') === 'settings-save-bar';
				return { bottom: isBar ? bottoms.bar : bottoms.parent } as DOMRect;
			});
			vi.spyOn(window, 'getComputedStyle').mockReturnValue({
				paddingBottom: '0px',
				borderBottomWidth: '0px',
				marginBottom: '0px',
			} as CSSStyleDeclaration);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		async function renderBar(
			barBottom: number,
			parentBottom: number,
			props: SettingsSaveBarProps = { floating: true },
		) {
			bottoms.bar = barBottom;
			bottoms.parent = parentBottom;
			render(N8nSettingsSaveBar, { props });
			await nextTick();
			return screen.getByTestId('settings-save-bar');
		}

		it('sheds the overlay chrome when the bar rests at its natural flow position', async () => {
			const bar = await renderBar(600, 600);

			expect(bar.className).toContain('docked');
		});

		it('keeps the overlay chrome while the bar is stuck above its flow position', async () => {
			const bar = await renderBar(500, 600);

			expect(bar.className).not.toContain('docked');
		});

		it('docks and undocks as scrolling moves the bar to and from its flow position', async () => {
			const bar = await renderBar(500, 600);
			expect(bar.className).not.toContain('docked');

			bottoms.bar = 600;
			window.dispatchEvent(new Event('scroll'));
			await nextTick();
			expect(bar.className).toContain('docked');

			bottoms.bar = 500;
			window.dispatchEvent(new Event('scroll'));
			await nextTick();
			expect(bar.className).not.toContain('docked');
		});

		it('re-measures on window resize', async () => {
			const bar = await renderBar(600, 600);
			expect(bar.className).toContain('docked');

			bottoms.bar = 500;
			window.dispatchEvent(new Event('resize'));
			await nextTick();
			expect(bar.className).not.toContain('docked');
		});

		it('measures immediately when the bar appears above its flow position', async () => {
			bottoms.bar = 500;
			bottoms.parent = 600;

			const { rerender } = render(N8nSettingsSaveBar, {
				props: { visible: false, floating: true },
			});
			await rerender({ visible: true });

			await waitFor(() =>
				expect(screen.getByTestId('settings-save-bar').className).not.toContain('docked'),
			);
		});

		it('never applies the docked treatment while not floating', async () => {
			const bar = await renderBar(600, 600, {});

			expect(bar.className).not.toContain('docked');
			expect(bar.className).not.toContain('floating');
		});
	});

	it('renders custom status content through the default slot', () => {
		render(N8nSettingsSaveBar, {
			slots: { default: '<span data-test-id="custom-status">Draft saved locally</span>' },
		});

		expect(screen.getByTestId('custom-status')).toBeInTheDocument();
		expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
	});
});
