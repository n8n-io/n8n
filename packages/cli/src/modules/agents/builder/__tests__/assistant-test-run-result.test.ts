import {
	buildWouldHaveHappenedPreview,
	formatAssistantTestRunSimulation,
} from '../assistant-test-run-result';

describe('assistant-test-run-result', () => {
	describe('buildWouldHaveHappenedPreview', () => {
		it('extracts email previews including resource-locator fields and recipient lists', () => {
			const preview = buildWouldHaveHappenedPreview('send_email', {
				to: 'alice@example.com, bob@example.com',
				cc: ['carol@example.com'],
				subject: 'Order update',
				body: 'Your order is ready.',
			});

			expect(preview).toEqual({
				kind: 'email',
				toolName: 'send_email',
				to: ['alice@example.com', 'bob@example.com'],
				cc: ['carol@example.com'],
				subject: 'Order update',
				body: 'Your order is ready.',
			});
		});

		it('extracts Slack chat message previews and unwraps resource locators', () => {
			const preview = buildWouldHaveHappenedPreview('Send_Slack', {
				channelId: { __rl: true, mode: 'name', value: '#releases' },
				text: 'The release is out',
			});

			expect(preview).toEqual({
				kind: 'chatMessage',
				toolName: 'Send_Slack',
				channel: '#releases',
				text: 'The release is out',
			});
		});

		it('extracts issue previews and preserves explicit null values', () => {
			const preview = buildWouldHaveHappenedPreview('linear_create_issue', {
				team: 'TRUST',
				title: 'Fix simulation preview',
				assignee: null,
				labels: ['safe-testing'],
			});

			expect(preview).toEqual({
				kind: 'issue',
				toolName: 'linear_create_issue',
				project: 'TRUST',
				title: 'Fix simulation preview',
				assignee: null,
				labels: ['safe-testing'],
			});
		});

		it('extracts calendar event previews', () => {
			const preview = buildWouldHaveHappenedPreview('calendar_create_event', {
				summary: 'Design review',
				startTime: '2026-11-20T10:00:00Z',
				endTime: '2026-11-20T10:30:00Z',
				attendees: ['alice@example.com'],
			});

			expect(preview).toEqual({
				kind: 'calendarEvent',
				toolName: 'calendar_create_event',
				title: 'Design review',
				start: '2026-11-20T10:00:00Z',
				end: '2026-11-20T10:30:00Z',
				attendees: ['alice@example.com'],
			});
		});

		it('extracts table row previews', () => {
			const preview = buildWouldHaveHappenedPreview('sheets_append_row', {
				sheetName: 'Leads',
				columns: { Name: 'Alice', Status: 'New' },
			});

			expect(preview).toEqual({
				kind: 'tableRow',
				toolName: 'sheets_append_row',
				table: 'Leads',
				columns: { Name: 'Alice', Status: 'New' },
			});
		});

		it('falls back to generic preview for unrecognized tools', () => {
			const preview = buildWouldHaveHappenedPreview('custom_crm_sync', {
				accountId: 'acc-42',
				dryRun: true,
			});

			expect(preview).toEqual({
				kind: 'generic',
				toolName: 'custom_crm_sync',
				input: { accountId: 'acc-42', dryRun: true },
			});
		});
	});

	describe('formatAssistantTestRunSimulation', () => {
		it('attaches previews only to simulated calls and preserves blocked and local calls', () => {
			const formatted = formatAssistantTestRunSimulation({
				worldId: 'world-1',
				toolCalls: [
					{
						toolCallId: 'tc-email',
						toolName: 'send_email',
						route: 'simulated_made_up',
						reason: 'invented_by_llm',
						input: { to: 'user@example.com', subject: 'Hello', body: 'World' },
					},
					{
						toolCallId: 'tc-slack',
						toolName: 'Send_Slack',
						route: 'simulated',
						reason: 'served_from_world',
						evidence: ['world_write'],
						input: { channel: '#ops', text: 'Deployed' },
					},
					{
						toolCallId: 'tc-blocked',
						toolName: 'run_code',
						route: 'blocked',
						reason: 'not_simulatable',
						detail: 'Custom code cannot run in a test run.',
						input: { code: 'return 1;' },
					},
				],
				localToolCalls: [{ toolCallId: 'tc-local', toolName: 'load_skill' }],
			});

			expect(formatted).toEqual({
				worldId: 'world-1',
				toolCalls: [
					{
						toolCallId: 'tc-email',
						toolName: 'send_email',
						route: 'simulated_made_up',
						reason: 'invented_by_llm',
						preview: {
							kind: 'email',
							toolName: 'send_email',
							to: ['user@example.com'],
							subject: 'Hello',
							body: 'World',
						},
					},
					{
						toolCallId: 'tc-slack',
						toolName: 'Send_Slack',
						route: 'simulated',
						reason: 'served_from_world',
						evidence: ['world_write'],
						preview: {
							kind: 'chatMessage',
							toolName: 'Send_Slack',
							channel: '#ops',
							text: 'Deployed',
						},
					},
					{
						toolCallId: 'tc-blocked',
						toolName: 'run_code',
						route: 'blocked',
						reason: 'not_simulatable',
						detail: 'Custom code cannot run in a test run.',
					},
				],
				localToolCalls: [{ toolCallId: 'tc-local', toolName: 'load_skill' }],
			});
		});

		it('returns an empty toolCalls list when simulation metadata is absent', () => {
			expect(formatAssistantTestRunSimulation(undefined)).toEqual({ toolCalls: [] });
		});
	});
});
