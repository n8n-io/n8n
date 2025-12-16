import type { BestPracticesDocument } from '@/types';
import { WorkflowTechnique, type WorkflowTechniqueType } from '@/types/categorization';

import { ChatbotBestPractices } from './chatbot';
import { ContentGenerationBestPractices } from './content-generation';
// import { DataAnalysisBestPractices } from './data-analysis';
import { DataExtractionBestPractices } from './data-extraction';
import { DataTransformationBestPractices } from './data-transformation';
import { DocumentProcessingBestPractices } from './document-processing';
// import { EnrichmentBestPractices } from './enrichment';
import { FormInputBestPractices } from './form-input';
// import { HumanInTheLoopBestPractices } from './human-in-the-loop';
// import { KnowledgeBaseBestPractices } from './knowledge-base';
// import { MonitoringBestPractices } from './monitoring';
// import { NotificationBestPractices } from './notification';
import { ScrapingAndResearchBestPractices } from './scraping-and-research';
// import { SchedulingBestPractices } from './scheduling';
// import { TriageBestPractices } from './triage';

export const documentation: Record<WorkflowTechniqueType, BestPracticesDocument | undefined> = {
	[WorkflowTechnique.SCRAPING_AND_RESEARCH]: new ScrapingAndResearchBestPractices(),
	[WorkflowTechnique.CHATBOT]: new ChatbotBestPractices(),
	[WorkflowTechnique.CONTENT_GENERATION]: new ContentGenerationBestPractices(),
	[WorkflowTechnique.DATA_ANALYSIS]: undefined, // new DataAnalysisBestPractices(),
	[WorkflowTechnique.DATA_EXTRACTION]: new DataExtractionBestPractices(),
	[WorkflowTechnique.DATA_TRANSFORMATION]: new DataTransformationBestPractices(),
	[WorkflowTechnique.DOCUMENT_PROCESSING]: new DocumentProcessingBestPractices(),
	[WorkflowTechnique.ENRICHMENT]: undefined, // new EnrichmentBestPractices(),
	[WorkflowTechnique.FORM_INPUT]: new FormInputBestPractices(),
	[WorkflowTechnique.KNOWLEDGE_BASE]: undefined, // new KnowledgeBaseBestPractices(),
	[WorkflowTechnique.NOTIFICATION]: undefined, // new NotificationBestPractices(),
	[WorkflowTechnique.TRIAGE]: undefined, // new TriageBestPractices(),
	[WorkflowTechnique.HUMAN_IN_THE_LOOP]: undefined, // new HumanInTheLoopBestPractices(),
	[WorkflowTechnique.MONITORING]: undefined, // new MonitoringBestPractices(),
	[WorkflowTechnique.SCHEDULING]: undefined, // new SchedulingBestPractices(),
};
