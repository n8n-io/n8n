import { render, fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';

import RestoreVersionConfirm from './RestoreVersionConfirm.vue';

// Mock i18n to return keys with interpolation for testing
vi.mock('@n8n/design-system/composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string, params?: Record<string, string>) => {
			if (params) {
				return `${key}:${JSON.stringify(params)}`;
			}
			return key;
		},
	}),
}));

const stubs = {
	N8nButton: {
		name: 'N8nButton',
		props: ['type', 'size'],
		template: '<button data-test-id="n8n-button-stub" @click="$emit(\'click\')"><slot /></button>',
	},
	N8nIcon: true,
};

describe('RestoreVersionConfirm', () => {
	const defaultProps = {
		versionId: 'version-abc123',
	};

	describe('rendering', () => {
		it('should render correctly with default props', () => {
			const wrapper = render(RestoreVersionConfirm, {
				props: defaultProps,
				global: { stubs },
			});

			expect(wrapper.getByTestId('restore-version-confirm')).toBeTruthy();
			expect(wrapper.container.textContent).toContain('aiAssistant.versionCard.restoreModal.title');
			expect(wrapper.container.textContent).toContain(
				'aiAssistant.versionCard.restoreModal.showVersion',
			);
			expect(wrapper.container.textContent).toContain(
				'aiAssistant.versionCard.restoreModal.restore',
			);
		});

		it('should render description without limit when pruneTimeHours is undefined', () => {
			const wrapper = render(RestoreVersionConfirm, {
				props: defaultProps,
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain(
				'aiAssistant.versionCard.restoreModal.descriptionNoLimit',
			);
		});

		it('should render description without limit when pruneTimeHours is -1', () => {
			const wrapper = render(RestoreVersionConfirm, {
				props: {
					...defaultProps,
					pruneTimeHours: -1,
				},
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain(
				'aiAssistant.versionCard.restoreModal.descriptionNoLimit',
			);
		});
	});

	describe('prune time formatting', () => {
		it('should format 1 hour correctly (singular)', () => {
			const wrapper = render(RestoreVersionConfirm, {
				props: {
					...defaultProps,
					pruneTimeHours: 1,
				},
				global: { stubs },
			});

			// Description should use the hour key
			expect(wrapper.container.textContent).toContain(
				'aiAssistant.versionCard.restoreModal.description',
			);
			expect(wrapper.container.textContent).toContain('aiAssistant.versionCard.restoreModal.hour');
		});

		it('should format multiple hours correctly (plural)', () => {
			const wrapper = render(RestoreVersionConfirm, {
				props: {
					...defaultProps,
					pruneTimeHours: 12,
				},
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('aiAssistant.versionCard.restoreModal.hours');
		});

		it('should format 24 hours as hours not days', () => {
			const wrapper = render(RestoreVersionConfirm, {
				props: {
					...defaultProps,
					pruneTimeHours: 24,
				},
				global: { stubs },
			});

			// 24 hours should still be displayed as hours (not converted to days)
			expect(wrapper.container.textContent).toContain('aiAssistant.versionCard.restoreModal.hours');
		});

		it('should format 48 hours as 2 days', () => {
			const wrapper = render(RestoreVersionConfirm, {
				props: {
					...defaultProps,
					pruneTimeHours: 48,
				},
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('aiAssistant.versionCard.restoreModal.days');
		});

		it('should format 25 hours as 1 day (floor division)', () => {
			const wrapper = render(RestoreVersionConfirm, {
				props: {
					...defaultProps,
					pruneTimeHours: 25,
				},
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('aiAssistant.versionCard.restoreModal.day');
		});

		it('should format 72 hours as 3 days', () => {
			const wrapper = render(RestoreVersionConfirm, {
				props: {
					...defaultProps,
					pruneTimeHours: 72,
				},
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('aiAssistant.versionCard.restoreModal.days');
		});
	});

	describe('event emissions', () => {
		it('should emit confirm when restore button is clicked', async () => {
			const wrapper = render(RestoreVersionConfirm, {
				props: defaultProps,
				global: { stubs },
			});

			const restoreButton = wrapper.getByTestId('n8n-button-stub');
			await fireEvent.click(restoreButton);
			await nextTick();

			expect(wrapper.emitted()).toHaveProperty('confirm');
			// Verify at least one confirm event was emitted
			expect(wrapper.emitted().confirm.length).toBeGreaterThanOrEqual(1);
		});

		it('should emit showVersion with versionId when show version button is clicked', async () => {
			const wrapper = render(RestoreVersionConfirm, {
				props: {
					versionId: 'test-version-id',
				},
				global: { stubs },
			});

			// Find the show version button (it's a regular button, not N8nButton)
			const buttons = wrapper.container.querySelectorAll('button');
			const showVersionButton = Array.from(buttons).find((btn) =>
				btn.textContent?.includes('aiAssistant.versionCard.restoreModal.showVersion'),
			);

			expect(showVersionButton).toBeTruthy();
			await fireEvent.click(showVersionButton!);
			await nextTick();

			expect(wrapper.emitted()).toHaveProperty('showVersion');
			expect(wrapper.emitted().showVersion[0]).toEqual(['test-version-id']);
		});
	});

	describe('structure and styling', () => {
		it('should have correct test id for automation', () => {
			const wrapper = render(RestoreVersionConfirm, {
				props: defaultProps,
				global: { stubs },
			});

			expect(wrapper.getByTestId('restore-version-confirm')).toBeTruthy();
		});

		it('should render title, description, and action buttons', () => {
			const wrapper = render(RestoreVersionConfirm, {
				props: defaultProps,
				global: { stubs },
			});

			// Check for title
			const title = wrapper.container.querySelector('h3');
			expect(title).toBeTruthy();

			// Check for description
			const description = wrapper.container.querySelector('p');
			expect(description).toBeTruthy();

			// Check for buttons (show version + restore)
			const buttons = wrapper.container.querySelectorAll('button');
			expect(buttons.length).toBeGreaterThanOrEqual(2);
		});
	});
});
