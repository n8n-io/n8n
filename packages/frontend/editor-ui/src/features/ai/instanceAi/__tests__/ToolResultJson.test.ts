import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import ToolResultJson from '../components/ToolResultJson.vue';

const renderComponent = createComponentRenderer(ToolResultJson);

describe('ToolResultJson', () => {
	it('highlights keys and values by type', () => {
		const { container } = renderComponent({
			props: { value: { name: 'Flow', count: 3, active: true, owner: null } },
		});

		const texts = (selector: string) =>
			Array.from(container.querySelectorAll(selector)).map((el) => el.textContent);

		expect(texts('.json-key')).toEqual(['"name"', '"count"', '"active"', '"owner"']);
		expect(texts('.json-string')).toEqual(['"Flow"']);
		expect(texts('.json-number')).toEqual(['3']);
		expect(texts('.json-bool')).toEqual(['true', 'null']);
	});

	it('renders the same text as JSON.stringify', () => {
		const value = { date: new Date('2026-01-01T00:00:00.000Z'), skipped: undefined, list: [1] };
		const { container } = renderComponent({ props: { value } });

		expect(container.querySelector('pre')?.textContent).toBe(JSON.stringify(value, null, 2));
	});

	it('escapes HTML in keys and strings', () => {
		const { container } = renderComponent({
			props: { value: { '<b>key</b>': '<img src=x onerror=alert(1)>' } },
		});

		expect(container.querySelector('img')).not.toBeInTheDocument();
		expect(container.querySelector('b')).not.toBeInTheDocument();
		expect(container.querySelector('.json-string')?.textContent).toBe(
			'"<img src=x onerror=alert(1)>"',
		);
	});

	it('shows truncated output as plain text with a download button', () => {
		const { container, getByRole } = renderComponent({
			props: { value: { data: 'x'.repeat(100_001) } },
		});

		expect(container.querySelector('.json-key')).not.toBeInTheDocument();
		expect(container.querySelector('pre')?.textContent).toHaveLength(100_000);
		expect(getByRole('button')).toBeInTheDocument();
	});
});
