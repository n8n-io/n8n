/**
 * Resource Center Data
 * Curated YouTube videos, courses, and starter templates for n8n users
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
	level?: 'Beginner' | 'Intermediate' | 'Advanced';
	author?: string;
}

// Learn Section - Featured Tutorial Videos (sorted by rank)
export const learningVideos: YouTubeVideo[] = [
	{
		videoId: '4cQWJViybAQ',
		title: 'Build your first workflow',
		description: 'Get started with n8n by building your first workflow from scratch',

		duration: '15 min',
		level: 'Beginner',
	},
	{
		videoId: 'kkrA7tGHYNo',
		title: 'Basic workflow concepts',
		description: 'Learn the fundamental concepts of n8n workflows',

		duration: '14 min',
		level: 'Beginner',
	},
	{
		videoId: 'rCPXBkeBWCQ',
		title: 'Nodes',
		description: 'Understanding how nodes work in n8n workflows',
		duration: '13 min',
		level: 'Beginner',
	},
	{
		videoId: 'a5sJNwfZ528',
		title: 'Using the AI workflow builder',
		description: 'Learn how to use AI to build workflows faster',
		duration: '18 min',
		level: 'Beginner',
	},
	{
		videoId: 'zcNB8L4_9mA',
		title: 'Use test data (Pinning)',
		description: 'Learn how to use pinning to test your workflows with sample data',
		duration: '7 min',
		level: 'Beginner',
	},
	{
		videoId: 'kvEGWVMo-2c',
		title: 'Connect any API with HTTP node',
		description: 'Master API integrations using the HTTP Request node',
		duration: '5 min',
		level: 'Intermediate',
	},
	{
		videoId: 'Gxe_RfCRH-o',
		title: 'Fixing issues (Debugging)',
		description: 'Learn how to debug and fix issues in your workflows',
		duration: '16 min',
		level: 'Intermediate',
	},
	{
		videoId: 'bTF3tACqPRU',
		title: 'Handling errors',
		description: 'Set up error handling to make your workflows more robust',
		duration: '10 min',
		level: 'Intermediate',
	},
];

// Learn Section - Masterclass Videos (sorted by rank)
export const masterclassVideos: YouTubeVideo[] = [
	{
		videoId: 'ZHH3sr234zY',
		title: 'Build AI Agents & Automate Workflows',
		description: 'Comprehensive masterclass on building AI agents with n8n',
		duration: '1h 32 min',
		level: 'Intermediate',
	},
	{
		videoId: 'UIf-SlmMays',
		title: 'Zero to Hero',
		description: 'Complete journey from beginner to advanced n8n user',
		duration: '3h 35 min',
		level: 'Beginner',
	},
	{
		videoId: 'D9MIGseFB3g',
		title: 'Essential nodes with use cases',
		description: 'Learn the most important nodes and when to use them',
		duration: '24 min',
		level: 'Beginner',
	},
	{
		videoId: 'zMy5yoA-ub8',
		title: '25 Tips & Tricks',
		description: 'Power user tips and tricks to boost your productivity',
		duration: '15 min',
		level: 'Intermediate',
	},
];

// Learn Section - Template IDs (sorted by rank)
export const learnTemplateIds: number[] = [8527, 6270];

// Get Inspired Section - Videos (sorted by rank)
export const inspirationVideos: YouTubeVideo[] = [
	{
		videoId: 'A0OwvNOLNlw',
		title: 'Whatsapp based AI agent',
		description: 'Build an AI agent that works through WhatsApp',
		duration: '7 min',
	},
	{
		videoId: 'k3mcttDLJB4',
		title: 'Voice Agent',
		description: 'Create a voice-powered AI agent',
		duration: '28 min',
	},
	{
		videoId: 'h7BLVKh7yzc',
		title: 'Build an Outlook inbox manager',
		description: 'Automate your email management with Outlook integration',
		duration: '32 min',
	},
];

// Get Inspired Section - Template IDs (sorted by rank)
export const featuredTemplateIds: number[] = [7639, 3050, 4966, 7177, 8779, 3100];
