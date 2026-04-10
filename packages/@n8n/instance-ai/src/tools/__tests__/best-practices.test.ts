import { documentation } from '../best-practices/index';
import { TechniqueDescription, WorkflowTechnique } from '../best-practices/techniques';

describe('best-practices', () => {
	describe('WorkflowTechnique', () => {
		it('should have all expected techniques', () => {
			expect(WorkflowTechnique.SCHEDULING).toBe('scheduling');
			expect(WorkflowTechnique.CHATBOT).toBe('chatbot');
			expect(WorkflowTechnique.FORM_INPUT).toBe('form_input');
			expect(WorkflowTechnique.TRIAGE).toBe('triage');
			expect(WorkflowTechnique.NOTIFICATION).toBe('notification');
		});
	});

	describe('TechniqueDescription', () => {
		it('should have a description for every technique', () => {
			for (const value of Object.values(WorkflowTechnique)) {
				expect(TechniqueDescription[value]).toBeDefined();
				expect(typeof TechniqueDescription[value]).toBe('string');
				expect(TechniqueDescription[value].length).toBeGreaterThan(0);
			}
		});
	});

	describe('documentation registry', () => {
		it('should have an entry for every technique', () => {
			for (const value of Object.values(WorkflowTechnique)) {
				expect(value in documentation).toBe(true);
			}
		});

		it('should return documentation for techniques with guides', () => {
			const techniquesWithDocs = [
				WorkflowTechnique.SCHEDULING,
				WorkflowTechnique.CHATBOT,
				WorkflowTechnique.FORM_INPUT,
				WorkflowTechnique.SCRAPING_AND_RESEARCH,
				WorkflowTechnique.TRIAGE,
				WorkflowTechnique.CONTENT_GENERATION,
				WorkflowTechnique.DATA_EXTRACTION,
				WorkflowTechnique.DATA_PERSISTENCE,
				WorkflowTechnique.DATA_TRANSFORMATION,
				WorkflowTechnique.DOCUMENT_PROCESSING,
				WorkflowTechnique.NOTIFICATION,
			];

			for (const tech of techniquesWithDocs) {
				const fn = documentation[tech];
				expect(fn).toBeDefined();
				if (fn) {
					const doc = fn();
					expect(typeof doc).toBe('string');
					expect(doc.length).toBeGreaterThan(100);
					expect(doc).toContain('# Best Practices');
				}
			}
		});

		it('should have undefined for techniques without guides', () => {
			const techniquesWithoutDocs = [
				WorkflowTechnique.DATA_ANALYSIS,
				WorkflowTechnique.ENRICHMENT,
				WorkflowTechnique.KNOWLEDGE_BASE,
				WorkflowTechnique.HUMAN_IN_THE_LOOP,
				WorkflowTechnique.MONITORING,
			];

			for (const tech of techniquesWithoutDocs) {
				expect(documentation[tech]).toBeUndefined();
			}
		});
	});
});
