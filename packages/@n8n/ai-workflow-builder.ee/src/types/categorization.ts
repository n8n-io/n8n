/**
 * Common workflow building techniques that can be combined in workflows
 */
export const WorkflowTechnique = {
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
	/** Storing, updating, or retrieving records from persistent storage (Google Sheets, Airtable, built-in Data Tables) */
	DATA_PERSISTENCE: 'data_persistence',
	/** Sending alerts or updates via email, chat, SMS when events occur */
	NOTIFICATION: 'notification',
	/** Building or using a centralized information collection (usually vector database for LLM use) */
	KNOWLEDGE_BASE: 'knowledge_base',
	/** Pausing for human decision/input before resuming */
	HUMAN_IN_THE_LOOP: 'human_in_the_loop',
} as const;

export type WorkflowTechniqueType = (typeof WorkflowTechnique)[keyof typeof WorkflowTechnique];

/**
 * All available workflow techniques as a human-readable list
 */
export const TechniqueDescription: Record<WorkflowTechniqueType, string> = {
	[WorkflowTechnique.SCHEDULING]: 'Running an action at a specific time or interval',
	[WorkflowTechnique.CHATBOT]:
		'Receiving chat messages and replying (built-in chat, Telegram, Slack, MS Teams, etc.)',
	[WorkflowTechnique.FORM_INPUT]: 'Gathering data from users via forms',
	[WorkflowTechnique.SCRAPING_AND_RESEARCH]:
		'Methodically collecting information from websites or APIs to compile structured data',
	[WorkflowTechnique.MONITORING]:
		'Repeatedly checking service/website status and taking action when conditions are met',
	[WorkflowTechnique.ENRICHMENT]:
		'Adding extra details to existing data by merging information from other sources',
	[WorkflowTechnique.TRIAGE]: 'Classifying data for routing or prioritization',
	[WorkflowTechnique.CONTENT_GENERATION]: 'Creating text, images, audio, video, etc.',
	[WorkflowTechnique.DOCUMENT_PROCESSING]:
		'Taking action on content within files (PDFs, Word docs, images)',
	[WorkflowTechnique.DATA_EXTRACTION]:
		'Pulling specific information from structured or unstructured inputs',
	[WorkflowTechnique.DATA_ANALYSIS]:
		'Examining data to find patterns, trends, anomalies, or insights',
	[WorkflowTechnique.DATA_TRANSFORMATION]:
		'Cleaning, formatting, or restructuring data (including summarization)',
	[WorkflowTechnique.DATA_PERSISTENCE]:
		'Storing, updating, or retrieving records from persistent storage (Google Sheets, Airtable, built-in Data Tables)',
	[WorkflowTechnique.NOTIFICATION]:
		'Sending alerts or updates via email, chat, SMS when events occur',
	[WorkflowTechnique.KNOWLEDGE_BASE]:
		'Building or using a centralized information collection (usually vector database for LLM use)',
	[WorkflowTechnique.HUMAN_IN_THE_LOOP]: 'Pausing for human decision/input before resuming',
};

/**
 * Result of prompt categorization
 */
export interface PromptCategorization {
	/** One or more techniques identified in the prompt */
	techniques: WorkflowTechniqueType[];
	/** Confidence level of the categorization (0-1) */
	confidence?: number;
}
