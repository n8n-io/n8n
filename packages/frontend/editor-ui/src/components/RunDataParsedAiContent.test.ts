import { createComponentRenderer } from '@/__tests__/render';
import RunDataParsedAiContent from '@/components/RunDataParsedAiContent.vue';
import { createTestingPinia } from '@pinia/testing';
import { h } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

type Props = InstanceType<typeof RunDataParsedAiContent>['$props'];

function renderComponent(props: Props) {
	return createComponentRenderer(RunDataParsedAiContent, {
		global: {
			plugins: [
				createTestingPinia({ stubActions: false }),
				createRouter({
					history: createWebHistory(),
					routes: [{ path: '/', component: () => h('div') }],
				}),
			],
		},
		props,
	})();
}

describe('RunDataParsedAiContent', () => {
	it('renders AI content parsed as text', () => {
		const rendered = renderComponent({
			renderType: 'rendered',
			content: [{ raw: {}, parsedContent: { type: 'text', data: 'hello!', parsed: true } }],
		});

		expect(rendered.container).toHaveTextContent('hello!');
	});

	it('renders AI content parsed as markdown', () => {
		const rendered = renderComponent({
			renderType: 'rendered',
			content: [
				{
					raw: {},
					parsedContent: { type: 'markdown', data: '# hi!\n\nthis is *markdown*', parsed: true },
				},
			],
		});

		expect(rendered.getByText('hi!', { selector: 'h1' })).toBeInTheDocument();
		expect(rendered.getByText('markdown', { selector: 'em' })).toBeInTheDocument();
	});

	it('renders AI content parsed as JSON', () => {
		const rendered = renderComponent({
			renderType: 'rendered',
			content: [
				{
					raw: {},
					parsedContent: { type: 'json', data: ['hi!', '{"key": "value"}'], parsed: true },
				},
			],
		});

		expect(rendered.getByText('hi!', { selector: 'p' })).toBeInTheDocument();
		expect(rendered.getByText('{"key": "value"}', { selector: 'code' })).toBeInTheDocument();
	});

	it("renders AI content that wasn't parsed", () => {
		const rendered = renderComponent({
			renderType: 'rendered',
			content: [{ raw: { key: 'value' }, parsedContent: null }],
		});

		expect(
			rendered.getByText('{ "key": "value" }', { selector: 'code', exact: false }),
		).toBeInTheDocument();
	});
});
