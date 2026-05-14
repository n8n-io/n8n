import { describe, it, expect } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { renderComponent } from '@/__tests__/render';
import ExecutionsSessionGroup from './ExecutionsSessionGroup.vue';
import type { ExecutionSummaryWithScopes } from '../../executions.types';

const sessionRows: ExecutionSummaryWithScopes[] = [
	{
		id: 'a',
		mode: 'single-node',
		status: 'success',
		startedAt: new Date('2026-05-13T10:32:00Z').toISOString(),
		caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'a3f24c-session' },
	} as unknown as ExecutionSummaryWithScopes,
	{
		id: 'b',
		mode: 'single-node',
		status: 'error',
		startedAt: new Date('2026-05-13T10:33:00Z').toISOString(),
		caller: { kind: 'mcp', name: 'Claude Desktop', sessionId: 'a3f24c-session' },
	} as unknown as ExecutionSummaryWithScopes,
];

describe('ExecutionsSessionGroup', () => {
	it('leads with the session id and renders the caller kind badge', () => {
		const { getByTestId, getByText } = renderComponent(ExecutionsSessionGroup, {
			props: { sessionId: 'a3f24c-session', executions: sessionRows },
		});
		const header = getByTestId('executions-session-group-header');
		expect(header).toBeVisible();
		// Session id is the leading element of the header label.
		expect(header.textContent).toContain('a3f24c');
		expect(getByText(/MCP/)).toBeVisible();
	});

	it('shows the full session id when it fits within the header length budget', () => {
		const { getByTestId } = renderComponent(ExecutionsSessionGroup, {
			props: { sessionId: 'a3f24c-session', executions: sessionRows },
		});
		const header = getByTestId('executions-session-group-header');
		// 14-char id < 32-char header budget — render verbatim, no ellipsis.
		expect(header.textContent).toContain('a3f24c-session');
		expect(header.textContent).not.toContain('a3f24c…');
	});

	it('exposes the full session id via the title attribute on the id span', () => {
		const { getByTitle } = renderComponent(ExecutionsSessionGroup, {
			props: { sessionId: 'a3f24c-session', executions: sessionRows },
		});
		// Tooltip surface for users to see the untruncated id on hover.
		expect(getByTitle('a3f24c-session')).toBeVisible();
	});

	it('toggles expand/collapse when the chevron is clicked', async () => {
		const { getByTestId, emitted } = renderComponent(ExecutionsSessionGroup, {
			props: { sessionId: 'a3f24c-session', executions: sessionRows },
		});
		await fireEvent.click(getByTestId('executions-session-group-toggle'));
		expect(emitted('toggle')).toBeTruthy();
	});

	it('toggles expand/collapse when the row body is clicked', async () => {
		const { getByTestId, emitted } = renderComponent(ExecutionsSessionGroup, {
			props: { sessionId: 'a3f24c-session', executions: sessionRows },
		});
		await fireEvent.click(getByTestId('executions-session-group-header'));
		expect(emitted('toggle')).toBeTruthy();
	});

	it('toggles expand/collapse on Enter and Space keypresses', async () => {
		const { getByTestId, emitted } = renderComponent(ExecutionsSessionGroup, {
			props: { sessionId: 'a3f24c-session', executions: sessionRows },
		});
		const row = getByTestId('executions-session-group');
		await fireEvent.keyDown(row, { key: 'Enter' });
		await fireEvent.keyDown(row, { key: ' ' });
		const toggleEmits = emitted('toggle') ?? [];
		expect(toggleEmits.length).toBe(2);
	});

	it('exposes aria-expanded that reflects the current state', async () => {
		const { getByTestId } = renderComponent(ExecutionsSessionGroup, {
			// 2 rows < 5 → defaults to expanded.
			props: { sessionId: 'a3f24c-session', executions: sessionRows },
		});
		const row = getByTestId('executions-session-group');
		expect(row.getAttribute('aria-expanded')).toBe('true');
		await fireEvent.click(row);
		expect(row.getAttribute('aria-expanded')).toBe('false');
	});

	it('renders status rollup (1 success / 1 error)', () => {
		const { getByText } = renderComponent(ExecutionsSessionGroup, {
			props: { sessionId: 'a3f24c-session', executions: sessionRows },
		});
		expect(getByText(/1✓/)).toBeVisible();
		expect(getByText(/1✗/)).toBeVisible();
	});
});
