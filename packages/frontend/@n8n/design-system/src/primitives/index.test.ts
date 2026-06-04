import {
	CollapsibleRoot,
	CollapsibleTrigger,
	CollapsibleContent,
} from '@n8n/design-system/primitives';

describe('@n8n/design-system/primitives', () => {
	it('should re-export Collapsible primitives', () => {
		expect(CollapsibleRoot).toBeDefined();
		expect(CollapsibleTrigger).toBeDefined();
		expect(CollapsibleContent).toBeDefined();
	});
});
