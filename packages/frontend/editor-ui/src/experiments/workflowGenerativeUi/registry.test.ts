import { describe, expect, it } from 'vitest';
import { registry } from './registry';

describe('registry', () => {
	it.each(['AdaptiveStoryboard', 'OutcomeBoard', 'GuidedTimeline'] as const)(
		'resolves %s',
		(component) => {
			expect(registry[component]).toBeDefined();
		},
	);

	it.each(['Lane', 'Ends', 'Reveal'] as const)('resolves %s', (component) => {
		expect(registry[component]).toBeDefined();
	});

	it.each(['FlowCanvas', 'FlowNode', 'FlowConnection'] as const)('resolves %s', (component) => {
		expect(registry[component]).toBeDefined();
	});
});
