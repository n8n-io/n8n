import { buildDeicticResolutionPrompt, type DeicticExamples } from './deictic-resolution';

describe('buildDeicticResolutionPrompt', () => {
	describe('basic structure', () => {
		it('should include the header', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test context',
				selectedNodes: [],
				workflowFallback: [],
			});

			expect(result).toContain('DEICTIC REFERENCE RESOLUTION (in priority order):');
		});

		it('should include conversation context section', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'use the established referent',
				selectedNodes: [],
				workflowFallback: [],
			});

			expect(result).toContain('1. CONVERSATION CONTEXT (highest priority):');
			expect(result).toContain('use the established referent');
		});

		it('should include selected nodes section', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: ['"change this" → modify selected'],
				workflowFallback: [],
			});

			expect(result).toContain('2. SELECTED NODES');
			expect(result).toContain('"change this" → modify selected');
		});

		it('should include singular/plural handling guidance', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
			});

			expect(result).toContain('SINGULAR vs PLURAL handling:');
			expect(result).toContain('If nodes are similar (same type), address them together');
			expect(result).toContain('If nodes are different types');
		});

		it('should include workflow fallback section', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: ['"explain this" → explain the workflow'],
			});

			expect(result).toContain('WORKFLOW FALLBACK');
			expect(result).toContain('"explain this" → explain the workflow');
		});

		it('should include disambiguation section', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
			});

			expect(result).toContain('DISAMBIGUATION:');
			expect(result).toContain('If 2+ nodes match a reference equally well');
			expect(result).toContain('For destructive actions (delete, disconnect), always confirm');
		});

		it('should include negation section', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
			});

			expect(result).toContain('NEGATION:');
			expect(result).toContain('"not this one" / "not X"');
			expect(result).toContain('"the other one"');
		});
	});

	describe('positional references', () => {
		it('should include positional references section when provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
				positionalReferences: [
					'"previous node" → use incomingConnections',
					'"next node" → use outgoingConnections',
				],
			});

			expect(result).toContain('3. POSITIONAL REFERENCES');
			expect(result).toContain('"previous" / "before" / "upstream"');
			expect(result).toContain('"next" / "after" / "downstream"');
			expect(result).toContain('"previous node" → use incomingConnections');
			expect(result).toContain('"next node" → use outgoingConnections');
		});

		it('should not include positional references section when not provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
			});

			expect(result).not.toContain('POSITIONAL REFERENCES');
		});

		it('should include standard positional reference patterns', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
				positionalReferences: ['test'],
			});

			expect(result).toContain('"first" / "start"');
			expect(result).toContain('"last" / "end"');
			expect(result).toContain('incomingConnections');
			expect(result).toContain('outgoingConnections');
		});
	});

	describe('explicit name mentions', () => {
		it('should include explicit name mentions section when provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
				explicitNameMentions: ['"configure the HTTP Request" → find and configure by name'],
			});

			expect(result).toContain('EXPLICIT NAME MENTIONS');
			expect(result).toContain('"the [NodeName] node" → resolve by exact name match');
			expect(result).toContain('"configure the HTTP Request" → find and configure by name');
		});

		it('should not include explicit name mentions section when not provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
			});

			expect(result).not.toContain('EXPLICIT NAME MENTIONS');
		});

		it('should number explicit name mentions as tier 4 when positional refs exist', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
				positionalReferences: ['test'],
				explicitNameMentions: ['test'],
			});

			expect(result).toContain('3. POSITIONAL REFERENCES');
			expect(result).toContain('4. EXPLICIT NAME MENTIONS');
		});

		it('should number explicit name mentions as tier 3 when no positional refs', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
				explicitNameMentions: ['test'],
			});

			expect(result).toContain('3. EXPLICIT NAME MENTIONS');
		});
	});

	describe('attribute-based references', () => {
		it('should include attribute-based references section when provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
				attributeBasedReferences: ['"fix the broken one" → node with issues'],
			});

			expect(result).toContain('ATTRIBUTE-BASED REFERENCES');
			expect(result).toContain('"the broken one" / "the red one"');
			expect(result).toContain('"fix the broken one" → node with issues');
		});

		it('should not include attribute-based references section when not provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
			});

			expect(result).not.toContain('ATTRIBUTE-BASED REFERENCES');
		});

		it('should include standard attribute patterns', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
				attributeBasedReferences: ['test'],
			});

			expect(result).toContain('nodes with non-empty <issues>');
			expect(result).toContain('"the unconfigured one"');
			expect(result).toContain('"the new one"');
		});
	});

	describe('dual references', () => {
		it('should include dual references section when provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
				dualReferences: ['"connect this to that" → clarify both'],
			});

			expect(result).toContain('DUAL REFERENCES');
			expect(result).toContain('"connect this to that"');
			expect(result).toContain('"connect this to that" → clarify both');
		});

		it('should not include dual references section when not provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
			});

			expect(result).not.toContain('DUAL REFERENCES');
		});

		it('should include standard dual reference patterns', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
				dualReferences: ['test'],
			});

			expect(result).toContain('"connect this to [NodeName]"');
			expect(result).toContain('"move this before that"');
		});
	});

	describe('tier numbering', () => {
		it('should number workflow fallback correctly with no optional sections', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: ['test'],
			});

			expect(result).toContain('3. WORKFLOW FALLBACK');
		});

		it('should number workflow fallback correctly with all optional sections', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: ['test'],
				positionalReferences: ['test'],
				explicitNameMentions: ['test'],
				attributeBasedReferences: ['test'],
			});

			expect(result).toContain('6. WORKFLOW FALLBACK');
		});

		it('should number workflow fallback correctly with some optional sections', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: ['test'],
				positionalReferences: ['test'],
				attributeBasedReferences: ['test'],
			});

			expect(result).toContain('5. WORKFLOW FALLBACK');
		});
	});

	describe('legacy examples', () => {
		it('should include general examples when provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
				examples: ['Example 1: this happens', 'Example 2: that happens'],
			});

			expect(result).toContain('Examples:');
			expect(result).toContain('- Example 1: this happens');
			expect(result).toContain('- Example 2: that happens');
		});

		it('should include examples with selection when provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
				examplesWithSelection: ['User selects node, says "fix" → fix node'],
			});

			expect(result).toContain('Examples with selection:');
			expect(result).toContain('- User selects node, says "fix" → fix node');
		});

		it('should include examples without selection when provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
				examplesWithoutSelection: ['No selection + "fix all" → fix all nodes'],
			});

			expect(result).toContain('Examples without selection:');
			expect(result).toContain('- No selection + "fix all" → fix all nodes');
		});

		it('should not include example sections when not provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
			});

			expect(result).not.toContain('Examples:');
			expect(result).not.toContain('Examples with selection:');
			expect(result).not.toContain('Examples without selection:');
		});
	});

	describe('additional notes', () => {
		it('should include additional notes when provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
				additionalNotes: 'IMPORTANT: Always prioritize selected nodes.',
			});

			expect(result).toContain('IMPORTANT: Always prioritize selected nodes.');
		});

		it('should not include additional notes section when not provided', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: [],
				workflowFallback: [],
			});

			// Should end with NEGATION section
			const lines = result.trim().split('\n');
			const lastNonEmptyLine = lines.filter((l) => l.trim()).pop();
			expect(lastNonEmptyLine).toContain('NOT selected/NOT recently mentioned');
		});
	});

	describe('comprehensive prompt', () => {
		it('should generate a complete prompt with all options', () => {
			const examples: DeicticExamples = {
				conversationContext: 'use established referent from conversation',
				selectedNodes: [
					'"change this" → modify selected node',
					'"fix this" → address issues in selected node',
				],
				positionalReferences: [
					'"configure previous" → configure upstream node',
					'"update next" → update downstream node',
				],
				explicitNameMentions: [
					'"configure HTTP Request" → find node by name',
					'"explain Gmail" → explain the Gmail node',
				],
				attributeBasedReferences: [
					'"fix broken one" → fix node with issues',
					'"configure unconfigured" → configure nodes missing params',
				],
				dualReferences: [
					'"connect this to that" → resolve both references',
					'"copy from this to Gmail" → selected to named node',
				],
				workflowFallback: [
					'"fix this" → fix all nodes',
					'"explain this" → explain entire workflow',
				],
				examples: ['General example 1', 'General example 2'],
				examplesWithSelection: ['Selection example 1'],
				examplesWithoutSelection: ['No selection example 1'],
				additionalNotes: 'Custom note for this agent.',
			};

			const result = buildDeicticResolutionPrompt(examples);

			// Verify all sections are present
			expect(result).toContain('1. CONVERSATION CONTEXT');
			expect(result).toContain('2. SELECTED NODES');
			expect(result).toContain('3. POSITIONAL REFERENCES');
			expect(result).toContain('4. EXPLICIT NAME MENTIONS');
			expect(result).toContain('5. ATTRIBUTE-BASED REFERENCES');
			expect(result).toContain('6. WORKFLOW FALLBACK');
			expect(result).toContain('DUAL REFERENCES');
			expect(result).toContain('DISAMBIGUATION:');
			expect(result).toContain('NEGATION:');
			expect(result).toContain('Examples:');
			expect(result).toContain('Examples with selection:');
			expect(result).toContain('Examples without selection:');
			expect(result).toContain('Custom note for this agent.');
		});

		it('should maintain correct order of sections', () => {
			const result = buildDeicticResolutionPrompt({
				conversationContext: 'test',
				selectedNodes: ['test'],
				positionalReferences: ['test'],
				explicitNameMentions: ['test'],
				attributeBasedReferences: ['test'],
				dualReferences: ['test'],
				workflowFallback: ['test'],
			});

			const conversationIdx = result.indexOf('1. CONVERSATION CONTEXT');
			const selectedIdx = result.indexOf('2. SELECTED NODES');
			const positionalIdx = result.indexOf('3. POSITIONAL REFERENCES');
			const explicitIdx = result.indexOf('4. EXPLICIT NAME MENTIONS');
			const attributeIdx = result.indexOf('5. ATTRIBUTE-BASED REFERENCES');
			const fallbackIdx = result.indexOf('6. WORKFLOW FALLBACK');
			const dualIdx = result.indexOf('DUAL REFERENCES');
			const disambiguationIdx = result.indexOf('DISAMBIGUATION:');
			const negationIdx = result.indexOf('NEGATION:');

			expect(conversationIdx).toBeLessThan(selectedIdx);
			expect(selectedIdx).toBeLessThan(positionalIdx);
			expect(positionalIdx).toBeLessThan(explicitIdx);
			expect(explicitIdx).toBeLessThan(attributeIdx);
			expect(attributeIdx).toBeLessThan(fallbackIdx);
			expect(fallbackIdx).toBeLessThan(dualIdx);
			expect(dualIdx).toBeLessThan(disambiguationIdx);
			expect(disambiguationIdx).toBeLessThan(negationIdx);
		});
	});
});
