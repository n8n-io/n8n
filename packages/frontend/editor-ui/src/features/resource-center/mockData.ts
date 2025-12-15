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

// QuickStart Workflow - Imports workflow directly into workspace
export interface QuickStartWorkflow {
	id: number;
	name: string;
	description: string;
	icon: string;
	easySetup: boolean;
	noCredentials: boolean;
}

// Template Preview - Links to template library with preview image
export interface TemplatePreview {
	id: number | string;
	name: string;
	description: string;
	previewImageUrl?: string;
	url: string;
	workflowCount?: number;
	category?: string;
}

// External Link - Generic external resource
export interface ExternalLink {
	id: string;
	name: string;
	description: string;
	url: string;
	icon?: string;
	metadata?: string;
	badge?: string;
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

// QuickStart Workflows - Import directly into workspace
export const quickStartWorkflows: QuickStartWorkflow[] = [
	{
		id: 1001,
		name: 'AI summaries of Hacker News',
		description: 'Get AI-generated summaries of top Hacker News stories delivered to you',
		icon: 'sparkles',
		easySetup: true,
		noCredentials: true,
	},
	{
		id: 1002,
		name: 'Web form builder',
		description: 'Create and manage web forms with automated response handling',
		icon: 'clipboard-list',
		easySetup: true,
		noCredentials: true,
	},
	{
		id: 1003,
		name: 'RSS feed monitor',
		description: 'Monitor RSS feeds and get notified when new content is published',
		icon: 'rss',
		easySetup: true,
		noCredentials: true,
	},
	{
		id: 1004,
		name: 'AI content generation',
		description: 'Generate blog posts, social media content, and more with AI',
		icon: 'wand-sparkles',
		easySetup: true,
		noCredentials: true,
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

// Template Previews - Workflow template library with preview images
export const templatePreviews: TemplatePreview[] = [
	{
		id: 'n8n-official',
		name: 'Official n8n Templates',
		description: 'Verified templates from n8n team and trusted contributors',
		url: 'https://n8n.io/workflows',
		workflowCount: 1000,
		category: 'Official',
	},
	{
		id: 'community-hub',
		name: 'Community Workflow Hub',
		description: 'User-submitted workflows from the global n8n community',
		url: 'https://n8n.io/workflows',
		workflowCount: 500,
		category: 'Community',
	},
	{
		id: 'integrations',
		name: 'Integration Templates',
		description: 'Pre-built integrations for popular services and APIs',
		url: 'https://n8n.io/integrations',
		workflowCount: 800,
		category: 'Integrations',
	},
];

// External Links - GitHub collections, courses, learning paths
export const externalLinks: ExternalLink[] = [
	{
		id: 'n8n-nodes',
		name: 'Custom Nodes Collection',
		description: 'Community-created custom nodes extending n8n functionality',
		url: 'https://github.com/n8n-io/n8n-nodes-starter',
		icon: 'github',
		metadata: '2.5k stars · 100+ workflows',
	},
	{
		id: 'workflow-templates',
		name: 'Awesome n8n Workflows',
		description: 'Curated list of production-ready workflow templates',
		url: 'https://github.com/n8n-io/n8n',
		icon: 'github',
		metadata: '48k stars · 500+ workflows',
		badge: 'Popular',
	},
	{
		id: 'enterprise-workflows',
		name: 'Enterprise Workflow Patterns',
		description: 'Advanced patterns for scaling n8n in enterprise environments',
		url: 'https://github.com/n8n-io/n8n',
		icon: 'github',
		metadata: '15k stars · 200+ workflows',
	},
	{
		id: 'ai-workflows',
		name: 'AI & LangChain Workflows',
		description: 'AI-powered workflows using LangChain and OpenAI integrations',
		url: 'https://github.com/n8n-io/n8n',
		icon: 'github',
		metadata: '10k stars · 150+ workflows',
	},
	{
		id: 'fundamentals',
		name: 'n8n Fundamentals Path',
		description: 'Complete foundation: workflows, nodes, expressions, and debugging',
		url: 'https://docs.n8n.io/courses/',
		icon: 'book',
		metadata: '4 hours · 8 steps',
		badge: 'Beginner',
	},
	{
		id: 'automation-expert',
		name: 'Automation Expert Path',
		description: 'Master advanced patterns, error handling, and workflow optimization',
		url: 'https://docs.n8n.io/courses/',
		icon: 'book',
		metadata: '6 hours · 12 steps',
		badge: 'Intermediate',
	},
	{
		id: 'ai-workflows-path',
		name: 'AI Workflows Path',
		description: 'Build intelligent workflows with AI agents, LangChain, and vector databases',
		url: 'https://docs.n8n.io/courses/',
		icon: 'book',
		metadata: '8 hours · 15 steps',
		badge: 'Advanced',
	},
];
