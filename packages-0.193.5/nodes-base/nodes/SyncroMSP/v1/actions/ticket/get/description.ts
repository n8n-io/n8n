import { TicketProperties } from '../../Interfaces';

export const ticketGetDescription: TicketProperties = [
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['get'],
			},
		},
		default: '',
		description: 'Get specific customer by ID',
	},
];
