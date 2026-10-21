// Experiment cleanup (124_workflow_previews_above_assistant)
import type { WorkflowPreviewExample } from './types';

export const WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_SUGGESTIONS_VERSION =
	'v5-workflow-previews-above-assistant';

export const WORKFLOW_PREVIEW_EXAMPLES: [WorkflowPreviewExample, ...WorkflowPreviewExample[]] = [
	{
		id: 'score-my-leads',
		titleKey: 'experiments.workflowPreviewsAboveAssistant.examples.scoreMyLeads.title',
		promptKey: 'experiments.workflowPreviewsAboveAssistant.examples.scoreMyLeads.prompt',
		start: 'event',
		nodes: [
			{
				id: 'salesforce-trigger',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.newLead',
				icon: 'salesforce',
				position: { x: 48, y: 168 },
			},
			{
				id: 'lemlist',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.enrichLead',
				icon: 'lemlist',
				position: { x: 272, y: 168 },
			},
			{
				id: 'score',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.score',
				icon: 'code-node',
				position: { x: 496, y: 168 },
			},
			{
				id: 'if-qualified',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.isQualified',
				icon: 'if',
				position: { x: 720, y: 168 },
			},
			{
				id: 'update-lead',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.updateLead',
				icon: 'salesforce',
				position: { x: 944, y: 72 },
			},
			{
				id: 'notify-sales',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.notifySales',
				icon: 'slack',
				position: { x: 944, y: 264 },
			},
		],
		connections: [
			{ source: 'salesforce-trigger', target: 'lemlist' },
			{ source: 'lemlist', target: 'score' },
			{ source: 'score', target: 'if-qualified' },
			{ source: 'if-qualified', target: 'update-lead' },
			{ source: 'if-qualified', target: 'notify-sales' },
		],
		inputVisualization: {
			type: 'salesforce-card',
			icon: 'salesforce',
			titleKey: 'experiments.workflowPreviewsAboveAssistant.visualizations.newLead.title',
			subtitleKey: 'experiments.workflowPreviewsAboveAssistant.visualizations.newLead.subtitle',
		},
		outputVisualizations: [
			{
				type: 'salesforce-card',
				targetNodeId: 'update-lead',
				icon: 'salesforce',
				titleKey: 'experiments.workflowPreviewsAboveAssistant.visualizations.leadScored.title',
				subtitleKey:
					'experiments.workflowPreviewsAboveAssistant.visualizations.leadScored.subtitle',
			},
			{
				type: 'slack-message',
				targetNodeId: 'notify-sales',
				senderKey: 'experiments.workflowPreviewsAboveAssistant.visualizations.qualifiedLead.sender',
				messageKey:
					'experiments.workflowPreviewsAboveAssistant.visualizations.qualifiedLead.message',
			},
		],
		iconCycle: {
			nodeIds: ['salesforce-trigger', 'update-lead'],
			icons: ['salesforce', 'pipedrive', 'hubspot'],
		},
		card: {
			quoteKey: 'experiments.workflowPreviewsAboveAssistant.examples.scoreMyLeads.quote',
		},
	},
	{
		id: 'schedule-social-posts',
		titleKey: 'experiments.workflowPreviewsAboveAssistant.examples.scheduleSocialPosts.title',
		promptKey: 'experiments.workflowPreviewsAboveAssistant.examples.scheduleSocialPosts.prompt',
		start: 'schedule',
		nodes: [
			{
				id: 'schedule',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.everyMonday',
				icon: 'clock',
				position: { x: 48, y: 168 },
			},
			{
				id: 'scrape',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.scrapeIdeas',
				icon: 'firecrawl',
				position: { x: 272, y: 168 },
			},
			{
				id: 'sheets',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.readIdeas',
				icon: 'google-sheets',
				position: { x: 496, y: 168 },
			},
			{
				id: 'gemini',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.generatePost',
				icon: 'gemini',
				position: { x: 720, y: 168 },
			},
			{
				id: 'post-x',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.postToX',
				icon: 'x',
				position: { x: 944, y: 0 },
			},
			{
				id: 'post-linkedin',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.postToLinkedin',
				icon: 'linkedin',
				position: { x: 944, y: 168 },
			},
			{
				id: 'post-reddit',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.postToReddit',
				icon: 'reddit',
				position: { x: 944, y: 336 },
			},
		],
		connections: [
			{ source: 'schedule', target: 'scrape' },
			{ source: 'scrape', target: 'sheets' },
			{ source: 'sheets', target: 'gemini' },
			{ source: 'gemini', target: 'post-x' },
			{ source: 'gemini', target: 'post-linkedin' },
			{ source: 'gemini', target: 'post-reddit' },
		],
		outputVisualizations: [
			{
				type: 'salesforce-card',
				targetNodeId: 'post-x',
				icon: 'x',
				titleKey: 'experiments.workflowPreviewsAboveAssistant.visualizations.scheduledToX.title',
				subtitleKey:
					'experiments.workflowPreviewsAboveAssistant.visualizations.scheduledToX.subtitle',
			},
			{
				type: 'salesforce-card',
				targetNodeId: 'post-linkedin',
				icon: 'linkedin',
				titleKey:
					'experiments.workflowPreviewsAboveAssistant.visualizations.scheduledToLinkedin.title',
				subtitleKey:
					'experiments.workflowPreviewsAboveAssistant.visualizations.scheduledToLinkedin.subtitle',
			},
			{
				type: 'salesforce-card',
				targetNodeId: 'post-reddit',
				icon: 'reddit',
				titleKey:
					'experiments.workflowPreviewsAboveAssistant.visualizations.scheduledToReddit.title',
				subtitleKey:
					'experiments.workflowPreviewsAboveAssistant.visualizations.scheduledToReddit.subtitle',
			},
		],
		card: {
			quoteKey: 'experiments.workflowPreviewsAboveAssistant.examples.scheduleSocialPosts.quote',
		},
	},
	{
		id: 'process-invoices',
		titleKey: 'experiments.workflowPreviewsAboveAssistant.examples.processInvoices.title',
		promptKey: 'experiments.workflowPreviewsAboveAssistant.examples.processInvoices.prompt',
		start: 'event',
		nodes: [
			{
				id: 'gmail-trigger',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.invoiceReceived',
				icon: 'gmail',
				position: { x: 48, y: 168 },
			},
			{
				id: 'claude',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.extractAndCrossCheck',
				icon: 'anthropic',
				position: { x: 272, y: 168 },
			},
			{
				id: 'if-discrepancy',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.discrepancy',
				icon: 'if',
				position: { x: 496, y: 168 },
			},
			{
				id: 'flag-invoice',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.flagInvoice',
				icon: 'google-sheets',
				position: { x: 720, y: 72 },
			},
			{
				id: 'add-calendar',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.addToCalendar',
				icon: 'google-calendar',
				position: { x: 720, y: 264 },
			},
		],
		connections: [
			{ source: 'gmail-trigger', target: 'claude' },
			{ source: 'claude', target: 'if-discrepancy' },
			{ source: 'if-discrepancy', target: 'flag-invoice' },
			{ source: 'if-discrepancy', target: 'add-calendar' },
		],
		inputVisualization: {
			type: 'salesforce-card',
			icon: 'gmail',
			titleKey: 'experiments.workflowPreviewsAboveAssistant.visualizations.invoiceReceived.title',
			subtitleKey:
				'experiments.workflowPreviewsAboveAssistant.visualizations.invoiceReceived.subtitle',
		},
		outputVisualizations: [
			{ type: 'invoice-spreadsheet', targetNodeId: 'flag-invoice' },
			{
				type: 'salesforce-card',
				targetNodeId: 'add-calendar',
				icon: 'google-calendar',
				titleKey: 'experiments.workflowPreviewsAboveAssistant.visualizations.eventCreated.title',
				subtitleKey:
					'experiments.workflowPreviewsAboveAssistant.visualizations.eventCreated.subtitle',
			},
		],
		card: {
			quoteKey: 'experiments.workflowPreviewsAboveAssistant.examples.processInvoices.quote',
		},
	},
	{
		id: 'triage-support-inbox',
		titleKey: 'experiments.workflowPreviewsAboveAssistant.examples.triageSupportInbox.title',
		promptKey: 'experiments.workflowPreviewsAboveAssistant.examples.triageSupportInbox.prompt',
		start: 'event',
		nodes: [
			{
				id: 'gmail-trigger',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.emailReceived',
				icon: 'gmail',
				position: { x: 48, y: 168 },
			},
			{
				id: 'classify',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.classifyIntent',
				icon: 'text-classifier',
				position: { x: 272, y: 168 },
			},
			{
				id: 'route',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.route',
				icon: 'switch',
				position: { x: 496, y: 168 },
			},
			{
				id: 'escalate',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.escalate',
				icon: 'slack',
				position: { x: 720, y: 72 },
			},
			{
				id: 'draft-reply',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.draftReply',
				icon: 'anthropic',
				position: { x: 720, y: 264 },
			},
			{
				id: 'send-reply',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.sendReply',
				icon: 'gmail',
				position: { x: 944, y: 264 },
			},
		],
		connections: [
			{ source: 'gmail-trigger', target: 'classify' },
			{ source: 'classify', target: 'route' },
			{ source: 'route', target: 'escalate' },
			{ source: 'route', target: 'draft-reply' },
			{ source: 'draft-reply', target: 'send-reply' },
		],
		card: {
			quoteKey: 'experiments.workflowPreviewsAboveAssistant.examples.triageSupportInbox.quote',
		},
	},
	{
		id: 'daily-news-digest',
		titleKey: 'experiments.workflowPreviewsAboveAssistant.examples.dailyNewsDigest.title',
		promptKey: 'experiments.workflowPreviewsAboveAssistant.examples.dailyNewsDigest.prompt',
		start: 'schedule',
		nodes: [
			{
				id: 'schedule',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.everyMorning',
				icon: 'clock',
				position: { x: 48, y: 168 },
			},
			{
				id: 'read-feeds',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.readFeeds',
				icon: 'rss-read',
				position: { x: 272, y: 168 },
			},
			{
				id: 'keep-relevant',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.keepRelevant',
				icon: 'filter',
				position: { x: 496, y: 168 },
			},
			{
				id: 'summarize',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.summarize',
				icon: 'gemini',
				position: { x: 720, y: 168 },
			},
			{
				id: 'email-digest',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.emailDigest',
				icon: 'gmail',
				position: { x: 944, y: 72 },
			},
			{
				id: 'post-digest',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.postToSlack',
				icon: 'slack',
				position: { x: 944, y: 264 },
			},
		],
		connections: [
			{ source: 'schedule', target: 'read-feeds' },
			{ source: 'read-feeds', target: 'keep-relevant' },
			{ source: 'keep-relevant', target: 'summarize' },
			{ source: 'summarize', target: 'email-digest' },
			{ source: 'summarize', target: 'post-digest' },
		],
		card: {
			quoteKey: 'experiments.workflowPreviewsAboveAssistant.examples.dailyNewsDigest.quote',
		},
	},
	{
		id: 'onboard-new-signups',
		titleKey: 'experiments.workflowPreviewsAboveAssistant.examples.onboardNewSignups.title',
		promptKey: 'experiments.workflowPreviewsAboveAssistant.examples.onboardNewSignups.prompt',
		start: 'event',
		nodes: [
			{
				id: 'form-trigger',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.formSubmitted',
				icon: 'form-trigger',
				position: { x: 48, y: 168 },
			},
			{
				id: 'create-contact',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.createContact',
				icon: 'hubspot',
				position: { x: 272, y: 168 },
			},
			{
				id: 'wait',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.waitADay',
				icon: 'wait',
				position: { x: 496, y: 168 },
			},
			{
				id: 'welcome-email',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.welcomeEmail',
				icon: 'gmail',
				position: { x: 720, y: 168 },
			},
			{
				id: 'notify-team',
				labelKey: 'experiments.workflowPreviewsAboveAssistant.nodes.notifyTeam',
				icon: 'slack',
				position: { x: 944, y: 168 },
			},
		],
		connections: [
			{ source: 'form-trigger', target: 'create-contact' },
			{ source: 'create-contact', target: 'wait' },
			{ source: 'wait', target: 'welcome-email' },
			{ source: 'welcome-email', target: 'notify-team' },
		],
		iconCycle: {
			nodeIds: ['create-contact'],
			icons: ['hubspot', 'salesforce', 'pipedrive'],
		},
		card: {
			quoteKey: 'experiments.workflowPreviewsAboveAssistant.examples.onboardNewSignups.quote',
		},
	},
];

/** The three examples shown above the composer. The catalog shows all of them. */
export const FEATURED_WORKFLOW_PREVIEW_EXAMPLES = WORKFLOW_PREVIEW_EXAMPLES.slice(0, 3);
