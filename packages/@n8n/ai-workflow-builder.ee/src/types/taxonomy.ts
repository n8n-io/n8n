/**
 * Workflow taxonomy types for categorizing user prompts
 * Based on AI-1538: Enhance workflow builder with taxonomy-aware context loading
 */

/**
 * Common workflow building techniques that can be combined in workflows
 */
export const workflowTechnique = {
	/** Running an action at a specific time or interval */
	SCHEDULING: 'scheduling',
	/** Receiving chat messages and replying (built-in chat, Telegram, Slack, MS Teams, etc.) */
	CHATBOT: 'chatbot',
	/** Gathering data from users via forms */
	FORM_INPUT: 'form_input',
	/** Methodically collecting information from websites or APIs to compile structured data */
	SCRAPING_AND_RESEARCH: 'scraping_and_research',
	/** Repeatedly checking service/website status and taking action when conditions are met */
	MONITORING: 'monitoring',
	/** Adding extra details to existing data by merging information from other sources */
	ENRICHMENT: 'enrichment',
	/** Classifying data for routing or prioritization */
	TRIAGE: 'triage',
	/** Creating text, images, audio, video, etc. */
	CONTENT_GENERATION: 'content_generation',
	/** Taking action on content within files (PDFs, Word docs, images) */
	DOCUMENT_PROCESSING: 'document_processing',
	/** Pulling specific information from structured or unstructured inputs */
	DATA_EXTRACTION: 'data_extraction',
	/** Examining data to find patterns, trends, anomalies, or insights */
	DATA_ANALYSIS: 'data_analysis',
	/** Cleaning, formatting, or restructuring data (including summarization) */
	DATA_TRANSFORMATION: 'data_transformation',
	/** Sending alerts or updates via email, chat, SMS when events occur */
	NOTIFICATION: 'notification',
	/** Building or using a centralized information collection (usually vector database for LLM use) */
	KNOWLEDGE_BASE: 'knowledge_base',
	/** Pausing for human decision/input before resuming */
	HUMAN_IN_THE_LOOP: 'human_in_the_loop',
} as const;

export type WorkflowTechniqueType = (typeof workflowTechnique)[keyof typeof workflowTechnique];

/**
 * Common use cases for workflow automation
 * Note: This is a starting point and may need expansion
 */
export const workflowUseCase = {
	/** Enriching lead information with additional data */
	LEAD_ENRICHMENT: 'lead_enrichment',
	/** Processing and analyzing customer support tickets */
	CUSTOMER_SUPPORT: 'customer_support',
	/** Automating data entry and synchronization */
	DATA_SYNC: 'data_sync',
	/** Creating and managing content */
	CONTENT_MANAGEMENT: 'content_management',
	/** Monitoring systems and sending alerts */
	SYSTEM_MONITORING: 'system_monitoring',
	/** Processing and routing incoming data */
	DATA_PROCESSING: 'data_processing',
	/** Automating marketing tasks */
	MARKETING_AUTOMATION: 'marketing_automation',
	/** Other use case not fitting standard categories */
	OTHER: 'other',
} as const;

export type WorkflowUseCaseType = (typeof workflowUseCase)[keyof typeof workflowUseCase];

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
	[workflowTechnique.SCHEDULING]: 'Running an action at a specific time or interval',
	[workflowTechnique.CHATBOT]:
		'Receiving chat messages and replying (built-in chat, Telegram, Slack, MS Teams, etc.)',
	[workflowTechnique.FORM_INPUT]: 'Gathering data from users via forms',
	[workflowTechnique.SCRAPING_AND_RESEARCH]:
		'Methodically collecting information from websites or APIs to compile structured data',
	[workflowTechnique.MONITORING]:
		'Repeatedly checking service/website status and taking action when conditions are met',
	[workflowTechnique.ENRICHMENT]:
		'Adding extra details to existing data by merging information from other sources',
	[workflowTechnique.TRIAGE]: 'Classifying data for routing or prioritization',
	[workflowTechnique.CONTENT_GENERATION]: 'Creating text, images, audio, video, etc.',
	[workflowTechnique.DOCUMENT_PROCESSING]:
		'Taking action on content within files (PDFs, Word docs, images)',
	[workflowTechnique.DATA_EXTRACTION]:
		'Pulling specific information from structured or unstructured inputs',
	[workflowTechnique.DATA_ANALYSIS]:
		'Examining data to find patterns, trends, anomalies, or insights',
	[workflowTechnique.DATA_TRANSFORMATION]:
		'Cleaning, formatting, or restructuring data (including summarization)',
	[workflowTechnique.NOTIFICATION]:
		'Sending alerts or updates via email, chat, SMS when events occur',
	[workflowTechnique.KNOWLEDGE_BASE]:
		'Building or using a centralized information collection (usually vector database for LLM use)',
	[workflowTechnique.HUMAN_IN_THE_LOOP]: 'Pausing for human decision/input before resuming',
};

/**
 * All available use cases as a human-readable list
 */
export const USE_CASE_DESCRIPTIONS: Record<WorkflowUseCaseType, string> = {
	[workflowUseCase.LEAD_ENRICHMENT]: 'Enriching lead information with additional data',
	[workflowUseCase.CUSTOMER_SUPPORT]: 'Processing and analyzing customer support tickets',
	[workflowUseCase.DATA_SYNC]: 'Automating data entry and synchronization',
	[workflowUseCase.CONTENT_MANAGEMENT]: 'Creating and managing content',
	[workflowUseCase.SYSTEM_MONITORING]: 'Monitoring systems and sending alerts',
	[workflowUseCase.DATA_PROCESSING]: 'Processing and routing incoming data',
	[workflowUseCase.MARKETING_AUTOMATION]: 'Automating marketing tasks',
	[workflowUseCase.OTHER]: 'Other use case not fitting standard categories',
};
