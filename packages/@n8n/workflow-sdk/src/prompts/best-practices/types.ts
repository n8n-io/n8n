/**
 * Common workflow building techniques that can be combined in workflows.
 */
export const WorkflowTechnique = {
	SCHEDULING: 'scheduling',
	CHATBOT: 'chatbot',
	FORM_INPUT: 'form_input',
	SCRAPING_AND_RESEARCH: 'scraping_and_research',
	MONITORING: 'monitoring',
	ENRICHMENT: 'enrichment',
	TRIAGE: 'triage',
	CONTENT_GENERATION: 'content_generation',
	DOCUMENT_PROCESSING: 'document_processing',
	DATA_EXTRACTION: 'data_extraction',
	DATA_ANALYSIS: 'data_analysis',
	DATA_TRANSFORMATION: 'data_transformation',
	DATA_PERSISTENCE: 'data_persistence',
	NOTIFICATION: 'notification',
	KNOWLEDGE_BASE: 'knowledge_base',
	HUMAN_IN_THE_LOOP: 'human_in_the_loop',
} as const;

export type WorkflowTechniqueType = (typeof WorkflowTechnique)[keyof typeof WorkflowTechnique];

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
 * Interface for best practices documentation for a specific workflow technique.
 */
export interface BestPracticesDocument {
	readonly technique: WorkflowTechniqueType;
	readonly version: string;
	getDocumentation(): string;
}
