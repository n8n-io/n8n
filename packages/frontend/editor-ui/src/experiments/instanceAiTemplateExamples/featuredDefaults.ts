import type { IInstanceAiExampleWorkflow } from '@n8n/rest-api-client/api/templates';
import { NODE_ICONS } from './nodeIcons';

export const FEATURED_DEFAULTS: IInstanceAiExampleWorkflow[] = [
	{
		id: 900001,
		name: 'Auto-extract invoice details from Gmail and flag discrepancies',
		nodes: [
			{
				name: 'n8n-nodes-base.gmail',
				displayName: 'Gmail',
				iconData: { type: 'file', fileBuffer: NODE_ICONS['n8n-nodes-base.gmail'] },
			},
			{
				name: 'n8n-nodes-base.googleSheets',
				displayName: 'Google Sheets',
				iconData: { type: 'file', fileBuffer: NODE_ICONS['n8n-nodes-base.googleSheets'] },
			},
			{
				name: 'n8n-nodes-base.googleCalendar',
				displayName: 'Google Calendar',
				iconData: { type: 'file', fileBuffer: NODE_ICONS['n8n-nodes-base.googleCalendar'] },
			},
		],
		category: '',
		subcategory: '',
		relevanceScore: 5,
		prompt:
			'Every morning, scan Gmail for new invoices, use Claude to extract details and cross-check them against purchase orders in Google Sheets, flag any discrepancies for review, and add all payment due dates to Google Calendar automatically.',
	},
	{
		id: 900002,
		name: 'Research and score new leads then assign to sales reps',
		nodes: [
			{
				name: 'n8n-nodes-base.hubspot',
				displayName: 'HubSpot',
				iconData: { type: 'file', fileBuffer: NODE_ICONS['n8n-nodes-base.hubspot'] },
			},
		],
		category: '',
		subcategory: '',
		relevanceScore: 5,
		prompt:
			'When a new lead fills in our contact form, use Claude to research their company online, score their fit based on size, industry, and intent, draft a personalised first-touch reply, and assign them to the right sales rep in HubSpot based on region and product interest.',
	},
	{
		id: 900003,
		name: 'AI WhatsApp support bot with FAQ lookup and ticket creation',
		nodes: [
			{
				name: 'n8n-nodes-base.whatsApp',
				displayName: 'WhatsApp',
				iconData: { type: 'file', fileBuffer: NODE_ICONS['n8n-nodes-base.whatsApp'] },
			},
			{
				name: 'n8n-nodes-base.googleSheets',
				displayName: 'Google Sheets',
				iconData: { type: 'file', fileBuffer: NODE_ICONS['n8n-nodes-base.googleSheets'] },
			},
			{
				name: 'n8n-nodes-base.notion',
				displayName: 'Notion',
				iconData: { type: 'file', fileBuffer: NODE_ICONS['n8n-nodes-base.notion'] },
			},
			{
				name: 'n8n-nodes-base.slack',
				displayName: 'Slack',
				iconData: { type: 'file', fileBuffer: NODE_ICONS['n8n-nodes-base.slack'] },
			},
		],
		category: '',
		subcategory: '',
		relevanceScore: 5,
		prompt:
			'When a customer sends a WhatsApp message, use Claude to match their question against our FAQ in Google Sheets and reply instantly. If it cannot resolve it, create a support ticket in Notion and alert the team on Slack.',
	},
	{
		id: 900004,
		name: 'AI-powered weekly social media content scheduler',
		nodes: [
			{
				name: 'n8n-nodes-base.googleSheets',
				displayName: 'Google Sheets',
				iconData: { type: 'file', fileBuffer: NODE_ICONS['n8n-nodes-base.googleSheets'] },
			},
		],
		category: '',
		subcategory: '',
		relevanceScore: 5,
		prompt:
			"Every Monday, read this week's content ideas from a Google Sheet, use Claude to write tailored captions for LinkedIn, Instagram, and X, then schedule them to post throughout the week.",
	},
];
