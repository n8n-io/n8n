import { createComponentRenderer } from '@/__tests__/render';
import ImpactTag from './ImpactTag.vue';

const renderComponent = createComponentRenderer(ImpactTag);

describe('ImpactTag', () => {
	it.each([
		{ impact: 'upgradeBlocked', label: 'Upgrade blocked', variant: 'danger' },
		{ impact: 'executionsFail', label: 'Executions fail', variant: 'danger' },
		{ impact: 'behaviorChanges', label: 'Behavior changes', variant: 'warning' },
		{ impact: 'capabilityRemoved', label: 'Capability removed', variant: 'outline' },
	] as const)(
		'should render the $impact impact with label "$label" and the $variant variant',
		({ impact, label, variant }) => {
			const { getByTestId } = renderComponent({ props: { impact } });

			const tag = getByTestId('migration-rule-impact-tag');
			expect(tag).toHaveTextContent(label);
			expect(tag.className).toContain(variant);
		},
	);
});
