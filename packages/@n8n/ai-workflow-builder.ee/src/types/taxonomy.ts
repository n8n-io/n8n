/**
 * Workflow taxonomy types for categorizing user prompts
 * Based on AI-1538: Enhance workflow builder with taxonomy-aware context loading
 */

/**
 * Common workflow building techniques that can be combined in workflows
 */
export const WorkflowTechnique = {
	/** Running an action at a specific time or interval */
	Scheduling: 'scheduling',
	/** Receiving chat messages and replying (built-in chat, Telegram, Slack, MS Teams, etc.) */
	Chatbot: 'chatbot',
	/** Gathering data from users via forms */
	FormInput: 'form_input',
	/** Methodically collecting information from websites or APIs to compile structured data */
	ScrapingAndResearch: 'scraping_and_research',
	/** Repeatedly checking service/website status and taking action when conditions are met */
	Monitoring: 'monitoring',
	/** Adding extra details to existing data by merging information from other sources */
	Enrichment: 'enrichment',
	/** Classifying data for routing or prioritization */
	Triage: 'triage',
	/** Creating text, images, audio, video, etc. */
	ContentGeneration: 'content_generation',
	/** Taking action on content within files (PDFs, Word docs, images) */
	DocumentProcessing: 'document_processing',
	/** Pulling specific information from structured or unstructured inputs */
	DataExtraction: 'data_extraction',
	/** Examining data to find patterns, trends, anomalies, or insights */
	DataAnalysis: 'data_analysis',
	/** Cleaning, formatting, or restructuring data (including summarization) */
	DataTransformation: 'data_transformation',
	/** Sending alerts or updates via email, chat, SMS when events occur */
	Notification: 'notification',
	/** Building or using a centralized information collection (usually vector database for LLM use) */
	KnowledgeBase: 'knowledge_base',
	/** Pausing for human decision/input before resuming */
	HumanInTheLoop: 'human_in_the_loop',
} as const;

export type WorkflowTechniqueType = (typeof WorkflowTechnique)[keyof typeof WorkflowTechnique];

/**
 * Common use cases for workflow automation
 * Note: This is a starting point and may need expansion
 */
export const WorkflowUseCase = {
	/** Enriching lead information with additional data */
	LeadEnrichment: 'lead_enrichment',
	/** Processing and analyzing customer support tickets */
	CustomerSupport: 'customer_support',
	/** Automating data entry and synchronization */
	DataSync: 'data_sync',
	/** Creating and managing content */
	ContentManagement: 'content_management',
	/** Monitoring systems and sending alerts */
	SystemMonitoring: 'system_monitoring',
	/** Processing and routing incoming data */
	DataProcessing: 'data_processing',
	/** Automating marketing tasks */
	MarketingAutomation: 'marketing_automation',
	/** Other use case not fitting standard categories */
	Other: 'other',
} as const;

export type WorkflowUseCaseType = (typeof WorkflowUseCase)[keyof typeof WorkflowUseCase];

/**
 * Result of prompt categorization
 */
export interface PromptTaxonomy {
	/** The primary use case identified (optional) */
	useCase?: WorkflowUseCaseType;
	/** One or more techniques identified in the prompt */
	techniques: WorkflowTechniqueType[];
	/** Confidence level of the categorization (0-1) */
	confidence?: number;
}

/**
 * All available workflow techniques as a human-readable list
 */
export const TECHNIQUE_DESCRIPTIONS: Record<WorkflowTechniqueType, string> = {
	[WorkflowTechnique.Scheduling]: 'Running an action at a specific time or interval',
	[WorkflowTechnique.Chatbot]:
		'Receiving chat messages and replying (built-in chat, Telegram, Slack, MS Teams, etc.)',
	[WorkflowTechnique.FormInput]: 'Gathering data from users via forms',
	[WorkflowTechnique.ScrapingAndResearch]:
		'Methodically collecting information from websites or APIs to compile structured data',
	[WorkflowTechnique.Monitoring]:
		'Repeatedly checking service/website status and taking action when conditions are met',
	[WorkflowTechnique.Enrichment]:
		'Adding extra details to existing data by merging information from other sources',
	[WorkflowTechnique.Triage]: 'Classifying data for routing or prioritization',
	[WorkflowTechnique.ContentGeneration]: 'Creating text, images, audio, video, etc.',
	[WorkflowTechnique.DocumentProcessing]:
		'Taking action on content within files (PDFs, Word docs, images)',
	[WorkflowTechnique.DataExtraction]:
		'Pulling specific information from structured or unstructured inputs',
	[WorkflowTechnique.DataAnalysis]:
		'Examining data to find patterns, trends, anomalies, or insights',
	[WorkflowTechnique.DataTransformation]:
		'Cleaning, formatting, or restructuring data (including summarization)',
	[WorkflowTechnique.Notification]:
		'Sending alerts or updates via email, chat, SMS when events occur',
	[WorkflowTechnique.KnowledgeBase]:
		'Building or using a centralized information collection (usually vector database for LLM use)',
	[WorkflowTechnique.HumanInTheLoop]: 'Pausing for human decision/input before resuming',
};

/**
 * All available use cases as a human-readable list
 */
export const USE_CASE_DESCRIPTIONS: Record<WorkflowUseCaseType, string> = {
	[WorkflowUseCase.LeadEnrichment]: 'Enriching lead information with additional data',
	[WorkflowUseCase.CustomerSupport]: 'Processing and analyzing customer support tickets',
	[WorkflowUseCase.DataSync]: 'Automating data entry and synchronization',
	[WorkflowUseCase.ContentManagement]: 'Creating and managing content',
	[WorkflowUseCase.SystemMonitoring]: 'Monitoring systems and sending alerts',
	[WorkflowUseCase.DataProcessing]: 'Processing and routing incoming data',
	[WorkflowUseCase.MarketingAutomation]: 'Automating marketing tasks',
	[WorkflowUseCase.Other]: 'Other use case not fitting standard categories',
};
