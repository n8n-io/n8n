import { createTestingPinia } from '@pinia/testing';
import { i18n, i18nInstance } from '@n8n/i18n';
import type { ITemplatesWorkflow } from '@n8n/rest-api-client/api/templates';

import { createComponentRenderer } from '@/__tests__/render';
import TemplateCard from './TemplateCard.vue';

const TEST_LOCALE = 'test-locale';

const workflow: ITemplatesWorkflow = {
	id: 1,
	createdAt: '2024-01-01T00:00:00.000Z',
	name: 'Test template',
	nodes: [],
	totalViews: 10,
	user: { username: 'author', name: 'Author', avatar: '', verified: false },
};

const renderComponent = createComponentRenderer(TemplateCard, {
	global: {
		stubs: {
			NodeList: true,
			TimeAgo: true,
		},
	},
});

describe('TemplateCard', () => {
	const originalLocale = i18nInstance.global.locale.value;

	beforeEach(() => {
		createTestingPinia();
		i18nInstance.global.setLocaleMessage(TEST_LOCALE, {
			'template.buttons.useWorkflowButton': 'Translated use workflow',
		});
		i18nInstance.global.locale.value = TEST_LOCALE;
		i18n.clearCache();
	});

	afterEach(() => {
		i18nInstance.global.locale.value = originalLocale;
		i18n.clearCache();
	});

	it('should localize the use workflow button', () => {
		const { getByTestId } = renderComponent({
			props: { workflow, useWorkflowButton: true },
		});

		expect(getByTestId('use-workflow-button')).toHaveTextContent('Translated use workflow');
	});
});
