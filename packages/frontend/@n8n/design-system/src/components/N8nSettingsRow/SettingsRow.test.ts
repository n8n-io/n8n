import { fireEvent, render, screen } from '@testing-library/vue';
import { nextTick } from 'vue';

import N8nSettingsRow from './SettingsRow.vue';

describe('N8nSettingsRow', () => {
	it('renders title and description', () => {
		render(N8nSettingsRow, {
			props: { title: 'My setting', description: 'What it does' },
		});

		expect(screen.getByText('My setting')).toBeInTheDocument();
		expect(screen.getByText('What it does')).toBeInTheDocument();
	});

	it('defaults to the horizontal layout', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title' },
		});

		const row = container.querySelector('[data-layout]');
		expect(row?.getAttribute('data-layout')).toBe('horizontal');
	});

	it.each(['horizontal', 'vertical', 'custom'] as const)('renders the %s layout', (layout) => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', layout },
			slots: { default: '<div data-test-id="custom-content">content</div>' },
		});

		expect(container.querySelector(`[data-layout="${layout}"]`)).toBeInTheDocument();
	});

	it('renders the full-width default slot only in the custom layout', () => {
		render(N8nSettingsRow, {
			props: { layout: 'custom' },
			slots: { default: '<div data-test-id="custom-content">content</div>' },
		});

		expect(screen.getByTestId('custom-content')).toBeInTheDocument();
	});

	it('caps the action width at 50% by default in the horizontal layout', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title' },
			slots: { action: '<button>Do</button>' },
		});

		const action = container.querySelector('[class*="action"]') as HTMLElement;
		expect(action.style.maxWidth).toBe('50%');
	});

	it('allows overriding the action max-width', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', actionMaxWidth: '12rem' },
			slots: { action: '<button>Do</button>' },
		});

		const action = container.querySelector('[class*="action"]') as HTMLElement;
		expect(action.style.maxWidth).toBe('12rem');
	});

	it('removes the action max-width cap when actionMaxWidth is false', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', actionMaxWidth: false },
			slots: { action: '<button>Do</button>' },
		});

		const action = container.querySelector('[class*="action"]') as HTMLElement;
		expect(action.style.maxWidth).toBe('');
	});

	it('does not apply the action max-width in the vertical layout', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', layout: 'vertical' },
			slots: { action: '<button>Do</button>' },
		});

		const action = container.querySelector('[class*="action"]') as HTMLElement;
		expect(action.style.maxWidth).toBe('');
	});

	it('lets the action fill its width in the horizontal layout when actionFill is set', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', actionFill: true },
			slots: { action: '<button>Do</button>' },
		});

		const action = container.querySelector('[class*="action"]') as HTMLElement;
		expect(action.className).toContain('actionFill');
	});

	it('hugs the action (no fill) by default', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title' },
			slots: { action: '<button>Do</button>' },
		});

		const action = container.querySelector('[class*="action"]') as HTMLElement;
		expect(action.className).not.toContain('actionFill');
	});

	it('does not apply actionFill outside the horizontal layout', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', layout: 'vertical', actionFill: true },
			slots: { action: '<button>Do</button>' },
		});

		const action = container.querySelector('[class*="action"]') as HTMLElement;
		expect(action.className).not.toContain('actionFill');
	});

	it('shows the visual slot when provided', () => {
		render(N8nSettingsRow, {
			props: { title: 'Title' },
			slots: { visual: '<span data-test-id="device-icon">icon</span>' },
		});

		expect(screen.getByTestId('settings-row-visual')).toBeInTheDocument();
		expect(screen.getByTestId('device-icon')).toBeInTheDocument();
	});

	it('hides the visual slot by default', () => {
		render(N8nSettingsRow, { props: { title: 'Title' } });

		expect(screen.queryByTestId('settings-row-visual')).not.toBeInTheDocument();
	});

	it('renders the divider by default', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title' },
		});

		expect(container.querySelector('[data-test-id="settings-row-divider"]')).toBeInTheDocument();
	});

	it('does not render the divider when show-divider is false', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', showDivider: false },
		});

		expect(
			container.querySelector('[data-test-id="settings-row-divider"]'),
		).not.toBeInTheDocument();
	});

	it('clamps the description to a maximum of 3 lines', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', description: 'Long text', maxDescriptionLines: 8 },
		});

		const description = container.querySelector('[class*="description"]') as HTMLElement;
		expect(description.style.getPropertyValue('--settings-row--description-lines')).toBe('3');
	});

	it('uses the configured description line count below the clamp', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', description: 'Long text', maxDescriptionLines: 2 },
		});

		const description = container.querySelector('[class*="description"]') as HTMLElement;
		expect(description.style.getPropertyValue('--settings-row--description-lines')).toBe('2');
	});

	it('renders custom info slot content over the title/description', () => {
		render(N8nSettingsRow, {
			props: { title: 'Default title' },
			slots: { info: '<div data-test-id="custom-info">custom</div>' },
		});

		expect(screen.getByTestId('custom-info')).toBeInTheDocument();
		expect(screen.queryByText('Default title')).not.toBeInTheDocument();
	});

	it('applies the hoverable class when hoverable is set', () => {
		const { container } = render(N8nSettingsRow, {
			props: { title: 'Title', hoverable: true },
		});

		const row = container.querySelector('[data-layout]') as HTMLElement;
		expect(row.className).toContain('hoverable');
	});

	it('does not apply the hoverable class by default', () => {
		const { container } = render(N8nSettingsRow, { props: { title: 'Title' } });

		const row = container.querySelector('[data-layout]') as HTMLElement;
		expect(row.className).not.toContain('hoverable');
	});

	describe('clickable', () => {
		it('exposes button semantics and an accessible name from the title', () => {
			render(N8nSettingsRow, { props: { title: 'Passkey', clickable: true } });

			const row = screen.getByRole('button', { name: 'Passkey' });
			expect(row).toHaveAttribute('tabindex', '0');
		});

		it('emits click when the row is clicked', async () => {
			const { container, emitted } = render(N8nSettingsRow, {
				props: { title: 'Passkey', clickable: true },
			});

			await fireEvent.click(container.querySelector('[data-layout]') as HTMLElement);

			expect(emitted().click).toHaveLength(1);
		});

		it.each(['Enter', ' '])('activates with the %s key', async (key) => {
			const { container, emitted } = render(N8nSettingsRow, {
				props: { title: 'Passkey', clickable: true },
			});

			await fireEvent.keyDown(container.querySelector('[data-layout]') as HTMLElement, { key });

			expect(emitted().click).toHaveLength(1);
		});

		it('does not emit click when a keydown originates from a nested control', async () => {
			const { emitted } = render(N8nSettingsRow, {
				props: { title: 'Passkey', clickable: true },
				slots: { action: '<button data-test-id="nested-control">Manage</button>' },
			});

			await fireEvent.keyDown(screen.getByTestId('nested-control'), { key: 'Enter' });
			await fireEvent.keyDown(screen.getByTestId('nested-control'), { key: ' ' });

			expect(emitted().click).toBeUndefined();
		});

		it('does not emit click when a click originates from a nested control', async () => {
			const { emitted } = render(N8nSettingsRow, {
				props: { title: 'Passkey', clickable: true },
				slots: { action: '<button data-test-id="nested-control">Manage</button>' },
			});

			await fireEvent.click(screen.getByTestId('nested-control'));

			expect(emitted().click).toBeUndefined();
		});

		it('still emits click for clicks on non-interactive row content', async () => {
			const { emitted } = render(N8nSettingsRow, {
				props: { title: 'Passkey', description: 'Sign in with your device.', clickable: true },
			});

			await fireEvent.click(screen.getByText('Passkey'));

			expect(emitted().click).toHaveLength(1);
		});

		it('does not emit click for non-activation keys', async () => {
			const { container, emitted } = render(N8nSettingsRow, {
				props: { title: 'Passkey', clickable: true },
			});

			await fireEvent.keyDown(container.querySelector('[data-layout]') as HTMLElement, {
				key: 'Tab',
			});

			expect(emitted().click).toBeUndefined();
		});

		it('does not emit click or expose button semantics when not clickable', async () => {
			const { container, emitted } = render(N8nSettingsRow, { props: { title: 'Passkey' } });

			const row = container.querySelector('[data-layout]') as HTMLElement;
			expect(row).not.toHaveAttribute('role', 'button');
			await fireEvent.click(row);

			expect(emitted().click).toBeUndefined();
		});
	});

	describe('expandable', () => {
		it('does not render the expand region unless expandable', () => {
			render(N8nSettingsRow, {
				props: { title: 'Title' },
				slots: { expanded: '<div data-test-id="expanded-content">details</div>' },
			});

			expect(screen.queryByRole('region')).not.toBeInTheDocument();
			expect(screen.queryByTestId('expanded-content')).not.toBeInTheDocument();
		});

		it('renders the expand region when expandable, mounting slot content on first expand', async () => {
			const { rerender } = render(N8nSettingsRow, {
				props: { title: 'Title', expandable: true },
				slots: { expanded: '<div data-test-id="expanded-content">details</div>' },
			});

			// Collapsed rows keep their (potentially heavy) expanded content unmounted until opened.
			expect(screen.getByRole('region')).toBeInTheDocument();
			expect(screen.queryByTestId('expanded-content')).not.toBeInTheDocument();

			await rerender({ modelValue: true });
			expect(screen.getByTestId('expanded-content')).toBeInTheDocument();

			// Stays mounted after collapse so the closing animation has content to clip.
			await rerender({ modelValue: false });
			expect(screen.getByTestId('expanded-content')).toBeInTheDocument();
		});

		it('renders the built-in chevron trigger wired to the region by default', () => {
			render(N8nSettingsRow, {
				props: { title: 'Title', expandable: true },
			});

			const trigger = screen.getByRole('button', { name: 'Toggle Title' });
			const region = screen.getByRole('region');
			expect(trigger).toHaveAttribute('aria-controls', region.id);
		});

		it('reflects the collapsed state via aria-expanded and data-expanded', () => {
			render(N8nSettingsRow, {
				props: { title: 'Title', expandable: true, modelValue: false },
			});

			expect(screen.getByRole('button', { name: 'Toggle Title' })).toHaveAttribute(
				'aria-expanded',
				'false',
			);
			expect(screen.getByRole('region')).toHaveAttribute('data-expanded', 'false');
		});

		it('reflects the expanded state via aria-expanded and data-expanded', () => {
			render(N8nSettingsRow, {
				props: { title: 'Title', expandable: true, modelValue: true },
			});

			expect(screen.getByRole('button', { name: 'Toggle Title' })).toHaveAttribute(
				'aria-expanded',
				'true',
			);
			expect(screen.getByRole('region')).toHaveAttribute('data-expanded', 'true');
		});

		it('emits update:modelValue when the chevron trigger is clicked', async () => {
			const { emitted } = render(N8nSettingsRow, {
				props: { title: 'Title', expandable: true, modelValue: false },
			});

			await fireEvent.click(screen.getByRole('button', { name: 'Toggle Title' }));

			expect(emitted()['update:modelValue']).toEqual([[true]]);
		});

		it('works uncontrolled: the chevron toggles its own state', async () => {
			render(N8nSettingsRow, {
				props: { title: 'Title', expandable: true },
			});

			const trigger = screen.getByRole('button', { name: 'Toggle Title' });
			expect(trigger).toHaveAttribute('aria-expanded', 'false');

			await fireEvent.click(trigger);

			expect(trigger).toHaveAttribute('aria-expanded', 'true');
			expect(screen.getByRole('region')).toHaveAttribute('data-expanded', 'true');
		});

		it('hides the built-in chevron when disclosure is false', () => {
			render(N8nSettingsRow, {
				props: { title: 'Title', expandable: true, disclosure: false },
			});

			expect(screen.queryByRole('button', { name: 'Toggle Title' })).not.toBeInTheDocument();
			expect(screen.getByRole('region')).toBeInTheDocument();
		});

		it('does not toggle the chevron click into a clickable row', async () => {
			const { emitted } = render(N8nSettingsRow, {
				props: { title: 'Title', expandable: true, clickable: true },
			});

			await fireEvent.click(screen.getByRole('button', { name: 'Toggle Title' }));

			expect(emitted().click).toBeUndefined();
		});

		it('shows the default "View more" label while collapsed', () => {
			render(N8nSettingsRow, {
				props: { title: 'Title', expandable: true, modelValue: false },
			});

			const trigger = screen.getByRole('button', { name: 'Toggle Title' });
			expect(trigger).toHaveTextContent('View more');
			expect(trigger).not.toHaveTextContent('Show less');
		});

		it('shows the default "Show less" label while expanded', () => {
			render(N8nSettingsRow, {
				props: { title: 'Title', expandable: true, modelValue: true },
			});

			const trigger = screen.getByRole('button', { name: 'Toggle Title' });
			expect(trigger).toHaveTextContent('Show less');
			expect(trigger).not.toHaveTextContent('View more');
		});

		it('toggles the label text when the trigger is clicked (uncontrolled)', async () => {
			render(N8nSettingsRow, {
				props: { title: 'Title', expandable: true },
			});

			const trigger = screen.getByRole('button', { name: 'Toggle Title' });
			expect(trigger).toHaveTextContent('View more');

			await fireEvent.click(trigger);

			expect(trigger).toHaveTextContent('Show less');
		});

		it('honours custom expand/collapse labels', async () => {
			render(N8nSettingsRow, {
				props: {
					title: 'Title',
					expandable: true,
					expandLabel: 'Show details',
					collapseLabel: 'Hide details',
				},
			});

			const trigger = screen.getByRole('button', { name: 'Toggle Title' });
			expect(trigger).toHaveTextContent('Show details');

			await fireEvent.click(trigger);

			expect(trigger).toHaveTextContent('Hide details');
		});

		it('keeps the aria-label independent of the visible label', () => {
			render(N8nSettingsRow, {
				props: { title: 'Title', expandable: true, expandLabel: 'Show details' },
			});

			expect(screen.getByRole('button', { name: 'Toggle Title' })).toHaveTextContent(
				'Show details',
			);
		});
	});

	describe('revealActionsOnHover', () => {
		it('marks the action region as reveal-on-hover', () => {
			const { container } = render(N8nSettingsRow, {
				props: { title: 'Title', revealActionsOnHover: true },
				slots: { action: '<button>Log out</button>' },
			});

			const action = container.querySelector('[class*="action"]') as HTMLElement;
			expect(action.className).toContain('revealActions');
		});

		it('does not bubble a revealed action click to a clickable row', async () => {
			const { emitted } = render(N8nSettingsRow, {
				props: { title: 'Title', clickable: true, revealActionsOnHover: true },
				slots: { action: '<button data-test-id="reveal-action">Log out</button>' },
			});

			await fireEvent.click(screen.getByTestId('reveal-action'));

			expect(emitted().click).toBeUndefined();
		});
	});

	describe('description truncation tooltip', () => {
		// Stub N8nTooltip so we can deterministically assert whether it is enabled (truncated) or
		// disabled (fits), without depending on the floating-tooltip internals.
		const TooltipStub = {
			name: 'N8nTooltip',
			props: ['content', 'disabled', 'placement'],
			template:
				'<div data-test-id="description-tooltip" :data-disabled="String(disabled)" :data-content="content"><slot /></div>',
		};

		const originalScrollHeight = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			'scrollHeight',
		);
		const originalClientHeight = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			'clientHeight',
		);

		// jsdom reports 0 for layout metrics, so fake them to model a clamped (overflowing) vs a
		// fitting description.
		const mockGeometry = (scrollHeight: number, clientHeight: number) => {
			Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
				configurable: true,
				get: () => scrollHeight,
			});
			Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
				configurable: true,
				get: () => clientHeight,
			});
		};

		const renderWithTooltip = async (props: Record<string, unknown>) => {
			const utils = render(N8nSettingsRow, {
				props,
				global: { stubs: { N8nTooltip: TooltipStub } },
			});
			// Let the post-flush truncation watcher run against the now-mounted element.
			await nextTick();
			await nextTick();
			return utils;
		};

		afterEach(() => {
			const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
			if (originalScrollHeight) {
				Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
			} else {
				delete proto.scrollHeight;
			}
			if (originalClientHeight) {
				Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
			} else {
				delete proto.clientHeight;
			}
		});

		it('enables the tooltip with the full description when it is truncated', async () => {
			mockGeometry(80, 32);

			await renderWithTooltip({
				title: 'Title',
				description: 'A very long description that overflows the clamp.',
			});

			const tooltip = screen.getByTestId('description-tooltip');
			expect(tooltip.getAttribute('data-disabled')).toBe('false');
			expect(tooltip.getAttribute('data-content')).toBe(
				'A very long description that overflows the clamp.',
			);
		});

		it('disables the tooltip when the description fits within the clamp', async () => {
			mockGeometry(32, 32);

			await renderWithTooltip({ title: 'Title', description: 'Short description.' });

			expect(screen.getByTestId('description-tooltip').getAttribute('data-disabled')).toBe('true');
		});

		it('keeps the full description in the DOM even when it is visually truncated', async () => {
			mockGeometry(80, 32);
			const description = 'Full description text that is only clamped visually.';

			await renderWithTooltip({ title: 'Title', description });

			expect(screen.getByText(description)).toBeInTheDocument();
		});
	});
});
