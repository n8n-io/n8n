import { describe, expect, it } from 'vitest';

import { hasResumeCondition, type WaitDeclaration } from '../execution.types';

describe('hasResumeCondition', () => {
	it.each<[string, WaitDeclaration]>([
		['a deadline', { resumeAt: '2099-01-01T00:00:00.000Z', outputsAtDeadline: [] }],
		['a resume binding', { resumeBinding: 'execution' }],
		['a sub-execution', { subExecutionId: 'exec-sub' }],
	])('holds for a wait on %s', (_, wait) => {
		expect(hasResumeCondition(wait)).toBe(true);
	});

	it.each([{}, { resumeBinding: null }, { resumeBinding: 'bogus' }])(
		'does not hold for a declaration built outside the type system %#',
		(declaration) => {
			expect(hasResumeCondition(declaration as WaitDeclaration)).toBe(false);
		},
	);
});
