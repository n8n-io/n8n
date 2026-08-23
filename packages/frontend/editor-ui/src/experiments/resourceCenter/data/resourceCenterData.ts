/**
 * Resource Center Data
 * Ordered content definitions aligned with the current Notion source
 */

export type ResourceType = 'template' | 'video' | 'ready-to-run';

export interface ResourceItem {
	id: string | number;
	type: ResourceType;
	title: string;
	description: string;
	section?: 'quick-start' | 'inspiration' | 'learn';
	// Template-specific
	templateId?: number;
	nodeTypes?: string[];
	// Video-specific
	videoId?: string;
	url?: string;
	duration?: string;
	level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Masterclass';
	// Ready-to-run-specific
	quickStartId?: string;
	// Shared
	nodeCount?: number;
	setupTime?: string;
}

export interface YouTubeVideo {
	videoId: string;
	title: string;
	description: string;
	duration?: string;
	level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Masterclass';
	author?: string;
	url?: string;
}

export interface OrderedTemplateResource {
	type: 'template';
	templateId: number;
	title: string;
}

export interface OrderedVideoResource extends YouTubeVideo {
	type: 'video';
}

export type OrderedSectionResource = OrderedTemplateResource | OrderedVideoResource;

const getTemplateIds = (items: OrderedSectionResource[]): number[] =>
	items.flatMap((item) => (item.type === 'template' ? [item.templateId] : []));

// Get Inspired Section - ordered to match the current Notion source
export const getInspiredContent: OrderedSectionResource[] = [
	{
		type: 'template',
		templateId: 10427,
		title: 'Analyse Facebook Ads automatically',
	},
	{
		type: 'video',
		videoId: 'jPea9Sp9xYQ',
		title: 'OpenClaw clone in n8n',
		description: 'Building an Open Claw Clone in n8n',
	},
	{
		type: 'template',
		templateId: 7639,
		title: 'Chat with your Google Sheet',
	},
	{
		type: 'video',
		videoId: 'A0OwvNOLNlw',
		title: 'Whatsapp based AI agent',
		description: 'Build an AI agent that works through WhatsApp',
		duration: '7 min',
	},
	{
		type: 'template',
		templateId: 3050,
		title: 'AI data analyst chatbot',
	},
	{
		type: 'template',
		templateId: 4966,
		title: 'Support WhatsApp bot with Google Docs knowledge base',
	},
	{
		type: 'video',
		videoId: 'k3mcttDLJB4',
		title: 'Voice Agent',
		description: 'Create a voice-powered AI agent',
		duration: '28 min',
	},
	{
		type: 'template',
		templateId: 7177,
		title: 'Inventory alerts for low stock & expiring',
	},
	{
		type: 'video',
		videoId: 'h7BLVKh7yzc',
		title: 'Build an Outlook inbox manager',
		description: 'Automate your email management with Outlook integration',
		duration: '32 min',
	},
	{
		type: 'template',
		templateId: 8779,
		title: 'Self Improving Email AI Support with Human in the Loop',
	},
	{
		type: 'template',
		templateId: 3100,
		title: 'Analyze Landing Page to get Optimization Tips',
	},
];

// Learn Section - ordered to match the current Notion source
export const learnContent: OrderedSectionResource[] = [
	{
		type: 'template',
		templateId: 8527,
		title: 'n8n basics in 3 easy steps',
	},
	{
		type: 'video',
		videoId: 'ZHH3sr234zY',
		title: 'Build AI Agents & Automate Workflows (Masterclass)',
		description: 'Comprehensive masterclass on building AI agents with n8n',
		duration: '1h 32 min',
		level: 'Masterclass',
	},
	{
		type: 'video',
		videoId: '4cQWJViybAQ',
		title: 'Build your first workflow',
		description: 'Get started with n8n by building your first workflow from scratch',
		duration: '15 min',
		level: 'Beginner',
	},
	{
		type: 'video',
		videoId: 'OCO3aq3G0mk',
		title: 'Get Claude to build workflows',
		description: 'Build workflow from Claude directly in n8n using MCP and skills',
	},
	{
		type: 'template',
		templateId: 6270,
		title: 'Build your first AI agent',
	},
	{
		type: 'video',
		videoId: 'UIf-SlmMays',
		title: 'Zero to Hero (Masterclass)',
		description: 'Complete journey from beginner to advanced n8n user',
		duration: '3h 35 min',
		level: 'Masterclass',
	},
	{
		type: 'video',
		videoId: 'kkrA7tGHYNo',
		title: 'Basic workflow concepts',
		description: 'Learn the fundamental concepts of n8n workflows',
		duration: '14 min',
		level: 'Beginner',
	},
	{
		type: 'video',
		videoId: 'D9MIGseFB3g',
		title: 'Essential nodes with use cases',
		description: 'Learn the most important nodes and when to use them',
		duration: '24 min',
		level: 'Masterclass',
	},
	{
		type: 'video',
		videoId: 'rCPXBkeBWCQ',
		title: 'Nodes',
		description: 'Understanding how nodes work in n8n workflows',
		duration: '13 min',
		level: 'Beginner',
	},
	{
		type: 'video',
		videoId: 'zMy5yoA-ub8',
		title: '25 Tips & Tricks',
		description: 'Power user tips and tricks to boost your productivity',
		duration: '15 min',
		level: 'Masterclass',
	},
	{
		type: 'video',
		videoId: 'a5sJNwfZ528',
		title: 'Using the AI workflow builder',
		description: 'Learn how to use AI to build workflows faster',
		duration: '18 min',
		level: 'Beginner',
	},
	{
		type: 'video',
		videoId: 'zcNB8L4_9mA',
		title: 'Use test data (Pinning)',
		description: 'Learn how to use pinning to test your workflows with sample data',
		duration: '7 min',
		level: 'Beginner',
	},
	{
		type: 'video',
		videoId: 'kvEGWVMo-2c',
		title: 'Connect any API with HTTP node',
		description: 'Master API integrations using the HTTP Request node',
		duration: '5 min',
		level: 'Intermediate',
	},
	{
		type: 'video',
		videoId: 'Gxe_RfCRH-o',
		title: 'Fixing issues (Debugging)',
		description: 'Learn how to debug and fix issues in your workflows',
		duration: '16 min',
		level: 'Intermediate',
	},
	{
		type: 'video',
		videoId: 'bTF3tACqPRU',
		title: 'Handling errors',
		description: 'Set up error handling to make your workflows more robust',
		duration: '10 min',
		level: 'Intermediate',
	},
];

export const featuredTemplateIds: number[] = getTemplateIds(getInspiredContent);
export const learnTemplateIds: number[] = getTemplateIds(learnContent);
