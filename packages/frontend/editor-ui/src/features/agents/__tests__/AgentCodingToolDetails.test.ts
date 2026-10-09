import { cleanup, render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import AgentCodingToolDetails from '../components/AgentCodingToolDetails.vue';
import { TOOL_CALL_STATE } from '../constants';
import { CODING_OPEN_FILE } from '../utils/coding-review';

// CodeMirror is slow to mount in jsdom and is not under test here.
// `__esModule` lets the async component loader read the default export.
vi.mock('../components/AgentCustomToolViewer.vue', () => ({
	__esModule: true,
	default: { props: ['code'], template: '<pre data-testid="code-viewer">{{ code }}</pre>' },
}));

afterEach(() => {
	cleanup();
});

function toolCall(
	tool: string,
	input: unknown,
	output?: unknown,
	state: ToolCall['state'] = TOOL_CALL_STATE.DONE,
): ToolCall {
	return { toolCallId: 'call-1', tool, input, output, state };
}

const EDIT_INPUT = {
	path: 'src/a.ts',
	replacements: [
		{ old_str: 'one', new_str: 'uno' },
		{ old_str: 'two', new_str: 'dos' },
		{ old_str: 'three', new_str: 'tres' },
	],
};

function renderDetails(call: ToolCall) {
	const openFile = vi.fn();
	const result = render(AgentCodingToolDetails, {
		props: { toolCall: call },
		global: { provide: { [CODING_OPEN_FILE]: openFile } },
	});
	return { ...result, openFile };
}

function byTestId(container: Element, id: string): HTMLElement | null {
	return container.querySelector<HTMLElement>(`[data-testid="${id}"]`);
}

/** The open tooltip, which Reka UI renders outside the component. */
function openTooltip() {
	return document.querySelector('[data-dismissable-layer]');
}

describe('AgentCodingToolDetails', () => {
	it('starts the details with the path, which opens the file', async () => {
		const { openFile } = renderDetails(
			toolCall('workspace_read_file', { path: 'src/lib/dates.ts' }, { content: 'export {}' }),
		);

		const path = screen.getByRole('button', { name: 'Open src/lib/dates.ts' });
		expect(path).toHaveTextContent('src/lib/dates.ts');
		expect(path).not.toHaveAttribute('title');
		await userEvent.click(path);

		expect(openFile).toHaveBeenCalledWith('src/lib/dates.ts');
		expect(screen.getByText('File content')).toBeVisible();
		expect(await screen.findByText('export {}')).toBeVisible();
	});

	it('shows the full path in a tooltip when the path gets keyboard focus', async () => {
		const longPath =
			'packages/frontend/editor-ui/src/features/agents/components/AgentCodingDiff.vue';
		renderDetails(toolCall('workspace_read_file', { path: longPath }, { content: 'export {}' }));
		expect(openTooltip()).toBeNull();

		await userEvent.tab();

		expect(screen.getByRole('button', { name: `Open ${longPath}` })).toHaveFocus();
		await waitFor(() => expect(openTooltip()).toHaveTextContent(longPath));
	});

	it('says that long written content is shortened', async () => {
		const { container } = renderDetails(
			toolCall('workspace_write_file', { path: 'big.ts', content: 'x'.repeat(12001) }, {}),
		);

		expect(screen.getByText('Written content')).toBeVisible();
		expect(screen.getByText('Showing the first 12,000 characters')).toBeVisible();
		await waitFor(() =>
			expect(byTestId(container, 'code-viewer')?.textContent?.length).toBe(12000),
		);
	});

	it('shows the changed lines and line stats of an edit', () => {
		const { container } = renderDetails(
			toolCall(
				'workspace_str_replace_file',
				{
					path: 'src/a.ts',
					replacements: [{ old_str: 'keep\nold', new_str: 'keep\nnew\nmore' }],
				},
				{ success: true },
			),
		);

		expect(screen.getByText('Changes')).toBeVisible();
		const stats = byTestId(container, 'agent-coding-tool-stats');
		expect(stats?.children[0]).toHaveTextContent('+2');
		expect(stats?.children[1]).toHaveTextContent('−1');
		const lines = [...container.querySelectorAll('[data-kind]')].map((line) => [
			line.getAttribute('data-kind'),
			line.textContent,
		]);
		expect(lines).toEqual([
			['context', ' keep'],
			['removed', '−old'],
			['added', '+new'],
			['added', '+more'],
		]);
	});

	it('shows why an edit did not apply, with the result of each replacement', () => {
		const { container } = renderDetails(
			toolCall('workspace_str_replace_file', EDIT_INPUT, {
				success: false,
				error: 'String replacement failed.',
				results: [
					{ index: 0, old_str: 'one', status: 'success' },
					{ index: 1, old_str: 'two', status: 'failed', error: 'Found 2 matches.' },
					{ index: 2, old_str: 'three', status: 'not_attempted' },
				],
			}),
		);

		expect(byTestId(container, 'agent-coding-tool-failure')).toHaveTextContent(
			'String replacement failed. The file did not change.',
		);
		expect(screen.getByText('Requested changes')).toBeVisible();
		expect(screen.queryByText('Changes')).toBeNull();
		expect(byTestId(container, 'agent-coding-tool-stats')).toBeNull();
		const results = [
			...container.querySelectorAll('[data-testid="agent-coding-tool-edit-result"]'),
		].map((result) => [result.getAttribute('data-status'), result.textContent?.trim()]);
		expect(results).toEqual([
			['success', 'Change 1Matched'],
			['failed', 'Change 2FailedFound 2 matches.'],
			['not_attempted', 'Change 3Not tried'],
		]);
		// The requested lines stay, so the user can see what the agent tried to change.
		expect(container.querySelectorAll('[data-kind="added"]')).toHaveLength(3);
	});

	it('shows the error of an edit that failed before it tried a replacement', () => {
		const { container } = renderDetails(
			toolCall('workspace_str_replace_file', EDIT_INPUT, {
				success: false,
				error: 'ENOENT: no such file',
			}),
		);

		expect(byTestId(container, 'agent-coding-tool-failure')).toHaveTextContent(
			'ENOENT: no such file The file did not change.',
		);
		expect(byTestId(container, 'agent-coding-tool-edit-result')).toBeNull();
	});

	it.each([
		['running', TOOL_CALL_STATE.RUNNING],
		['stopped', TOOL_CALL_STATE.CANCELLED],
	])('shows the requested changes of a %s edit without stats or a failure', (_case, state) => {
		const { container } = renderDetails(
			toolCall('workspace_str_replace_file', EDIT_INPUT, undefined, state),
		);

		expect(screen.getByText('Requested changes')).toBeVisible();
		expect(byTestId(container, 'agent-coding-tool-stats')).toBeNull();
		expect(byTestId(container, 'agent-coding-tool-failure')).toBeNull();
	});

	it.each([
		['running', TOOL_CALL_STATE.RUNNING],
		['failed', TOOL_CALL_STATE.ERROR],
		['stopped', TOOL_CALL_STATE.CANCELLED],
	])('does not call the content of a %s write written', async (_case, state) => {
		const { container } = renderDetails(
			toolCall('workspace_write_file', { path: 'a.ts', content: 'export {}' }, undefined, state),
		);

		expect(screen.getByText('Content to write')).toBeVisible();
		expect(screen.queryByText('Written content')).toBeNull();
		await waitFor(() => expect(byTestId(container, 'code-viewer')).toHaveTextContent('export {}'));
	});

	it('shows no content header for a read that failed', () => {
		const { container } = renderDetails(
			toolCall('workspace_read_file', { path: 'missing.ts' }, 'ENOENT', TOOL_CALL_STATE.ERROR),
		);

		expect(screen.getByRole('button', { name: 'Open missing.ts' })).toBeVisible();
		expect(screen.queryByText('File content')).toBeNull();
		// A call that threw shows its error in the step, not here.
		expect(byTestId(container, 'agent-coding-tool-failure')).toBeNull();
	});

	it.each([
		[0, 'success'],
		[2, 'danger'],
	])('shows exit code %i as a %s badge', (exitCode, variant) => {
		const { container } = renderDetails(
			toolCall(
				'workspace_execute_command',
				{ command: 'pnpm test' },
				{ success: exitCode === 0, exitCode, stdout: 'done', stderr: '' },
			),
		);

		const badge = byTestId(container, 'agent-coding-tool-exit-code');
		expect(badge).toHaveTextContent(`Exit code: ${exitCode}`);
		expect(badge).toHaveClass(variant);
		expect(screen.getByText('$ pnpm test')).toBeVisible();
		// The badge tells how the command ended, so there is no extra failure text.
		expect(byTestId(container, 'agent-coding-tool-failure')).toBeNull();
	});

	it('shows the error of a command result that has no exit code', () => {
		const { container } = renderDetails(
			toolCall(
				'workspace_execute_command',
				{ command: 'pnpm test' },
				{
					success: false,
					error: 'The sandbox stopped.',
				},
			),
		);

		expect(byTestId(container, 'agent-coding-tool-failure')).toHaveTextContent(
			'The sandbox stopped.',
		);
		expect(byTestId(container, 'agent-coding-tool-exit-code')).toBeNull();
		expect(screen.getByText('$ pnpm test')).toBeVisible();
	});

	it('treats an exit code that is not a whole number as no exit code, as the step label does', () => {
		const { container } = renderDetails(
			toolCall(
				'workspace_execute_command',
				{ command: 'pnpm test' },
				{ success: false, exitCode: 1.5, error: 'The sandbox stopped.' },
			),
		);

		expect(byTestId(container, 'agent-coding-tool-exit-code')).toBeNull();
		expect(byTestId(container, 'agent-coding-tool-failure')).toHaveTextContent(
			'The sandbox stopped.',
		);
	});

	it('opens long command output at its end', async () => {
		const scrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
		Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
			configurable: true,
			get: () => 700,
		});
		try {
			const { container } = renderDetails(
				toolCall(
					'workspace_execute_command',
					{ command: 'pnpm test' },
					{ exitCode: 1, stdout: 'line\n'.repeat(200), stderr: 'failed' },
				),
			);

			const output = byTestId(container, 'agent-coding-tool-output');
			expect(output).toHaveTextContent(/failed$/);
			await waitFor(() => expect(output?.scrollTop).toBe(700));
		} finally {
			if (scrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', scrollHeight);
		}
	});

	it('shows nothing for a step without a path or a command yet', () => {
		const { container } = renderDetails(toolCall('workspace_execute_command', {}));

		expect(screen.queryByText('Command')).toBeNull();
		expect(container.querySelector('pre')).toBeNull();
	});
});
