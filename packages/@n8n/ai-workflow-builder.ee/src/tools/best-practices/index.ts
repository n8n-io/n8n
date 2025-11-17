import type { BestPracticesDocument } from '@/types';
import { WorkflowTechnique, type WorkflowTechniqueType } from '@/types/categorization';

import { ChatbotBestPractices } from './chatbot';
import { ContentGenerationBestPractices } from './content-generation';
import { DataAnalysisBestPractices } from './data-analysis';
import { DataExtractionBestPractices } from './data-extraction';
import { DataTransformationBestPractices } from './data-transformation';
import { DocumentProcessingBestPractices } from './document-processing';
import { FormInputBestPractices } from './form-input';
import { NotificationBestPractices } from './notification';
import { ScrapingAndResearchBestPractices } from './scraping-and-research';
import { TriageBestPractices } from './triage';

export const documentation: Record<WorkflowTechniqueType, BestPracticesDocument | undefined> = {
	[WorkflowTechnique.SCRAPING_AND_RESEARCH]: new ScrapingAndResearchBestPractices(),
	[WorkflowTechnique.CHATBOT]: new ChatbotBestPractices(),
	[WorkflowTechnique.CONTENT_GENERATION]: new ContentGenerationBestPractices(),
	[WorkflowTechnique.DATA_ANALYSIS]: new DataAnalysisBestPractices(),
	[WorkflowTechnique.DATA_EXTRACTION]: new DataExtractionBestPractices(),
	[WorkflowTechnique.DATA_TRANSFORMATION]: new DataTransformationBestPractices(),
	[WorkflowTechnique.DOCUMENT_PROCESSING]: new DocumentProcessingBestPractices(),
	[WorkflowTechnique.FORM_INPUT]: new FormInputBestPractices(),
	[WorkflowTechnique.NOTIFICATION]: new NotificationBestPractices(),
	[WorkflowTechnique.TRIAGE]: new TriageBestPractices(),

	/** currently no best practice documentation defined */
	[WorkflowTechnique.ENRICHMENT]: undefined,
	[WorkflowTechnique.HUMAN_IN_THE_LOOP]: undefined,
	[WorkflowTechnique.KNOWLEDGE_BASE]: undefined,
	[WorkflowTechnique.MONITORING]: undefined,
	[WorkflowTechnique.SCHEDULING]: undefined,
};
