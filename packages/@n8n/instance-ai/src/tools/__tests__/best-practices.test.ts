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

		it('should return documentation for all techniques that have it', () => {
			const disabled = new Set<string>([
				WorkflowTechnique.DATA_ANALYSIS,
				WorkflowTechnique.ENRICHMENT,
				WorkflowTechnique.KNOWLEDGE_BASE,
				WorkflowTechnique.HUMAN_IN_THE_LOOP,
				WorkflowTechnique.MONITORING,
			]);
			for (const tech of Object.values(WorkflowTechnique)) {
				const fn = documentation[tech];
				if (disabled.has(tech)) {
					expect(fn).toBeUndefined();
				} else {
					expect(fn).toBeDefined();
					if (fn) {
						const doc = fn();
						expect(typeof doc).toBe('string');
						expect(doc.length).toBeGreaterThan(100);
					}
				}
			}
		});
	});
});
