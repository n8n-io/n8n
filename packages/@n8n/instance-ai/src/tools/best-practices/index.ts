import { getDocumentation as getChatbotDocs } from './guides/chatbot';
import { getDocumentation as getContentGenerationDocs } from './guides/content-generation';
import { getDocumentation as getDataExtractionDocs } from './guides/data-extraction';
import { getDocumentation as getDataPersistenceDocs } from './guides/data-persistence';
import { getDocumentation as getDataTransformationDocs } from './guides/data-transformation';
import { getDocumentation as getDocumentProcessingDocs } from './guides/document-processing';
import { getDocumentation as getFormInputDocs } from './guides/form-input';
import { getDocumentation as getNotificationDocs } from './guides/notification';
import { getDocumentation as getSchedulingDocs } from './guides/scheduling';
import { getDocumentation as getScrapingAndResearchDocs } from './guides/scraping-and-research';
import { getDocumentation as getTriageDocs } from './guides/triage';
import { WorkflowTechnique, type WorkflowTechniqueType } from './techniques';

/**
 * Registry mapping workflow techniques to their documentation getter functions.
 * Techniques without documentation are set to undefined.
 */
export const documentation: Record<WorkflowTechniqueType, (() => string) | undefined> = {
	[WorkflowTechnique.SCRAPING_AND_RESEARCH]: getScrapingAndResearchDocs,
	[WorkflowTechnique.CHATBOT]: getChatbotDocs,
	[WorkflowTechnique.CONTENT_GENERATION]: getContentGenerationDocs,
	[WorkflowTechnique.DATA_ANALYSIS]: undefined,
	[WorkflowTechnique.DATA_EXTRACTION]: getDataExtractionDocs,
	[WorkflowTechnique.DATA_PERSISTENCE]: getDataPersistenceDocs,
	[WorkflowTechnique.DATA_TRANSFORMATION]: getDataTransformationDocs,
	[WorkflowTechnique.DOCUMENT_PROCESSING]: getDocumentProcessingDocs,
	[WorkflowTechnique.ENRICHMENT]: undefined,
	[WorkflowTechnique.FORM_INPUT]: getFormInputDocs,
	[WorkflowTechnique.KNOWLEDGE_BASE]: undefined,
	[WorkflowTechnique.NOTIFICATION]: getNotificationDocs,
	[WorkflowTechnique.TRIAGE]: getTriageDocs,
	[WorkflowTechnique.HUMAN_IN_THE_LOOP]: undefined,
	[WorkflowTechnique.MONITORING]: undefined,
	[WorkflowTechnique.SCHEDULING]: getSchedulingDocs,
};
