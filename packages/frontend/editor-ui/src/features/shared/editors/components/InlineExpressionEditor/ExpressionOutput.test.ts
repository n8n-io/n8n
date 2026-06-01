import { renderComponent } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import type { Extension } from '@codemirror/state';
import ExpressionOutput from './ExpressionOutput.vue';
import type { Segment } from '../../../../../app/types/expressions';

describe('ExpressionOutput.vue', () => {
	const basicSegments: Segment[] = [
		{
			kind: 'plaintext',
			from: 0,
			to: 6,
			plaintext: 'Hello ',
		},
		{
			kind: 'resolvable',
			from: 6,
			to: 16,
			resolvable: '{{ $json.name }}',
			resolved: 'World',
			state: 'valid',
			error: null,
		},
	];

	describe('render mode: text', () => {
		it('should render text output by default', () => {
			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: basicSegments,
				},
			});

			const output = container.querySelector('[data-test-id="expression-output"]');
			expect(output).toBeInTheDocument();
			expect(output?.textContent).toContain('Hello World');
		});

		it('should render empty string message when segments are empty', () => {
			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: [],
				},
			});

			const output = container.querySelector('[data-test-id="expression-output"]');
			expect(output?.textContent).toBe('[empty]');
		});

		it('should render plaintext segments correctly', () => {
			const plaintextSegments: Segment[] = [
				{
					kind: 'plaintext',
					from: 0,
					to: 5,
					plaintext: 'Test ',
				},
				{
					kind: 'plaintext',
					from: 5,
					to: 10,
					plaintext: 'Value',
				},
			];

			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: plaintextSegments,
				},
			});

			const output = container.querySelector('[data-test-id="expression-output"]');
			expect(output?.textContent).toBe('Test Value');
		});

		it('should render resolvable segments with resolved values', () => {
			const resolvableSegments: Segment[] = [
				{
					kind: 'resolvable',
					from: 0,
					to: 10,
					resolvable: '{{ 1 + 1 }}',
					resolved: 2,
					state: 'valid',
					error: null,
				},
			];

			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: resolvableSegments,
				},
			});

			const output = container.querySelector('[data-test-id="expression-output"]');
			expect(output?.textContent).toBe('2');
		});

		it('should handle boolean resolved values', () => {
			const booleanSegments: Segment[] = [
				{
					kind: 'resolvable',
					from: 0,
					to: 10,
					resolvable: '{{ true }}',
					resolved: true,
					state: 'valid',
					error: null,
				},
			];

			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: booleanSegments,
				},
			});

			const output = container.querySelector('[data-test-id="expression-output"]');
			expect(output?.textContent).toBe('true');
		});

		it('should skip duplicate segments', () => {
			const duplicateSegments: Segment[] = [
				{
					from: 0,
					to: 5,
					plaintext: '[1,2]',
					kind: 'plaintext',
				},
				{
					from: 0,
					to: 1,
					plaintext: '[',
					kind: 'plaintext',
				},
				{
					from: 1,
					to: 2,
					plaintext: '1',
					kind: 'plaintext',
				},
			];

			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: duplicateSegments,
				},
			});

			const output = container.querySelector('[data-test-id="expression-output"]');
			expect(output?.textContent).toBe('[1,2]');
		});
	});

	describe('render mode: html', () => {
		it('should render HTML content when render mode is html', () => {
			const htmlSegments: Segment[] = [
				{
					kind: 'resolvable',
					from: 0,
					to: 10,
					resolvable: '{{ $json.html }}',
					resolved: '<h1>Hello</h1><p>World</p>',
					state: 'valid',
					error: null,
				},
			];

			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: htmlSegments,
					render: 'html',
				},
			});

			const output = container.querySelector('[data-test-id="expression-output"]');
			expect(output).toBeInTheDocument();
			expect(output?.tagName).toBe('IFRAME');
		});

		it('should not render CodeMirror editor in html mode', () => {
			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: basicSegments,
					render: 'html',
				},
			});

			const cmEditor = container.querySelector('.cm-editor');
			expect(cmEditor).not.toBeInTheDocument();
		});
	});

	describe('render mode: markdown', () => {
		it('should render Markdown content when render mode is markdown', () => {
			const markdownSegments: Segment[] = [
				{
					kind: 'resolvable',
					from: 0,
					to: 10,
					resolvable: '{{ $json.markdown }}',
					resolved: '# Hello\n\nThis is **bold** text',
					state: 'valid',
					error: null,
				},
			];

			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: markdownSegments,
					render: 'markdown',
				},
			});

			const output = container.querySelector('[data-test-id="expression-output"]');
			expect(output).toBeInTheDocument();
			expect(output).toHaveClass('markdown');
		});

		it('should not render CodeMirror editor in markdown mode', () => {
			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: basicSegments,
					render: 'markdown',
				},
			});

			const cmEditor = container.querySelector('.cm-editor');
			expect(cmEditor).not.toBeInTheDocument();
		});
	});

	describe('switching render modes', () => {
		it('should switch from text to html mode', async () => {
			const { container, rerender } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: basicSegments,
					render: 'text',
				},
			});

			let output = container.querySelector('[data-test-id="expression-output"]');
			expect(output).toBeInTheDocument();

			await rerender({
				segments: basicSegments,
				render: 'html',
			});

			await waitFor(() => {
				output = container.querySelector('[data-test-id="expression-output"]');
				expect(output?.tagName).toBe('IFRAME');
			});

			const cmEditor = container.querySelector('.cm-editor');
			expect(cmEditor).not.toBeInTheDocument();
		});

		it('should switch from text to markdown mode', async () => {
			const { container, rerender } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: basicSegments,
					render: 'text',
				},
			});

			let output = container.querySelector('[data-test-id="expression-output"]');
			expect(output).toBeInTheDocument();

			await rerender({
				segments: basicSegments,
				render: 'markdown',
			});

			await waitFor(() => {
				output = container.querySelector('[data-test-id="expression-output"]');
				expect(output).toHaveClass('markdown');
			});

			const cmEditor = container.querySelector('.cm-editor');
			expect(cmEditor).not.toBeInTheDocument();
		});

		it('should switch from html to text mode', async () => {
			const { container, rerender } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: basicSegments,
					render: 'html',
				},
			});

			let output = container.querySelector('[data-test-id="expression-output"]');
			expect(output?.tagName).toBe('IFRAME');

			await rerender({
				segments: basicSegments,
				render: 'text',
			});

			await waitFor(() => {
				output = container.querySelector('[data-test-id="expression-output"]');
				expect(output?.textContent).toContain('Hello World');
			});

			output = container.querySelector('[data-test-id="expression-output"]');
			expect(output?.tagName).not.toBe('IFRAME');
		});

		it('should switch from markdown to text mode', async () => {
			const { container, rerender } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: basicSegments,
					render: 'markdown',
				},
			});

			let output = container.querySelector('[data-test-id="expression-output"]');
			expect(output).toHaveClass('markdown');

			await rerender({
				segments: basicSegments,
				render: 'text',
			});

			await waitFor(() => {
				output = container.querySelector('[data-test-id="expression-output"]');
				expect(output?.textContent).toContain('Hello World');
			});

			output = container.querySelector('[data-test-id="expression-output"]');
			expect(output).not.toHaveClass('markdown');
		});

		it('should switch from html to markdown mode', async () => {
			const { container, rerender } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: basicSegments,
					render: 'html',
				},
			});

			let output = container.querySelector('[data-test-id="expression-output"]');
			expect(output?.tagName).toBe('IFRAME');

			await rerender({
				segments: basicSegments,
				render: 'markdown',
			});

			await waitFor(() => {
				output = container.querySelector('[data-test-id="expression-output"]');
				expect(output).toHaveClass('markdown');
			});

			output = container.querySelector('[data-test-id="expression-output"]');
			expect(output?.tagName).not.toBe('IFRAME');
		});

		it('should switch from markdown to html mode', async () => {
			const { container, rerender } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: basicSegments,
					render: 'markdown',
				},
			});

			let output = container.querySelector('[data-test-id="expression-output"]');
			expect(output).toHaveClass('markdown');

			await rerender({
				segments: basicSegments,
				render: 'html',
			});

			await waitFor(() => {
				output = container.querySelector('[data-test-id="expression-output"]');
				expect(output?.tagName).toBe('IFRAME');
			});

			output = container.querySelector('[data-test-id="expression-output"]');
			expect(output).not.toHaveClass('markdown');
		});

		it('should update segments when in text mode', async () => {
			const initialSegments = [
				{
					kind: 'plaintext',
					from: 0,
					to: 5,
					plaintext: 'First',
				},
			] as Segment[];

			const updatedSegments = [
				{
					kind: 'plaintext',
					from: 0,
					to: 6,
					plaintext: 'Second',
				},
			] as Segment[];

			const { container, rerender } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: initialSegments,
					render: 'text',
				},
			});

			let output = container.querySelector('[data-test-id="expression-output"]');
			expect(output?.textContent).toBe('First');

			await rerender({
				segments: updatedSegments,
				render: 'text',
			});

			await waitFor(() => {
				output = container.querySelector('[data-test-id="expression-output"]');
				expect(output?.textContent).toBe('Second');
			});
		});

		it('should handle rapid mode switching', async () => {
			const { container, rerender } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: basicSegments,
					render: 'text',
				},
			});

			await rerender({ segments: basicSegments, render: 'html' });
			await rerender({ segments: basicSegments, render: 'markdown' });
			await rerender({ segments: basicSegments, render: 'text' });

			await waitFor(() => {
				const output = container.querySelector('[data-test-id="expression-output"]');
				expect(output?.textContent).toContain('Hello World');
			});

			const output = container.querySelector('[data-test-id="expression-output"]');
			expect(output).toBeInTheDocument();
			expect(container.querySelector('iframe')).not.toBeInTheDocument();
		});
	});

	describe('getValue expose method', () => {
		it('should render output correctly for getValue usage', () => {
			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: basicSegments,
				},
			});

			const output = container.querySelector('[data-test-id="expression-output"]');
			expect(output).toBeInTheDocument();
			expect(output?.textContent).toContain('Hello World');
		});
	});

	describe('edge cases', () => {
		it('should handle segments with null resolved value', () => {
			const segmentsWithNull: Segment[] = [
				{
					kind: 'resolvable',
					from: 0,
					to: 10,
					resolvable: '{{ $json.missing }}',
					resolved: null,
					state: 'valid',
					error: null,
				},
			];

			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: segmentsWithNull,
					render: 'text',
				},
			});

			const output = container.querySelector('[data-test-id="expression-output"]');
			expect(output).toBeInTheDocument();
		});

		it('should handle mixed plaintext and resolvable segments', () => {
			const mixedSegments: Segment[] = [
				{
					kind: 'plaintext',
					from: 0,
					to: 6,
					plaintext: 'Hello ',
				},
				{
					kind: 'resolvable',
					from: 6,
					to: 16,
					resolvable: '{{ $json.name }}',
					resolved: 'John',
					state: 'valid',
					error: null,
				},
				{
					kind: 'plaintext',
					from: 16,
					to: 23,
					plaintext: ', age: ',
				},
				{
					kind: 'resolvable',
					from: 23,
					to: 33,
					resolvable: '{{ $json.age }}',
					resolved: 25,
					state: 'valid',
					error: null,
				},
			];

			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: mixedSegments,
					render: 'text',
				},
			});

			const output = container.querySelector('[data-test-id="expression-output"]');
			expect(output?.textContent).toBe('Hello John, age: 25');
		});

		it('should handle custom extensions in text mode', () => {
			const customExtensions: Extension[] = [];

			const { container } = renderComponent(ExpressionOutput, {
				pinia: createTestingPinia(),
				props: {
					segments: basicSegments,
					extensions: customExtensions,
					render: 'text',
				},
			});

			const output = container.querySelector('[data-test-id="expression-output"]');
			expect(output).toBeInTheDocument();
		});
	});
});
