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
	author?: string;
}

export interface Course {
	id: string;
	title: string;
	description: string;
	url: string;
	thumbnailUrl: string;
	type?: string;
}

// Inspiring success stories and real-world applications
export const inspirationVideos: YouTubeVideo[] = [
	{
		videoId: 'lSwMtsm6oDU',
		title: 'The Ultimate n8n Guide: From Beginner to Pro',
		description:
			'Beginner to Pro in one comprehensive video with structured chapters for easy navigation',
		thumbnailUrl: 'https://img.youtube.com/vi/lSwMtsm6oDU/hq720.jpg',
		author: 'Stephen G. Pope',
	},
	{
		videoId: 'dXOCbeYMRBk',
		title: 'How a 17-Year-Old Made $100k with n8n',
		description: 'Success story of a teenage entrepreneur building an automation business with n8n',
		thumbnailUrl: 'https://img.youtube.com/vi/dXOCbeYMRBk/hq720.jpg',
	},
	{
		videoId: 'RpjQTGKm-ok',
		title: 'YouTube Automation That Creates Viral Videos with AI',
		description: 'Complete end-to-end automation showcase - from script generation to video upload',
		thumbnailUrl: 'https://img.youtube.com/vi/RpjQTGKm-ok/hq720.jpg',
	},
];

// Official n8n courses and learning paths
export const courses: Course[] = [
	{
		id: 'beginner-course',
		title: 'n8n Beginner Course',
		description:
			'Official video course covering workflows, APIs, webhooks, nodes, error handling, and debugging. Perfect starting point.',
		url: 'https://docs.n8n.io/video-courses/',
		thumbnailUrl: 'https://img.youtube.com/vi/RpjQTGKm-ok/hq720.jpg',
		type: 'Video',
	},
	{
		id: 'advanced-course',
		title: 'n8n Advanced Course',
		description:
			'Master complex data flows, advanced nodes, sub-workflows, error workflows, and enterprise features.',
		url: 'https://docs.n8n.io/video-courses/',
		thumbnailUrl: 'https://img.youtube.com/vi/3w7xIMKLVAg/hq720.jpg',
		type: 'Video',
	},
];

// Beginner-friendly learning videos
export const learningVideos: YouTubeVideo[] = [
	{
		videoId: 'JIaxjH2CyFc',
		title: 'n8n Crash Course - Complete Tutorial for Beginners',
		description:
			'Complete 3-hour tutorial covering setup, first automation, lead management, web scraping, and AI agents',
		thumbnailUrl: 'https://img.youtube.com/vi/JIaxjH2CyFc/hq720.jpg',
		duration: '3 hours',
		author: 'Data Science with Harshit',
	},
	{
		videoId: 'lSwMtsm6oDU',
		title: "n8n Beginner's Guide - Building First Automation",
		description:
			'Quick and practical introduction to building your first automation workflow from scratch',
		thumbnailUrl: 'https://img.youtube.com/vi/lSwMtsm6oDU/hq720.jpg',
	},
	{
		videoId: '1MwLNrGxs_o',
		title: 'Creating Your First Simple Workflow',
		description: 'Step-by-step tutorial for creating your first n8n workflow using basic nodes',
		thumbnailUrl: 'https://img.youtube.com/vi/1MwLNrGxs_o/hq720.jpg',
	},
	{
		videoId: 'wq7ZM-VNJBU',
		title: 'Understanding n8n Nodes',
		description: 'Deep dive into how nodes work and how to use them effectively in your workflows',
		thumbnailUrl: 'https://img.youtube.com/vi/wq7ZM-VNJBU/hq720.jpg',
	},
	{
		videoId: 'KFKx8BmQBfE',
		title: 'Working with APIs in n8n',
		description:
			'Master API integrations and HTTP requests to connect any service to your workflows',
		thumbnailUrl: 'https://img.youtube.com/vi/KFKx8BmQBfE/hq720.jpg',
	},
	{
		videoId: '6fXjBuFmVQw',
		title: 'Advanced Expression Functions',
		description: 'Unlock the power of expressions and data transformations for dynamic workflows',
		thumbnailUrl: 'https://img.youtube.com/vi/6fXjBuFmVQw/hq720.jpg',
	},
];

// Featured Template IDs - These templates will be shown in the Template Libraries section
// TODO: Replace with actual template IDs from the n8n template library
export const featuredTemplateIds: number[] = [8966, 8967, 8968, 8969, 8970, 8971];
