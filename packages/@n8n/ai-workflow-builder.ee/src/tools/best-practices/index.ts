import type { BestPracticesDocument } from '@/types';
import { WorkflowTechnique, type WorkflowTechniqueType } from '@/types/categorization';

import { ChatbotBestPractices } from './chatbot';
import { ContentGenerationBestPractices } from './content-generation';
import { DataExtractionBestPractices } from './data-extraction';
import { FormInputBestPractices } from './form-input';
import { ScrapingAndResearchBestPractices } from './scraping-and-research';

export const documentation: Record<WorkflowTechniqueType, BestPracticesDocument | undefined> = {
	[WorkflowTechnique.SCRAPING_AND_RESEARCH]: new ScrapingAndResearchBestPractices(),
	[WorkflowTechnique.CHATBOT]: new ChatbotBestPractices(),
	[WorkflowTechnique.CONTENT_GENERATION]: new ContentGenerationBestPractices(),
	[WorkflowTechnique.DATA_EXTRACTION]: new DataExtractionBestPractices(),
	[WorkflowTechnique.FORM_INPUT]: new FormInputBestPractices(),

	/** currently no best practice documentation defined */
	[WorkflowTechnique.DATA_ANALYSIS]: undefined,
	[WorkflowTechnique.DATA_TRANSFORMATION]: undefined,
	[WorkflowTechnique.DOCUMENT_PROCESSING]: undefined,
	[WorkflowTechnique.ENRICHMENT]: undefined,
	[WorkflowTechnique.HUMAN_IN_THE_LOOP]: undefined,
	[WorkflowTechnique.KNOWLEDGE_BASE]: undefined,
	[WorkflowTechnique.MONITORING]: undefined,
	[WorkflowTechnique.NOTIFICATION]: undefined,
	[WorkflowTechnique.SCHEDULING]: undefined,
	[WorkflowTechnique.TRIAGE]: undefined,
};
