import { createTestingPinia } from '@pinia/testing';
import { i18n, i18nInstance } from '@n8n/i18n';

import { createComponentRenderer } from '@/__tests__/render';
import ResourceFiltersDropdown from '@/app/components/forms/ResourceFiltersDropdown.vue';

const TEST_LOCALE = 'test-locale';
const TRANSLATED_FILTERS = 'Translated filters label';

/**
 * `N8nTooltip` teleports its content into a popper on hover, so stub it to render
 * the content slot inline. The popover renders only its trigger, since the
 * dropdown body is not under test and pulls in router-dependent stores.
 */
const renderComponent = createComponentRenderer(ResourceFiltersDropdown, {
	global: {
		stubs: {
			N8nPopover: {
				template: '<div><slot name="trigger" /></div>',
			},
			N8nTooltip: {
				template:
					'<div><span data-test-id="filters-tooltip-content"><slot name="content" /></span><slot /></div>',
			},
		},
	},
});

describe('ResourceFiltersDropdown', () => {
	const originalLocale = i18nInstance.global.locale.value;

	beforeEach(() => {
		createTestingPinia();
		i18nInstance.global.setLocaleMessage(TEST_LOCALE, {
			'forms.resourceFiltersDropdown.filters': TRANSLATED_FILTERS,
		});
		i18nInstance.global.locale.value = TEST_LOCALE;
		i18n.clearCache();
	});

	afterEach(() => {
		i18nInstance.global.locale.value = originalLocale;
		i18n.clearCache();
	});

	it('should localize the filter button tooltip', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('filters-tooltip-content')).toHaveTextContent(TRANSLATED_FILTERS);
	});

	it('should use the same localized label for the tooltip and the aria-label', () => {
		const { getByTestId } = renderComponent();

		const trigger = getByTestId('resources-list-filters-trigger');

		expect(trigger).toHaveAttribute('aria-label', TRANSLATED_FILTERS);
		expect(getByTestId('filters-tooltip-content')).toHaveTextContent(TRANSLATED_FILTERS);
	});
});
