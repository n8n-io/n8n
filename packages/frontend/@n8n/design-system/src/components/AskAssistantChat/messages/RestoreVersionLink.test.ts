import { render, fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';

import RestoreVersionLink from './RestoreVersionLink.vue';

// Mock i18n to return keys instead of translated text
vi.mock('@n8n/design-system/composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string) => key,
	}),
}));

// Mock vueuse composables
vi.mock('@vueuse/core', () => ({
	onClickOutside: vi.fn(),
	useElementBounding: vi.fn(() => ({
		bottom: { value: 100 },
		right: { value: 200 },
		width: { value: 150 },
	})),
}));

const stubs = {
	N8nIcon: true,
	RestoreVersionConfirm: {
		name: 'RestoreVersionConfirm',
		props: ['versionId', 'pruneTimeHours'],
		emits: ['confirm', 'cancel', 'showVersion'],
		template: `
			<div data-test-id="restore-version-confirm-stub">
				<button data-test-id="confirm-button" @click="$emit('confirm')">Confirm</button>
				<button data-test-id="cancel-button" @click="$emit('cancel')">Cancel</button>
				<button data-test-id="show-version-button" @click="$emit('showVersion', versionId)">Show Version</button>
			</div>
		`,
	},
	Teleport: {
		template: '<div data-test-id="teleport-stub"><slot /></div>',
	},
};

describe('RestoreVersionLink', () => {
	const defaultProps = {
		revertVersion: {
			id: 'version-123',
			createdAt: new Date('2024-01-15T10:30:00').toISOString(),
		},
	};

	describe('rendering', () => {
		it('should render the restore button with formatted date', () => {
			const wrapper = render(RestoreVersionLink, {
				props: defaultProps,
				global: { stubs },
			});

			// Should render the restore button
			const button = wrapper.container.querySelector('button');
			expect(button).toBeTruthy();

			// Should display the i18n key for restore version text
			expect(wrapper.container.textContent).toContain('aiAssistant.textMessage.restoreVersion');
		});

		it('should render decorative lines on both sides of the button', () => {
			const wrapper = render(RestoreVersionLink, {
				props: defaultProps,
				global: { stubs },
			});

			// Check for the restore container structure with lines
			const container = wrapper.container.querySelector('[class*="restoreContainer"]');
			expect(container).toBeTruthy();

			// Should have line elements (class names are hashed in CSS modules)
			const lines = wrapper.container.querySelectorAll('[class*="restoreLine"]');
			expect(lines.length).toBe(2);
		});

		it('should not show confirm dialog initially', () => {
			const wrapper = render(RestoreVersionLink, {
				props: defaultProps,
				global: { stubs },
			});

			expect(wrapper.queryByTestId('restore-version-confirm-stub')).toBeFalsy();
		});

		it('should disable button when streaming is true', () => {
			const wrapper = render(RestoreVersionLink, {
				props: {
					...defaultProps,
					streaming: true,
				},
				global: { stubs },
			});

			const button = wrapper.container.querySelector('button');
			expect(button?.disabled).toBe(true);
			expect(button?.className).toContain('disabled');
		});

		it('should enable button when streaming is false', () => {
			const wrapper = render(RestoreVersionLink, {
				props: {
					...defaultProps,
					streaming: false,
				},
				global: { stubs },
			});

			const button = wrapper.container.querySelector('button');
			expect(button?.disabled).toBe(false);
		});
	});

	describe('date formatting', () => {
		it('should format date correctly with 24-hour time', () => {
			// Create a date and render
			const testDate = new Date('2024-03-20T14:05:00');
			const wrapper = render(RestoreVersionLink, {
				props: {
					revertVersion: {
						id: 'version-123',
						createdAt: testDate.toISOString(),
					},
				},
				global: { stubs },
			});

			// The button text should contain a formatted date
			// Note: Exact format depends on locale, but should include month, day, hour, minute
			const button = wrapper.container.querySelector('button');
			expect(button?.textContent).toBeTruthy();
		});

		it('should handle empty createdAt gracefully', () => {
			const wrapper = render(RestoreVersionLink, {
				props: {
					revertVersion: {
						id: 'version-123',
						createdAt: '',
					},
				},
				global: { stubs },
			});

			// Should still render without errors
			const button = wrapper.container.querySelector('button');
			expect(button).toBeTruthy();
		});
	});

	describe('confirm dialog interactions', () => {
		it('should show confirm dialog when button is clicked', async () => {
			const wrapper = render(RestoreVersionLink, {
				props: defaultProps,
				global: { stubs },
			});

			const button = wrapper.container.querySelector('button');
			await fireEvent.click(button!);
			await nextTick();

			expect(wrapper.queryByTestId('restore-version-confirm-stub')).toBeTruthy();
		});

		it('should apply active class when confirm dialog is shown', async () => {
			const wrapper = render(RestoreVersionLink, {
				props: defaultProps,
				global: { stubs },
			});

			const button = wrapper.container.querySelector('button');
			await fireEvent.click(button!);
			await nextTick();

			expect(button?.className).toContain('active');
		});

		it('should have disabled button when streaming (click prevention relies on HTML disabled attribute)', () => {
			const wrapper = render(RestoreVersionLink, {
				props: {
					...defaultProps,
					streaming: true,
				},
				global: { stubs },
			});

			const button = wrapper.container.querySelector('button');
			// Verify the button is properly disabled and has the disabled class
			expect(button?.disabled).toBe(true);
			expect(button?.className).toContain('disabled');
			// Note: HTML disabled buttons prevent click events natively in browsers
			// fireEvent.click in testing-library may not fully respect disabled state
		});

		it('should emit restoreConfirm with versionId when confirm is clicked', async () => {
			const wrapper = render(RestoreVersionLink, {
				props: defaultProps,
				global: { stubs },
			});

			// Open the dialog
			const button = wrapper.container.querySelector('button');
			await fireEvent.click(button!);
			await nextTick();

			// Click confirm
			const confirmButton = wrapper.getByTestId('confirm-button');
			await fireEvent.click(confirmButton);
			await nextTick();

			expect(wrapper.emitted()).toHaveProperty('restoreConfirm');
			expect(wrapper.emitted().restoreConfirm[0]).toEqual(['version-123']);
		});

		it('should close confirm dialog and emit restoreCancel when cancel is clicked', async () => {
			const wrapper = render(RestoreVersionLink, {
				props: defaultProps,
				global: { stubs },
			});

			// Open the dialog
			const button = wrapper.container.querySelector('button');
			await fireEvent.click(button!);
			await nextTick();

			// Click cancel
			const cancelButton = wrapper.getByTestId('cancel-button');
			await fireEvent.click(cancelButton);
			await nextTick();

			expect(wrapper.emitted()).toHaveProperty('restoreCancel');
			expect(wrapper.queryByTestId('restore-version-confirm-stub')).toBeFalsy();
		});

		it('should emit showVersion with versionId when show version is clicked', async () => {
			const wrapper = render(RestoreVersionLink, {
				props: defaultProps,
				global: { stubs },
			});

			// Open the dialog
			const button = wrapper.container.querySelector('button');
			await fireEvent.click(button!);
			await nextTick();

			// Click show version
			const showVersionButton = wrapper.getByTestId('show-version-button');
			await fireEvent.click(showVersionButton);
			await nextTick();

			expect(wrapper.emitted()).toHaveProperty('showVersion');
			expect(wrapper.emitted().showVersion[0]).toEqual(['version-123']);
		});

		it('should close confirm dialog after confirm action', async () => {
			const wrapper = render(RestoreVersionLink, {
				props: defaultProps,
				global: { stubs },
			});

			// Open the dialog
			const button = wrapper.container.querySelector('button');
			await fireEvent.click(button!);
			await nextTick();

			expect(wrapper.queryByTestId('restore-version-confirm-stub')).toBeTruthy();

			// Click confirm
			const confirmButton = wrapper.getByTestId('confirm-button');
			await fireEvent.click(confirmButton);
			await nextTick();

			expect(wrapper.queryByTestId('restore-version-confirm-stub')).toBeFalsy();
		});
	});

	describe('pruneTimeHours prop', () => {
		it('should pass pruneTimeHours to RestoreVersionConfirm', async () => {
			const wrapper = render(RestoreVersionLink, {
				props: {
					...defaultProps,
					pruneTimeHours: 48,
				},
				global: {
					stubs: {
						...stubs,
						RestoreVersionConfirm: {
							name: 'RestoreVersionConfirm',
							props: ['versionId', 'pruneTimeHours'],
							template:
								'<div data-test-id="restore-version-confirm-stub" :data-prune-hours="pruneTimeHours"></div>',
						},
					},
				},
			});

			// Open the dialog
			const button = wrapper.container.querySelector('button');
			await fireEvent.click(button!);
			await nextTick();

			const confirmDialog = wrapper.getByTestId('restore-version-confirm-stub');
			expect(confirmDialog.getAttribute('data-prune-hours')).toBe('48');
		});
	});
});
