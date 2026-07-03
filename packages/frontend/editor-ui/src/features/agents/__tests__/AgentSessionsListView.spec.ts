/* eslint-disable import-x/no-extraneous-dependencies -- test-only source assertion */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(
	resolve(dirname(fileURLToPath(import.meta.url)), '../views/AgentSessionsListView.vue'),
	'utf8',
);

describe('AgentSessionsListView', () => {
	it('can defer outer padding to the builder tab panel when embedded', () => {
		expect(componentSource).toContain('embedded?: boolean');
		expect(componentSource).toContain('{ [$style.embedded]: props.embedded }');
		expect(componentSource).toContain('.embedded');
		expect(componentSource).toContain('padding: 0;');
	});

	it('renders sessions as a headerless list without exposing session IDs', () => {
		expect(componentSource).not.toContain('<thead>');
		expect(componentSource).not.toContain('thread.sessionNumber');
		expect(componentSource).not.toContain("i18n.baseText('agentSessions.sessionId')");
		expect(componentSource).toContain('data-test-id="agent-session-title"');
		expect(componentSource).toContain('data-test-id="agent-session-origin-pill"');
		expect(componentSource).toContain('data-test-id="agent-session-updated-at"');
		expect(componentSource).toContain('data-test-id="agent-session-token-usage"');
		expect(componentSource).toContain('data-test-id="agent-session-duration"');
	});

	it('shows all session origins in an icon pill', () => {
		expect(componentSource).toContain("i18n.baseText('agentSessions.origin.subAgent')");
		expect(componentSource).toContain("i18n.baseText('agentSessions.origin.task')");
		expect(componentSource).toContain("i18n.baseText('agentSessions.origin.agent')");
		expect(componentSource).toContain('icon="zap"');
	});

	it('uses the sessions row typography from the agent design', () => {
		expect(componentSource).toMatch(
			/\.sessionTitle\s*{[^}]*color: var\(--text-color\);[^}]*font-size: var\(--font-size--sm\);[^}]*font-weight: var\(--font-weight--medium\);/s,
		);
		expect(componentSource).toMatch(
			/\.originPill\s*{[^}]*color: var\(--text-color\);[^}]*font-size: var\(--font-size--sm\);[^}]*font-weight: var\(--font-weight--medium\);/s,
		);
		expect(componentSource).toMatch(
			/\.clickableRow\s*{[^}]*td\s*{[^}]*color: var\(--text-color--subtler\);/s,
		);
	});
});
