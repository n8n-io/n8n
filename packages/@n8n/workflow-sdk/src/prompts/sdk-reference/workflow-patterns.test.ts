import { WORKFLOW_SDK_PATTERNS } from './workflow-patterns';

describe('WORKFLOW_SDK_PATTERNS', () => {
	it('does not show empty parameter blocks for Set node examples', () => {
		const setNodeExamples = [
			...WORKFLOW_SDK_PATTERNS.matchAll(
				/node\(\{\n\s+type: 'n8n-nodes-base\.set',[^\n]*[\s\S]*?\n\}\);/g,
			),
		];

		expect(setNodeExamples.length).toBeGreaterThan(0);
		expect(setNodeExamples.map((example) => example[0])).not.toContainEqual(
			expect.stringContaining('parameters: {}'),
		);
	});
});
