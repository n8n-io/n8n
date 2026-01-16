/**
 * Resource Center Data
 * Curated YouTube videos, courses, and starter templates for n8n users
 */

export interface YouTubeVideo {
	videoId: string;
	title: string;
	description: string;
	thumbnailUrl: string;
	duration?: string;
	level?: 'Beginner' | 'Intermediate' | 'Advanced';
	author?: string;
}

export interface Course {
	id: string;
	title: string;
	description: string;
	url: string;
	thumbnailUrl: string;
	duration?: string;
	lessonCount?: number;
	type?: string;
}

// Official n8n courses and learning paths
export const courses: Course[] = [
	{
		id: 'beginner-course',
		title: 'n8n Beginner Course',
		description:
			'Official video course covering workflows, APIs, webhooks, nodes, error handling, and debugging. Perfect starting point.',
		url: 'https://docs.n8n.io/video-courses/',
		thumbnailUrl: 'https://img.youtube.com/vi/RpjQTGKm-ok/hq720.jpg',
		duration: '3 hours',
		lessonCount: 12,
		type: 'Video',
	},
	{
		id: 'advanced-course',
		title: 'n8n Advanced Course',
		description:
			'Master complex data flows, advanced nodes, sub-workflows, error workflows, and enterprise features.',
		url: 'https://docs.n8n.io/video-courses/',
		thumbnailUrl: 'https://img.youtube.com/vi/3w7xIMKLVAg/hq720.jpg',
		duration: '4 hours',
		lessonCount: 15,
		type: 'Video',
	},
];

// Learn Section - Featured Tutorial Videos (sorted by rank)
export const learningVideos: YouTubeVideo[] = [
	{
		videoId: '4cQWJViybAQ',
		title: 'Build your first workflow',
		description: 'Get started with n8n by building your first workflow from scratch',
		thumbnailUrl: 'https://img.youtube.com/vi/4cQWJViybAQ/hq720.jpg',
		duration: '15 min',
		level: 'Beginner',
	},
	{
		videoId: 'kkrA7tGHYNo',
		title: 'Basic workflow concepts',
		description: 'Learn the fundamental concepts of n8n workflows',
		thumbnailUrl: 'https://img.youtube.com/vi/kkrA7tGHYNo/hq720.jpg',
		duration: '14 min',
		level: 'Beginner',
	},
	{
		videoId: 'rCPXBkeBWCQ',
		title: 'Nodes',
		description: 'Understanding how nodes work in n8n workflows',
		thumbnailUrl: 'https://img.youtube.com/vi/rCPXBkeBWCQ/hq720.jpg',
		duration: '13 min',
		level: 'Beginner',
	},
	{
		videoId: 'a5sJNwfZ528',
		title: 'Using the AI workflow builder',
		description: 'Learn how to use AI to build workflows faster',
		thumbnailUrl: 'https://img.youtube.com/vi/a5sJNwfZ528/hq720.jpg',
		duration: '18 min',
		level: 'Beginner',
	},
	{
		videoId: 'zcNB8L4_9mA',
		title: 'Use test data (Pinning)',
		description: 'Learn how to use pinning to test your workflows with sample data',
		thumbnailUrl: 'https://img.youtube.com/vi/zcNB8L4_9mA/hq720.jpg',
		duration: '7 min',
		level: 'Beginner',
	},
	{
		videoId: 'kvEGWVMo-2c',
		title: 'Connect any API with HTTP node',
		description: 'Master API integrations using the HTTP Request node',
		thumbnailUrl: 'https://img.youtube.com/vi/kvEGWVMo-2c/hq720.jpg',
		duration: '5 min',
		level: 'Intermediate',
	},
	{
		videoId: 'Gxe_RfCRH-o',
		title: 'Fixing issues (Debugging)',
		description: 'Learn how to debug and fix issues in your workflows',
		thumbnailUrl: 'https://img.youtube.com/vi/Gxe_RfCRH-o/hq720.jpg',
		duration: '16 min',
		level: 'Intermediate',
	},
	{
		videoId: 'bTF3tACqPRU',
		title: 'Handling errors',
		description: 'Set up error handling to make your workflows more robust',
		thumbnailUrl: 'https://img.youtube.com/vi/bTF3tACqPRU/hq720.jpg',
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
		thumbnailUrl: 'https://img.youtube.com/vi/ZHH3sr234zY/hq720.jpg',
		duration: '1h 32 min',
		level: 'Intermediate',
	},
	{
		videoId: 'UIf-SlmMays',
		title: 'Zero to Hero',
		description: 'Complete journey from beginner to advanced n8n user',
		thumbnailUrl: 'https://img.youtube.com/vi/UIf-SlmMays/hq720.jpg',
		duration: '3h 35 min',
		level: 'Beginner',
	},
	{
		videoId: 'D9MIGseFB3g',
		title: 'Essential nodes with use cases',
		description: 'Learn the most important nodes and when to use them',
		thumbnailUrl: 'https://img.youtube.com/vi/D9MIGseFB3g/hq720.jpg',
		duration: '24 min',
		level: 'Beginner',
	},
	{
		videoId: 'zMy5yoA-ub8',
		title: '25 Tips & Tricks',
		description: 'Power user tips and tricks to boost your productivity',
		thumbnailUrl: 'https://img.youtube.com/vi/zMy5yoA-ub8/hq720.jpg',
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
		thumbnailUrl: 'https://img.youtube.com/vi/A0OwvNOLNlw/hq720.jpg',
		duration: '7 min',
	},
	{
		videoId: 'k3mcttDLJB4',
		title: 'Voice Agent',
		description: 'Create a voice-powered AI agent',
		thumbnailUrl: 'https://img.youtube.com/vi/k3mcttDLJB4/hq720.jpg',
		duration: '28 min',
	},
	{
		videoId: 'h7BLVKh7yzc',
		title: 'Build an Outlook inbox manager',
		description: 'Automate your email management with Outlook integration',
		thumbnailUrl: 'https://img.youtube.com/vi/h7BLVKh7yzc/hq720.jpg',
		duration: '32 min',
	},
];

// Get Inspired Section - Template IDs (sorted by rank)
export const featuredTemplateIds: number[] = [7639, 3050, 4966, 7177, 8779, 3100];
