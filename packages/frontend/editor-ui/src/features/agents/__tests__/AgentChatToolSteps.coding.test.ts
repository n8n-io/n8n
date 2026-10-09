import { cleanup, render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import AgentChatToolSteps from '../components/AgentChatToolSteps.vue';
import { TOOL_CALL_STATE } from '../constants';
import { CODING_OPEN_FILE } from '../utils/coding-review';

vi.mock('../composables/useSubAgentNames', () => ({
	useSubAgentNames: () => ({ subAgentNameById: { value: new Map() } }),
}));
// `__esModule` lets the async component loader read the default export.
vi.mock('../components/AgentCustomToolViewer.vue', () => ({
	__esModule: true,
	default: { props: ['code'], template: '<pre>{{ code }}</pre>' },
}));

afterEach(() => {
	cleanup();
});

const LONG_PATH = 'packages/frontend/editor-ui/src/features/agents/components/AgentCodingDiff.vue';
const EDIT_FAILED = {
	success: false,
	error: 'String replacement failed.',
	results: [
		{ index: 0, old_str: 'a', status: 'failed', error: 'No exact match found for str_replace.' },
	],
};

/** Reka UI opens a tooltip on a mouse `pointermove` over its trigger. */
function hover(element: Element) {
	element.dispatchEvent(
		new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerType: 'mouse' }),
	);
}

function warningIcon(container: Element) {
	return container.querySelector('[data-icon="triangle-alert"]');
}

/** The open tooltip, which Reka UI renders outside the component. */
function openTooltip() {
	return document.querySelector('[data-dismissable-layer]');
}

function byTestId(id: string) {
	return document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
}

function call(tool: string, input: unknown, overrides: Partial<ToolCall> = {}): ToolCall {
	return { toolCallId: tool, tool, input, state: TOOL_CALL_STATE.DONE, ...overrides };
}

function renderSteps(toolCalls: ToolCall[], codingView = true) {
	return render(AgentChatToolSteps, {
		props: { toolCalls, projectId: 'project-1' },
		global: { provide: codingView ? { [CODING_OPEN_FILE]: vi.fn() } : {} },
	});
}

/** Several steps sit in a collapsed group; open it to see each step. */
async function renderGroup(toolCalls: ToolCall[]) {
	const result = renderSteps(toolCalls);
	await userEvent.click(screen.getByText(`${toolCalls.length} tool calls`));
	return result;
}

const finishedSteps = [
	call('workspace_read_file', { path: 'AGENTS.md' }, { output: { content: '# Rules' } }),
	call(
		'workspace_str_replace_file',
		{ path: 'src/lib/dates.ts', replacements: [{ old_str: 'a', new_str: 'b\nc' }] },
		{ output: { success: true } },
	),
	call('workspace_write_file', { path: 'src/new.ts', content: 'x\ny\n' }, { output: {} }),
	call(
		'workspace_execute_command',
		{ command: 'pnpm typecheck && pnpm test' },
		{ output: { exitCode: 0, stdout: 'ok', stderr: '' } },
	),
];

describe('AgentChatToolSteps in the coding view', () => {
	it('names what each step did', async () => {
		await renderGroup(finishedSteps);

		expect(screen.getByText('Read AGENTS.md')).toBeVisible();
		expect(screen.getByText('Edited src/lib/dates.ts +2 −1')).toBeVisible();
		expect(screen.getByText('Wrote src/new.ts (2 lines)')).toBeVisible();
		expect(screen.getByText('Ran pnpm typecheck && pnpm test')).toBeVisible();
	});

	it('shortens a long path and keeps the full step name on the step button', async () => {
		const { container } = renderSteps([call('workspace_read_file', { path: LONG_PATH })]);

		const label = screen.getByText(/^Read packages\/.*…\/AgentCodingDiff\.vue$/);
		const step = screen.getByRole('button', { name: `Read ${LONG_PATH}` });
		expect(step).toContainElement(label);
		// The details below the step have no tooltip with the step name.
		expect(container.querySelector(`[title="Read ${LONG_PATH}"]`)).toBeNull();

		hover(label);
		await waitFor(() => expect(openTooltip()).toHaveTextContent(`Read ${LONG_PATH}`));
	});

	it('has no tooltip for a step name that is not shortened', () => {
		renderSteps([call('workspace_read_file', { path: 'a.ts' })]);

		hover(screen.getByText('Read a.ts'));

		expect(screen.getByRole('button', { name: 'Read a.ts' })).not.toHaveAttribute('aria-label');
		expect(openTooltip()).toBeNull();
	});

	it('says that an edit did not apply, and shows why in its details', async () => {
		const { container } = renderSteps([
			call(
				'workspace_str_replace_file',
				{ path: 'src/lib/dates.ts', replacements: [{ old_str: 'a', new_str: 'b\nc' }] },
				{ output: EDIT_FAILED },
			),
		]);

		expect(screen.queryByText(/^Edited/)).toBeNull();
		expect(warningIcon(container)).not.toBeNull();
		await userEvent.click(screen.getByText('Could not edit src/lib/dates.ts'));

		await waitFor(() =>
			expect(byTestId('agent-coding-tool-failure')).toHaveTextContent(
				'String replacement failed. The file did not change.',
			),
		);
		// The details show the failure, so the step does not repeat it.
		expect(within(container).getAllByText(/String replacement failed/)).toHaveLength(1);
		expect(screen.getByText('No exact match found for str_replace.')).toBeVisible();
		expect(byTestId('agent-coding-tool-stats')).toBeNull();
	});

	it('says that a step could not read a file and shows the error', async () => {
		const { container } = renderSteps([
			call(
				'workspace_read_file',
				{ path: 'missing.ts' },
				{ state: TOOL_CALL_STATE.ERROR, output: 'ENOENT: missing.ts' },
			),
		]);

		expect(warningIcon(container)).not.toBeNull();
		await userEvent.click(screen.getByText('Could not read missing.ts'));

		expect(await screen.findByText('ENOENT: missing.ts')).toBeVisible();
		expect(screen.queryByText('File content')).toBeNull();
	});

	it('says that a stopped command stopped, without a warning', () => {
		const { container } = renderSteps([
			call(
				'workspace_execute_command',
				{ command: 'pnpm test' },
				{ state: TOOL_CALL_STATE.CANCELLED },
			),
		]);

		expect(screen.getByText('Stopped pnpm test')).toBeVisible();
		expect(screen.queryByText('Ran pnpm test')).toBeNull();
		expect(warningIcon(container)).toBeNull();
	});

	it('marks a command that ran and failed with a warning and its exit code', async () => {
		const { container } = renderSteps([
			call(
				'workspace_execute_command',
				{ command: 'pnpm test' },
				{ output: { success: false, exitCode: 1, stdout: '', stderr: '1 test failed' } },
			),
		]);

		expect(screen.getByText('Ran pnpm test')).toBeVisible();
		const icon = warningIcon(container);
		expect(icon).not.toBeNull();
		hover(icon as Element);
		await waitFor(() => expect(openTooltip()).toHaveTextContent('Exit code: 1'));

		await userEvent.click(screen.getByText('Ran pnpm test'));
		await waitFor(() =>
			expect(byTestId('agent-coding-tool-exit-code')).toHaveTextContent('Exit code: 1'),
		);
		// The badge tells the exit code, so the step adds no callout with the same text.
		expect(within(container).getAllByText('Exit code: 1')).toHaveLength(1);
	});

	it('keeps an open step open when it finishes', async () => {
		const running = call(
			'workspace_execute_command',
			{ command: 'pnpm test' },
			{ state: TOOL_CALL_STATE.RUNNING },
		);
		const { rerender } = await renderGroup([finishedSteps[0], running]);

		await userEvent.click(screen.getByText('Running pnpm test'));
		expect(screen.getByText('$ pnpm test')).toBeVisible();

		await rerender({
			toolCalls: [
				finishedSteps[0],
				{ ...running, state: TOOL_CALL_STATE.DONE, output: { exitCode: 3 } },
			],
			projectId: 'project-1',
		});

		expect(screen.getByText('Ran pnpm test')).toBeVisible();
		expect(screen.getByText('$ pnpm test')).toBeVisible();
		expect(screen.getByText('Exit code: 3')).toBeVisible();
	});

	it('keeps the generic names outside the coding view', () => {
		renderSteps([finishedSteps[0]], false);

		expect(screen.queryByText('Read AGENTS.md')).toBeNull();
		expect(screen.getByText('Workspace read file')).toBeVisible();
	});
});
