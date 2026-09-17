export const OEM_PROTOTYPE_TICKETS = {
	'API-317': {
		titleKey: 'oemPrototype.api317.title',
		linearUrl:
			'https://linear.app/n8n/issue/API-317/display-n8n-logo-on-canvas-when-n8n-canvas-only-is-enabled#comment-d290240d',
	},
	'API-305': {
		titleKey: 'oemPrototype.api305.title',
		linearUrl:
			'https://linear.app/n8n/issue/API-305/add-mechanism-to-enforce-airgapped-usage-reporting-via-license-feature#comment-3207db55',
	},
} as const;

export const OEM_PROTOTYPE_WARNING_REAPPEAR_DELAY = 2000;

export type OemPrototypeTicket = keyof typeof OEM_PROTOTYPE_TICKETS;

export function isOemPrototypeTicket(ticket: unknown): ticket is OemPrototypeTicket {
	return typeof ticket === 'string' && ticket in OEM_PROTOTYPE_TICKETS;
}
