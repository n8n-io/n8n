import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import RunDataDisplayModeSelect from '@/features/ndv/runData/components/RunDataDisplayModeSelect.vue';

const renderComponent = createComponentRenderer(RunDataDisplayModeSelect, {
	props: {
		compact: false,
		value: 'schema',
		hasBinaryData: false,
		paneType: 'output',
		nodeGeneratesHtml: false,
		hasRenderableData: false,
	},
});

function getOptionValues(container: Element) {
	return Array.from(container.querySelectorAll('[role="radio"]')).map((option) =>
		option.getAttribute('data-test-id')?.replace('radio-button-', ''),
	);
}

describe('RunDataDisplayModeSelect', () => {
	describe('options', () => {
		it('should offer schema, table and json by default', () => {
			const { container, getByTestId } = renderComponent();

			expect(getOptionValues(container)).toEqual(['schema', 'table', 'json']);
			expect(getByTestId('radio-button-schema')).toHaveTextContent('Schema');
			expect(getByTestId('radio-button-table')).toHaveTextContent('Table');
			expect(getByTestId('radio-button-json')).toHaveTextContent('JSON');
		});

		it('should offer binary last when the data has binary data', () => {
			const { container, getByTestId } = renderComponent({ props: { hasBinaryData: true } });

			expect(getOptionValues(container)).toEqual(['schema', 'table', 'json', 'binary']);
			expect(getByTestId('radio-button-binary')).toHaveTextContent('Binary');
		});

		it('should offer html first in the output pane when the node generates HTML', () => {
			const { container, getByTestId } = renderComponent({
				props: { paneType: 'output', nodeGeneratesHtml: true },
			});

			expect(getOptionValues(container)).toEqual(['html', 'schema', 'table', 'json']);
			expect(getByTestId('radio-button-html')).toHaveTextContent('HTML');
		});

		it('should not offer html in the input pane', () => {
			const { container } = renderComponent({
				props: { paneType: 'input', nodeGeneratesHtml: true },
			});

			expect(getOptionValues(container)).toEqual(['schema', 'table', 'json']);
		});

		it('should offer rendered first when the data has renderable content', () => {
			const { container, getByTestId } = renderComponent({ props: { hasRenderableData: true } });

			expect(getOptionValues(container)).toEqual(['ai', 'schema', 'table', 'json']);
			expect(getByTestId('radio-button-ai')).toHaveTextContent('Rendered');
		});

		it('should order rendered, html, built-in modes and binary when all apply', () => {
			const { container } = renderComponent({
				props: {
					value: 'ai',
					paneType: 'output',
					hasBinaryData: true,
					nodeGeneratesHtml: true,
					hasRenderableData: true,
				},
			});

			expect(getOptionValues(container)).toEqual([
				'ai',
				'html',
				'schema',
				'table',
				'json',
				'binary',
			]);
		});

		it('should keep the test ids that end-to-end tests use', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('ndv-run-data-display-mode')).toBeInTheDocument();
			expect(getByTestId('radio-button-schema')).toBeInTheDocument();
		});
	});

	describe('compact mode', () => {
		it('should show an icon for each mode', () => {
			const { getByTestId } = renderComponent({
				props: {
					compact: true,
					value: 'ai',
					paneType: 'output',
					hasBinaryData: true,
					nodeGeneratesHtml: true,
					hasRenderableData: true,
				},
			});

			const expectedIcons = {
				ai: 'text',
				html: 'file-code',
				schema: 'schema',
				table: 'table',
				json: 'json',
				binary: 'binary',
			};

			for (const [mode, icon] of Object.entries(expectedIcons)) {
				const option = getByTestId(`radio-button-${mode}`);
				expect(option.querySelector('[data-icon]')).toHaveAttribute('data-icon', icon);
				expect(option).not.toHaveTextContent(/\S/);
			}
		});

		it('should show labels and no icons when not compact', () => {
			const { getByTestId } = renderComponent();

			const option = getByTestId('radio-button-table');
			expect(option).toHaveTextContent('Table');
			expect(option.querySelector('[data-icon]')).toBeNull();
		});
	});

	describe('selection', () => {
		it('should mark the value as the selected mode', () => {
			const { getByTestId } = renderComponent({ props: { value: 'json' } });

			expect(getByTestId('radio-button-json')).toHaveAttribute('aria-checked', 'true');
			expect(getByTestId('radio-button-schema')).toHaveAttribute('aria-checked', 'false');
			expect(getByTestId('radio-button-table')).toHaveAttribute('aria-checked', 'false');
		});

		it('should emit change with the clicked mode', async () => {
			const { getByTestId, emitted } = renderComponent({ props: { value: 'schema' } });

			await userEvent.click(getByTestId('radio-button-json'));

			await waitFor(() => expect(emitted('change')).toEqual([['json']]));
		});

		it('should not emit change when the value is an offered mode', () => {
			const { emitted } = renderComponent({ props: { value: 'table' } });

			expect(emitted('change')).toBeUndefined();
		});

		it('should emit the first mode when the value is not offered', () => {
			const { emitted } = renderComponent({
				props: { value: 'html', paneType: 'output', nodeGeneratesHtml: false },
			});

			expect(emitted('change')).toEqual([['schema']]);
		});

		it('should emit the first mode when the offered modes no longer include the value', async () => {
			const { emitted, rerender } = renderComponent({
				props: { value: 'binary', hasBinaryData: true },
			});

			expect(emitted('change')).toBeUndefined();

			await rerender({ hasBinaryData: false });

			await waitFor(() => expect(emitted('change')).toEqual([['schema']]));
		});

		it('should emit the first mode when the parent passes a value that is not offered', async () => {
			const { emitted, rerender } = renderComponent({ props: { value: 'table' } });

			expect(emitted('change')).toBeUndefined();

			await rerender({ value: 'binary' });

			await waitFor(() => expect(emitted('change')).toEqual([['schema']]));
		});
	});
});
