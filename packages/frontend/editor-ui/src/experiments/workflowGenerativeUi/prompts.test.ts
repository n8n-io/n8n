import { followUpSystemPrompt, systemPrompt } from './prompts';

describe('systemPrompt', () => {
	const prompts = [systemPrompt('story'), systemPrompt('play')];
	const canvasPrompts = [...prompts, followUpSystemPrompt()];

	it.each(prompts)('requires exactly one archetype directly under Screen', (prompt) => {
		expect(prompt).toMatch(/exactly one (?:of the three )?archetype/i);
		expect(prompt).toMatch(/direct(?:ly)? (?:beneath|under|inside) Screen/i);
		expect(prompt).toMatch(/do not mix archetypes/i);
	});

	it.each(prompts)('selects the archetype from workflow semantics', (prompt) => {
		expect(prompt).toMatch(/leads?.*AdaptiveStoryboard/is);
		expect(prompt).toMatch(/operations|operational|monitoring/i);
		expect(prompt).toMatch(/operations?.*OutcomeBoard|monitoring.*OutcomeBoard/is);
		expect(prompt).toMatch(/chronological.*GuidedTimeline|scheduling.*GuidedTimeline/is);
	});

	it.each(prompts)('requires three to five meaningful sections', (prompt) => {
		expect(prompt).toMatch(/3(?:\s*[-–]\s*| to )5 meaningful sections/i);
		expect(prompt).toMatch(/not one section per node/i);
	});

	it.each(prompts)('does not expose styling or motion instructions', (prompt) => {
		expect(prompt).not.toMatch(
			/\b(emphasis|density|tone|orientation|motion|variant|accent|surface|radius|pad|css|hex|pixel|class names|animation)\b/i,
		);
	});

	it.each(prompts)('guides signposts, Ends, and Reveal', (prompt) => {
		expect(prompt).toMatch(/\bLane\b/);
		expect(prompt).toMatch(/Chapter\.signpost|signpost/i);
		expect(prompt).toMatch(/\bEnds\b/);
		expect(prompt).toMatch(/\bReveal\b/);
		expect(prompt).toMatch(/comesIn|works|goesOut/);
	});

	it.each(canvasPrompts)(
		'uses the connected canvas adaptively inside an archetype section',
		(prompt) => {
			expect(prompt).toMatch(/FlowCanvas only when topology is essential/i);
			expect(prompt).toMatch(/FlowCanvas.*inside a section.*chosen archetype/is);
			expect(prompt).toMatch(/never directly under Screen/i);
			expect(prompt).toMatch(/never a fourth archetype/i);
			expect(prompt).toMatch(/FlowCanvas.*Lane.*Ends.*Branch.*Timeline.*OutcomeBoard.*Reveal/is);
		},
	);

	it.each(canvasPrompts)('selects layouts from workflow meaning', (prompt) => {
		expect(prompt).toMatch(/sequence for linear handoffs/i);
		expect(prompt).toMatch(/branch for IF, Switch, or error routes/i);
		expect(prompt).toMatch(/hub for fan-in or fan-out/i);
		expect(prompt).toMatch(/parallel for independent outcomes/i);
		expect(prompt).toMatch(/auto when the structure should decide/i);
	});

	it.each(canvasPrompts)('keeps nodes and connections faithful to the payload', (prompt) => {
		expect(prompt).toMatch(/wrap each rendered node or group in FlowNode/i);
		expect(prompt).toMatch(/one existing node-adapted visual child/i);
		expect(prompt).toMatch(/ordinary connectors derive from real payload connections/i);
		expect(prompt).toMatch(/FlowConnection only when.*branch, error, or tool label/is);
		expect(prompt).toMatch(/match a real connection tuple exactly/i);
		expect(prompt).toMatch(/never invent operations or connections/i);
	});

	it.each(canvasPrompts)(
		'includes compact sequence, branch, hub, and parallel examples',
		(prompt) => {
			for (const layout of ['Sequence', 'Branch', 'Hub', 'Parallel']) {
				expect(prompt).toContain(`- ${layout}:`);
			}
		},
	);

	it.each(canvasPrompts)('does not offer model-controlled presentation', (prompt) => {
		expect(prompt).not.toMatch(
			/\b(?:set|choose|provide)\s+(?:an?\s+)?(?:x|y|coordinates?|paths?|svg|css|styles?|tokens?|motion)\b/i,
		);
	});
});
