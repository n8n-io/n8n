import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import ToolArgsRenderer from '../components/ToolArgsRenderer.vue';

const renderComponent = createComponentRenderer(ToolArgsRenderer);

describe('ToolArgsRenderer', () => {
	it('renders a GitHub-style diff for workspace_str_replace_file', () => {
		const { getByTestId, getAllByTestId, queryByText } = renderComponent({
			props: {
				toolName: 'workspace_str_replace_file',
				args: {
					path: 'src/workflows/whatsapp-faq-triage.workflow.ts',
					old_str: '{{ $json.toJSON() }}',
					new_str: '{{ JSON.stringify($json) }}',
				},
			},
		});

		expect(getByTestId('tool-args-diff')).toBeInTheDocument();
		expect(getByTestId('tool-args-diff')).toHaveTextContent(
			'src/workflows/whatsapp-faq-triage.workflow.ts',
		);
		const lines = getAllByTestId('tool-args-diff-line');
		expect(lines.some((line) => line.textContent?.includes('{{ $json.toJSON() }}'))).toBe(true);
		expect(lines.some((line) => line.textContent?.includes('{{ JSON.stringify($json) }}'))).toBe(
			true,
		);
		expect(queryByText('"old_str"')).not.toBeInTheDocument();
	});

	it('stacks diffs for batch str_replace', () => {
		const { getAllByTestId } = renderComponent({
			props: {
				toolName: 'workspace_batch_str_replace_file',
				args: {
					path: 'a.ts',
					replacements: [
						{ old_str: 'one', new_str: 'uno' },
						{ old_str: 'two', new_str: 'dos' },
					],
				},
			},
		});

		expect(getAllByTestId('tool-args-diff-hunk')).toHaveLength(2);
	});

	it('renders a TypeScript-highlighted addition diff for workspace_write_file', () => {
		const { getByTestId, getAllByTestId, queryByText } = renderComponent({
			props: {
				toolName: 'workspace_write_file',
				args: {
					path: 'src/workflows/whatsapp-faq-triage.workflow.ts',
					content: "import {\n  workflow,\n} from '@n8n/workflow-sdk';\n",
				},
			},
		});

		expect(getByTestId('tool-args-diff')).toBeInTheDocument();
		expect(getByTestId('tool-args-diff')).toHaveTextContent(
			'src/workflows/whatsapp-faq-triage.workflow.ts',
		);
		const lines = getAllByTestId('tool-args-diff-line');
		expect(lines.length).toBeGreaterThan(1);
		expect(lines.every((line) => line.textContent?.includes('+'))).toBe(true);
		expect(getByTestId('tool-args-diff').querySelector('.hljs-keyword')).toBeTruthy();
		expect(queryByText('"content"')).not.toBeInTheDocument();
	});

	it('renders a terminal-style command for workspace_execute_command', () => {
		const { getByTestId, queryByText } = renderComponent({
			props: {
				toolName: 'workspace_execute_command',
				args: {
					command: 'head -50 package.json',
					cwd: '/home/daytona/workspace',
				},
			},
		});

		expect(getByTestId('tool-command-view')).toBeInTheDocument();
		expect(getByTestId('tool-command-input')).toHaveTextContent('head -50 package.json');
		expect(getByTestId('tool-command-input')).toHaveTextContent('/home/daytona/workspace');
		expect(queryByText('"command"')).not.toBeInTheDocument();
	});

	it('falls back to JSON for other tools', () => {
		const { queryByTestId, getByText } = renderComponent({
			props: {
				toolName: 'workspace_read_file',
				args: { path: 'a.ts' },
			},
		});

		expect(queryByTestId('tool-args-diff')).not.toBeInTheDocument();
		expect(queryByTestId('tool-command-view')).not.toBeInTheDocument();
		expect(getByText(/"path"/)).toBeInTheDocument();
	});
});
