import incidentHandler from '@deep-consulting-solutions/incident-handling';
import type { Incident } from '@deep-consulting-solutions/incident-handling';

export const createIncidentLog = async (
	data: Incident,
	extras?: Record<string, never>,
	createCustomTicketSubject?: (defaultTitle: string) => string,
) => {
	await incidentHandler.logIncident(data, extras, {
		createCustomTicketSubject,
	});
};
