import incidentHandler from '@deep-consulting-solutions/incident-handling';
import type { Incident } from '@deep-consulting-solutions/incident-handling';
import type { INode } from 'n8n-workflow';

export const generateCreateCustomTicketSubjectFn = (nodes: INode[]) => {
	const isScheduleTriggerOrNocoDBAuthWebhook = nodes.some((node: INode) => {
		if (node.name === 'Schedule Trigger') {
			return true;
		}
		if (node.name === 'Webhook' && node.parameters.authentication === 'nocoDBWebhookAuth') {
			return true;
		}
		return false;
	});

	return (defaultTitle: string) => {
		return isScheduleTriggerOrNocoDBAuthWebhook
			? `System triggered - ${defaultTitle}`
			: defaultTitle;
	};
};

export const createIncidentLog = async (
	data: Incident,
	extras?: Record<string, any>,
	createCustomTicketSubject?: (defaultTitle: string) => string,
) => {
	console.log('Creating Incident Log...');
	try {
		await incidentHandler.logIncident(data, extras, {
			createCustomTicketSubject,
		});
	} catch (error) {
		console.log('ERROR while creating Incident Log:', error);
		throw error;
	}
};
