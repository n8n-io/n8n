import type { BestPracticesDocument } from '@/types';
import { WorkflowTechnique, type WorkflowTechniqueType } from '@/types/categorization';

import { ScrapingAndResearchBestPractices } from './scraping-and-research';

export const documentation: Record<WorkflowTechniqueType, BestPracticesDocument | undefined> = {
	[WorkflowTechnique.SCRAPING_AND_RESEARCH]: new ScrapingAndResearchBestPractices(),

	/** currently no best practice documentation defined */
	[WorkflowTechnique.CHATBOT]: undefined,
	[WorkflowTechnique.CONTENT_GENERATION]: undefined,
	[WorkflowTechnique.DATA_ANALYSIS]: undefined,
	[WorkflowTechnique.DATA_EXTRACTION]: undefined,
	[WorkflowTechnique.DATA_TRANSFORMATION]: undefined,
	[WorkflowTechnique.DOCUMENT_PROCESSING]: undefined,
	[WorkflowTechnique.ENRICHMENT]: undefined,
	[WorkflowTechnique.FORM_INPUT]: undefined,
	[WorkflowTechnique.HUMAN_IN_THE_LOOP]: undefined,
	[WorkflowTechnique.KNOWLEDGE_BASE]: undefined,
	[WorkflowTechnique.MONITORING]: undefined,
	[WorkflowTechnique.NOTIFICATION]: undefined,
	[WorkflowTechnique.SCHEDULING]: undefined,
	[WorkflowTechnique.TRIAGE]: undefined,
};
