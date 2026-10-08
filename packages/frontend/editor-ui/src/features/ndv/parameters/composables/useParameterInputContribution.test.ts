import { ref } from 'vue';
import type { NodePropertyTypes } from 'n8n-workflow';
import { parameterInputRegistry } from '@n8n/frontend-module-sdk';

import { useParameterInputContribution } from './useParameterInputContribution';

const stubComponent = { render: () => null };

describe('useParameterInputContribution', () => {
	beforeEach(() => {
		parameterInputRegistry.clear();
	});

	it('resolves no component for an unclaimed type', () => {
		const { contributedComponent } = useParameterInputContribution(
			ref<NodePropertyTypes>('string'),
		);

		expect(contributedComponent.value).toBeUndefined();
	});

	it('resolves the component a module registered', () => {
		parameterInputRegistry.register({ type: 'string', component: stubComponent });

		const { contributedComponent } = useParameterInputContribution(
			ref<NodePropertyTypes>('string'),
		);

		expect(contributedComponent.value).toBe(stubComponent);
	});

	it('reuses one async wrapper per factory, so the input does not remount', () => {
		const factory = async () => await Promise.resolve(stubComponent);
		parameterInputRegistry.register({ type: 'string', component: factory });

		const first = useParameterInputContribution(ref<NodePropertyTypes>('string'));
		const second = useParameterInputContribution(ref<NodePropertyTypes>('string'));

		expect(first.contributedComponent.value).toBe(second.contributedComponent.value);
	});

	it('follows the type ref', () => {
		parameterInputRegistry.register({ type: 'string', component: stubComponent });
		const type = ref<NodePropertyTypes>('number');

		const { contributedComponent } = useParameterInputContribution(type);
		expect(contributedComponent.value).toBeUndefined();

		type.value = 'string';
		expect(contributedComponent.value).toBe(stubComponent);
	});

	describe('capabilities', () => {
		it('defaults every flag to false for an unclaimed non-resource-locator type', () => {
			const { capabilities } = useParameterInputContribution(ref<NodePropertyTypes>('string'));

			expect(capabilities.value).toEqual({
				ownsExpressionRendering: false,
				ownsFromAiOverride: false,
				disableDrop: false,
			});
		});

		it.each<NodePropertyTypes>(['resourceLocator', 'workflowSelector', 'agentSelector'])(
			'reports the built-in capabilities for %s with no module registered',
			(type) => {
				const { capabilities } = useParameterInputContribution(ref(type));

				expect(capabilities.value).toEqual({
					ownsExpressionRendering: true,
					ownsFromAiOverride: true,
					disableDrop: true,
				});
			},
		);

		it('takes the flags a contribution declares', () => {
			parameterInputRegistry.register({
				type: 'string',
				component: stubComponent,
				capabilities: { disableDrop: true },
			});

			const { capabilities } = useParameterInputContribution(ref<NodePropertyTypes>('string'));

			expect(capabilities.value).toEqual({
				ownsExpressionRendering: false,
				ownsFromAiOverride: false,
				disableDrop: true,
			});
		});

		it('keeps the built-in capabilities when a module claims a resource-locator type', () => {
			parameterInputRegistry.register({ type: 'resourceLocator', component: stubComponent });

			const { capabilities } = useParameterInputContribution(
				ref<NodePropertyTypes>('resourceLocator'),
			);

			expect(capabilities.value.disableDrop).toBe(true);
		});
	});
});
