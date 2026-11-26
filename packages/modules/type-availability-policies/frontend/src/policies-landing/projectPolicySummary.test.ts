import { describe, expect, it } from 'vitest';

import { projectPolicySummary } from './projectPolicySummary';
import { mockProjectPolicy } from '../__tests__/mocks';

const counts = (restricted: number, optedIn: number) => ({
	restricted,
	optedIn,
	effective: { allowed: 0, restricted: 0 },
});

const project = (node: [number, number], credential: [number, number]) =>
	mockProjectPolicy({
		projectId: 'project-1',
		name: 'Finance',
		hasPolicy: true,
		node: counts(...node),
		credential: counts(...credential),
	});

describe('projectPolicySummary', () => {
	it.each([
		[[5, 0], [2, 0], 'Restricts 5 nodes and 2 credentials'],
		[[1, 0], [1, 0], 'Restricts 1 node and 1 credential'],
		[[3, 0], [0, 0], 'Restricts 3 nodes'],
		[[0, 0], [2, 0], 'Restricts 2 credentials'],
		[[0, 2], [0, 1], 'Opted in to 2 nodes and 1 credential'],
		[[5, 0], [0, 1], 'Restricts 5 nodes · Opted in to 1 credential'],
		[[0, 0], [0, 0], 'Follows the instance policy, no rules of its own yet'],
	] as const)('node %j and credential %j read "%s"', (node, credential, expected) => {
		expect(projectPolicySummary(project([...node], [...credential]))).toBe(expected);
	});
});
