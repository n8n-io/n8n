import { cleanup, render, screen } from '@testing-library/vue';
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

function call(
	id: string,
	tool: string,
	input: unknown,
	output?: unknown,
	state: ToolCall['state'] = TOOL_CALL_STATE.DONE,
): ToolCall {
	return { toolCallId: id, tool, input, output, state };
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
	call('read', 'workspace_read_file', { path: 'AGENTS.md' }, { content: '# Rules' }),
	call(
		'edit',
		'workspace_str_replace_file',
		{ path: 'src/lib/dates.ts', replacements: [{ old_str: 'a', new_str: 'b\nc' }] },
		{ success: true },
	),
	call('write', 'workspace_write_file', { path: 'src/new.ts', content: 'x\ny\n' }, {}),
	call(
		'run',
		'workspace_execute_command',
		{ command: 'pnpm typecheck && pnpm test' },
		{ exitCode: 0, stdout: 'ok', stderr: '' },
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

	it('shortens a long path and keeps the full step name as a tooltip', () => {
		const { container } = renderSteps([call('read', 'workspace_read_file', { path: LONG_PATH })]);

		const label = screen.getByText(/^Read packages\/.*…\/AgentCodingDiff\.vue$/);
		expect(label).toBeVisible();
		expect(container.querySelector(`[title="Read ${LONG_PATH}"]`)).not.toBeNull();
	});

	it('has no tooltip for a step name that is not shortened', () => {
		const { container } = renderSteps([call('read', 'workspace_read_file', { path: 'a.ts' })]);

		expect(container.querySelector('[title]')).toBeNull();
	});

	it('keeps an open step open when it finishes', async () => {
		const running = call(
			'run',
			'workspace_execute_command',
			{ command: 'pnpm test' },
			undefined,
			TOOL_CALL_STATE.RUNNING,
		);
		const { rerender } = await renderGroup([finishedSteps[0], running]);

		await userEvent.click(screen.getByText('Running pnpm test'));
		expect(screen.getByText('$ pnpm test')).toBeVisible();

		await rerender({
			toolCalls: [finishedSteps[0], { ...running, state: TOOL_CALL_STATE.DONE, output: { exitCode: 3 } }],
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
