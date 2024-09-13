import { render } from '@testing-library/vue';
import { defineComponent } from 'vue';
import { n8nHtml } from './n8n-html';

const TestComponent = defineComponent({
	setup() {
		return {
			unsafeHtml:
				'<span>text</span><a href="https://malicious.com" onclick="alert(1)">malicious</a><img alt="Ok" src="./images/logo.svg" onerror="alert(2)<script>alert(3)</script>" />',
		};
	},
	template: '<div v-n8n-html="unsafeHtml"></div>',
});

describe('Directive n8n-html', () => {
	it('should sanitize html', async () => {
		const { html } = render(TestComponent, {
			global: {
				directives: {
					'n8n-html': n8nHtml,
				},
			},
		});
		expect(html()).toBe(
			'<div><span>text</span><a href="https://malicious.com">malicious</a><img alt="Ok" src="./images/logo.svg"></div>',
		);
	});
});
