import { objectiveTemplateGaps, TASK_OBJECTIVE_SECTIONS } from '../task-objective-template';

function objectiveWith(sections: Array<[string, string]>): string {
	return sections.map(([heading, body]) => `## ${heading}\n${body}`).join('\n\n');
}

const complete: Array<[string, string]> = TASK_OBJECTIVE_SECTIONS.map((heading) => [
	heading,
	`Concrete ${heading.toLowerCase()} for this run.`,
]);

describe('objectiveTemplateGaps', () => {
	it('reports no gaps for a complete objective', () => {
		expect(objectiveTemplateGaps(objectiveWith(complete))).toEqual([]);
	});

	it('reports a missing section', () => {
		const objective = objectiveWith(complete.filter(([heading]) => heading !== 'Context'));

		expect(objectiveTemplateGaps(objective)).toEqual(['Context missing']);
	});

	it('reports an empty section', () => {
		const objective = objectiveWith(
			complete.map(([heading, body]) => [heading, heading === 'Steps' ? '' : body]),
		);

		expect(objectiveTemplateGaps(objective)).toEqual(['Steps empty']);
	});

	it('reports a section that still has template placeholder text', () => {
		const objective = objectiveWith(
			complete.map(([heading, body]) => [
				heading,
				heading === 'Output' ? '<The exact format of the result>' : body,
			]),
		);

		expect(objectiveTemplateGaps(objective)).toEqual(['Output has placeholder text']);
	});

	it('reports sections in the wrong order', () => {
		const [first, second, ...rest] = complete;

		expect(objectiveTemplateGaps(objectiveWith([second, first, ...rest]))).toEqual([
			'sections out of order',
		]);
	});

	it('accepts a heading with a trailing colon', () => {
		const objective = objectiveWith(
			complete.map(([heading, body]) => [heading === 'Context' ? 'Context:' : heading, body]),
		);

		expect(objectiveTemplateGaps(objective)).toEqual([]);
	});

	it('does not read a bare ## line and the next line as one heading', () => {
		const objective = objectiveWith(complete).replace('## Context\n', '##\nContext\n');

		expect(objectiveTemplateGaps(objective)).toContain('Context missing');
	});

	it('reports a repeated section', () => {
		const objective = objectiveWith([...complete, ['Steps', '3. Do it again.']]);

		expect(objectiveTemplateGaps(objective)).toEqual(['Steps repeated']);
	});

	it('reports a section that the template does not have', () => {
		const objective = objectiveWith([...complete, ['Notes', 'Extra notes.']]);

		expect(objectiveTemplateGaps(objective)).toEqual(['unexpected section "Notes"']);
	});
});
