import { defineComponent, h, ref } from 'vue';
import { render, waitFor } from '@testing-library/vue';
import type { Component } from 'vue';
import type { NodePropertyTypes } from 'n8n-workflow';
import { parameterInputRegistry } from '@n8n/frontend-module-sdk';

import { useParameterInputContribution } from './useParameterInputContribution';

const stubComponent = { render: () => null };

/** Mounts a resolved contribution, which is the only way the async wrapper runs. */
function renderResolved(component: Component) {
	return render(defineComponent(() => () => h(component)));
}

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

	describe('a chunk that fails to load', () => {
		beforeEach(() => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('retries once, then renders the error state instead of an empty field', async () => {
			const loader = vi.fn(async () => await Promise.reject(new Error('chunk 404')));
			parameterInputRegistry.register({ type: 'string', component: loader });

			const { contributedComponent } = useParameterInputContribution(
				ref<NodePropertyTypes>('string'),
			);
			const { getByTestId } = renderResolved(contributedComponent.value!);

			await waitFor(() => expect(getByTestId('parameter-input-load-error')).toBeVisible());
			expect(loader).toHaveBeenCalledTimes(2);
		});

		it('does not leave the load rejection uncaught', async () => {
			const onUnhandled = vi.fn();
			window.addEventListener('unhandledrejection', onUnhandled);
			const loader = async () => await Promise.reject(new Error('chunk 404'));
			parameterInputRegistry.register({ type: 'string', component: loader });

			const { contributedComponent } = useParameterInputContribution(
				ref<NodePropertyTypes>('string'),
			);
			const { getByTestId } = renderResolved(contributedComponent.value!);

			await waitFor(() => expect(getByTestId('parameter-input-load-error')).toBeVisible());
			expect(onUnhandled).not.toHaveBeenCalled();
			window.removeEventListener('unhandledrejection', onUnhandled);
		});

		it('recovers when a retry succeeds', async () => {
			const loader = vi
				.fn()
				.mockRejectedValueOnce(new Error('dropped request'))
				.mockResolvedValue({ render: () => h('div', { 'data-test-id': 'contributed' }) });
			parameterInputRegistry.register({ type: 'string', component: loader });

			const { contributedComponent } = useParameterInputContribution(
				ref<NodePropertyTypes>('string'),
			);
			const { getByTestId } = renderResolved(contributedComponent.value!);

			await waitFor(() => expect(getByTestId('contributed')).toBeVisible());
		});
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
