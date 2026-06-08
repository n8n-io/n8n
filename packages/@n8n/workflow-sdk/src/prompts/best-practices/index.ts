export { WorkflowTechnique, TechniqueDescription } from './types';
export type { WorkflowTechniqueType, BestPracticesDocument } from './types';

export { ChatbotBestPractices } from './guides/chatbot';
export { ContentGenerationBestPractices } from './guides/content-generation';
export { DataAnalysisBestPractices } from './guides/data-analysis';
export { DataExtractionBestPractices } from './guides/data-extraction';
export { DataPersistenceBestPractices } from './guides/data-persistence';
export { DataTransformationBestPractices } from './guides/data-transformation';
export { DocumentProcessingBestPractices } from './guides/document-processing';
export { EnrichmentBestPractices } from './guides/enrichment';
export { FormInputBestPractices } from './guides/form-input';
export { HumanInTheLoopBestPractices } from './guides/human-in-the-loop';
export { KnowledgeBaseBestPractices } from './guides/knowledge-base';
export { MonitoringBestPractices } from './guides/monitoring';
export { NotificationBestPractices } from './guides/notification';
export { SchedulingBestPractices } from './guides/scheduling';
export { ScrapingAndResearchBestPractices } from './guides/scraping-and-research';
export { TriageBestPractices } from './guides/triage';
export { WebAppBestPractices } from './guides/web-app';

import { ChatbotBestPractices } from './guides/chatbot';
import { ContentGenerationBestPractices } from './guides/content-generation';
import { DataExtractionBestPractices } from './guides/data-extraction';
import { DataPersistenceBestPractices } from './guides/data-persistence';
import { DataTransformationBestPractices } from './guides/data-transformation';
import { DocumentProcessingBestPractices } from './guides/document-processing';
import { FormInputBestPractices } from './guides/form-input';
import { NotificationBestPractices } from './guides/notification';
import { SchedulingBestPractices } from './guides/scheduling';
import { ScrapingAndResearchBestPractices } from './guides/scraping-and-research';
import { TriageBestPractices } from './guides/triage';
import { WebAppBestPractices } from './guides/web-app';
import type { WorkflowTechniqueType, BestPracticesDocument } from './types';
import { WorkflowTechnique } from './types';

export const bestPracticesRegistry: Record<
	WorkflowTechniqueType,
	BestPracticesDocument | undefined
> = {
	[WorkflowTechnique.SCHEDULING]: new SchedulingBestPractices(),
	[WorkflowTechnique.CHATBOT]: new ChatbotBestPractices(),
	[WorkflowTechnique.FORM_INPUT]: new FormInputBestPractices(),
	[WorkflowTechnique.SCRAPING_AND_RESEARCH]: new ScrapingAndResearchBestPractices(),
	[WorkflowTechnique.MONITORING]: undefined,
	[WorkflowTechnique.ENRICHMENT]: undefined,
	[WorkflowTechnique.TRIAGE]: new TriageBestPractices(),
	[WorkflowTechnique.CONTENT_GENERATION]: new ContentGenerationBestPractices(),
	[WorkflowTechnique.DOCUMENT_PROCESSING]: new DocumentProcessingBestPractices(),
	[WorkflowTechnique.DATA_EXTRACTION]: new DataExtractionBestPractices(),
	[WorkflowTechnique.DATA_ANALYSIS]: undefined,
	[WorkflowTechnique.DATA_TRANSFORMATION]: new DataTransformationBestPractices(),
	[WorkflowTechnique.DATA_PERSISTENCE]: new DataPersistenceBestPractices(),
	[WorkflowTechnique.NOTIFICATION]: new NotificationBestPractices(),
	[WorkflowTechnique.KNOWLEDGE_BASE]: undefined,
	[WorkflowTechnique.HUMAN_IN_THE_LOOP]: undefined,
	[WorkflowTechnique.WEB_APP]: new WebAppBestPractices(),
};
