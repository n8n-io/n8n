import type { IDataObject } from 'n8n-workflow';

// SAMPLE DATA — wireframe only. What the Tester would draft for an event trigger so
// a workflow can run before anything real arrives. Keyed by node type; a real
// implementation would generate these from the trigger's schema.
const SAMPLE_EVENTS: Record<string, IDataObject> = {
	'n8n-nodes-base.slackTrigger': {
		type: 'team_join',
		team_id: 'T0SAMPLE',
		event_ts: '1756900000.000100',
		user: {
			id: 'U0SAMPLE1',
			team_id: 'T0SAMPLE',
			name: 'priya.raman',
			real_name: 'Priya Raman',
			tz: 'Europe/Berlin',
			is_admin: false,
			is_bot: false,
			profile: {
				real_name: 'Priya Raman',
				display_name: 'priya',
				first_name: 'Priya',
				last_name: 'Raman',
				email: 'priya.raman@acme.example',
				title: 'Customer Success Manager',
			},
		},
	},
	'n8n-nodes-base.gmailTrigger': {
		id: '18f0sample',
		threadId: '18f0sample',
		from: 'Jonas Weber <jonas.weber@acme.example>',
		to: 'billing@yourcompany.example',
		subject: 'Question about invoice INV-2041',
		snippet: 'Hi, could you resend invoice INV-2041 as a PDF? Thanks, Jonas',
		text: 'Hi, could you resend invoice INV-2041 as a PDF? Thanks, Jonas',
		date: '2026-09-03T09:12:00.000Z',
	},
	'n8n-nodes-base.webhook': {
		headers: { 'content-type': 'application/json' },
		params: {},
		query: {},
		body: {
			event: 'order.created',
			orderId: 'ORD-10482',
			customer: 'Mara Lindqvist',
			total: '89.00 EUR',
		},
	},
	'n8n-nodes-base.telegramTrigger': {
		update_id: 900000001,
		message: {
			message_id: 42,
			from: { id: 7000001, first_name: 'Mara', username: 'mara_l' },
			chat: { id: 7000001, type: 'private' },
			date: 1756900000,
			text: 'Hi! What are your opening hours?',
		},
	},
};

const GENERIC_SAMPLE: IDataObject = {
	event: 'sample',
	receivedAt: '2026-09-03T09:12:00.000Z',
	payload: { id: 'SAMPLE-1', name: 'Sample Person', message: 'Hello from a sample event' },
};

export function sampleEventFor(nodeType: string): IDataObject {
	return SAMPLE_EVENTS[nodeType] ?? GENERIC_SAMPLE;
}

/** Every string leaf in a sample event: the values to mark as made up downstream. */
export function stringLeaves(value: unknown, out: string[] = []): string[] {
	if (typeof value === 'string') {
		if (value.trim().length > 2) out.push(value.trim());
	} else if (Array.isArray(value)) {
		for (const v of value) stringLeaves(v, out);
	} else if (value && typeof value === 'object') {
		for (const v of Object.values(value as Record<string, unknown>)) stringLeaves(v, out);
	}
	return out;
}
