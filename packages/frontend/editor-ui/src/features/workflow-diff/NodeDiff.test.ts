import { describe, it, expect, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import NodeDiff from '@/features/workflow-diff/NodeDiff.vue';
import { createTestingPinia } from '@pinia/testing';

// Mock the v-code-diff library
vi.mock('v-code-diff', () => ({
	CodeDiff: {
		name: 'CodeDiff',
		props: [
			'oldString',
			'newString',
			'outputFormat',
			'language',
			'hideStat',
			'hideHeader',
			'forceInlineComparison',
			'diffStyle',
		],
		template: '<div class="code-diff-mock" :data-old="oldString" :data-new="newString" />',
	},
}));

const renderComponent = createComponentRenderer(NodeDiff, {
	global: {
		stubs: {
			CodeDiff: {
				name: 'CodeDiff',
				props: [
					'oldString',
					'newString',
					'outputFormat',
					'language',
					'hideStat',
					'hideHeader',
					'forceInlineComparison',
					'diffStyle',
				],
				template: '<div class="code-diff-mock" :data-old="oldString" :data-new="newString" />',
			},
		},
	},
});

describe('NodeDiff', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('should render with required props', () => {
		const { container } = renderComponent({
			props: {
				oldString: '{"name": "old"}',
				newString: '{"name": "new"}',
			},
		});

		const codeDiff = container.querySelector('.code-diff-mock');
		expect(codeDiff).toBeInTheDocument();
		expect(codeDiff?.getAttribute('data-old')).toBe('{"name": "old"}');
		expect(codeDiff?.getAttribute('data-new')).toBe('{"name": "new"}');
	});

	it('should use default props when not provided', () => {
		const { container } = renderComponent({
			props: {
				oldString: 'old content',
				newString: 'new content',
			},
		});

		const codeDiff = container.querySelector('.code-diff-mock');
		expect(codeDiff).toBeInTheDocument();
	});

	it('should pass custom output format', () => {
		const { container } = renderComponent({
			props: {
				oldString: 'old',
				newString: 'new',
				outputFormat: 'side-by-side',
			},
		});

		expect(container.querySelector('.code-diff-mock')).toBeInTheDocument();
	});

	it('should pass custom language', () => {
		const { container } = renderComponent({
			props: {
				oldString: 'console.log("old")',
				newString: 'console.log("new")',
				language: 'javascript',
			},
		});

		expect(container.querySelector('.code-diff-mock')).toBeInTheDocument();
	});

	it('should handle empty strings', () => {
		const { container } = renderComponent({
			props: {
				oldString: '',
				newString: '',
			},
		});

		const codeDiff = container.querySelector('.code-diff-mock');
		expect(codeDiff).toBeInTheDocument();
		expect(codeDiff?.getAttribute('data-old')).toBe('');
		expect(codeDiff?.getAttribute('data-new')).toBe('');
	});

	it('should handle one empty string', () => {
		const { container } = renderComponent({
			props: {
				oldString: '',
				newString: '{"added": "content"}',
			},
		});

		const codeDiff = container.querySelector('.code-diff-mock');
		expect(codeDiff).toBeInTheDocument();
		expect(codeDiff?.getAttribute('data-old')).toBe('');
		expect(codeDiff?.getAttribute('data-new')).toBe('{"added": "content"}');
	});

	it('should handle JSON strings', () => {
		const oldJson = '{"id": "node1", "name": "Original Node", "type": "http"}';
		const newJson = '{"id": "node1", "name": "Updated Node", "type": "webhook"}';

		const { container } = renderComponent({
			props: {
				oldString: oldJson,
				newString: newJson,
			},
		});

		const codeDiff = container.querySelector('.code-diff-mock');
		expect(codeDiff).toBeInTheDocument();
		expect(codeDiff?.getAttribute('data-old')).toBe(oldJson);
		expect(codeDiff?.getAttribute('data-new')).toBe(newJson);
	});

	it('should pass all optional props', () => {
		const { container } = renderComponent({
			props: {
				oldString: 'old',
				newString: 'new',
				outputFormat: 'side-by-side',
				language: 'typescript',
				hideStat: true,
				hideHeader: false,
				forceInlineComparison: true,
				diffStyle: 'char',
			},
		});

		expect(container.querySelector('.code-diff-mock')).toBeInTheDocument();
	});

	it('should handle complex JSON differences', () => {
		const oldComplex = JSON.stringify({
			id: 'node1',
			parameters: {
				url: 'https://old.com',
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			},
			position: [100, 200],
		});

		const newComplex = JSON.stringify({
			id: 'node1',
			parameters: {
				url: 'https://new.com',
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
			},
			position: [150, 250],
		});

		const { container } = renderComponent({
			props: {
				oldString: oldComplex,
				newString: newComplex,
			},
		});

		const codeDiff = container.querySelector('.code-diff-mock');
		expect(codeDiff).toBeInTheDocument();
		expect(codeDiff?.getAttribute('data-old')).toBe(oldComplex);
		expect(codeDiff?.getAttribute('data-new')).toBe(newComplex);
	});
});
