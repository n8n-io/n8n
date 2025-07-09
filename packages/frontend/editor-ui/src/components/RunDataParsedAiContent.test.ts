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

	it('highlight matches to the search keyword in markdown', () => {
		const rendered = renderComponent({
			renderType: 'rendered',
			content: [
				{
					raw: {},
					parsedContent: {
						type: 'markdown',
						data: 'The **quick** brown fox jumps over the ~~lazy~~ dog',
						parsed: true,
					},
				},
			],
			search: 'the',
		});

		const marks = rendered.container.querySelectorAll('mark');

		expect(marks).toHaveLength(2);
		expect(marks[0]).toHaveTextContent('The');
		expect(marks[1]).toHaveTextContent('the');
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

	it('highlight matches to the search keyword in inline code in markdown', () => {
		const rendered = renderComponent({
			renderType: 'rendered',
			content: [
				{
					raw: {},
					parsedContent: {
						type: 'markdown',
						data: 'The `quick brown fox` jumps over the lazy dog',
						parsed: true,
					},
				},
			],
			search: 'fox',
		});

		const marks = rendered.container.querySelectorAll('mark');

		expect(marks).toHaveLength(1);
		expect(marks[0]).toHaveTextContent('fox');
	});

	it('highlight matches to the search keyword in a code block in markdown', () => {
		const rendered = renderComponent({
			renderType: 'rendered',
			content: [
				{
					raw: {},
					parsedContent: {
						type: 'markdown',
						data: 'Code:\n\n    quickFox.jump({ over: lazyDog });\n',
						parsed: true,
					},
				},
			],
			search: 'fox',
		});

		const marks = rendered.container.querySelectorAll('mark');

		expect(marks).toHaveLength(1);
		expect(marks[0]).toHaveTextContent('Fox');
	});

	it('highlight matches to the search keyword in fence syntax in markdown', () => {
		const rendered = renderComponent({
			renderType: 'rendered',
			content: [
				{
					raw: {},
					parsedContent: {
						type: 'markdown',
						data: '```\nquickFox.jump({ over: lazyDog });\n```',
						parsed: true,
					},
				},
			],
			search: 'fox',
		});

		const marks = rendered.container.querySelectorAll('mark');

		expect(marks).toHaveLength(1);
		expect(marks[0]).toHaveTextContent('Fox');
	});

	it('highlight matches to the search keyword in raw data', () => {
		const rendered = renderComponent({
			renderType: 'rendered',
			content: [{ raw: { key: 'value' }, parsedContent: null }],
			search: 'key',
		});

		const marks = rendered.container.querySelectorAll('mark');

		expect(marks).toHaveLength(1);
		expect(marks[0]).toHaveTextContent('key');
	});
});
