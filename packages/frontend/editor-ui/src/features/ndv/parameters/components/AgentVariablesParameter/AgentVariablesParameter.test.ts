import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import type { INodeProperties } from 'n8n-workflow';
import AgentVariablesParameter from './AgentVariablesParameter.vue';
import { createComponentRenderer } from '@/__tests__/render';

const { getAgentConfig } = vi.hoisted(() => ({ getAgentConfig: vi.fn() }));

vi.mock('@/features/agents/composables/useAgentApi', () => ({ getAgentConfig }));
vi.mock('@/features/agents/composables/useAgentScopeProjectId', async () => {
	const { computed } = await import('vue');
	return { useAgentScopeProjectId: () => computed(() => 'proj-1') };
});
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

// Minimal stand-in for the real input: a text box wired to the same props/events.
vi.mock('../ParameterInputFull.vue', async () => {
	const { defineComponent, h } = await import('vue');
	return {
		default: defineComponent({
			props: ['parameter', 'value', 'path', 'isReadOnly'],
			emits: ['update'],
			setup(props, { emit }) {
				return () =>
					h('input', {
						'data-test-id': `input-${props.parameter.name}`,
						placeholder: props.parameter.placeholder,
						title: props.parameter.description,
						'data-path': props.path,
						value: props.value,
						onInput: (e: Event) =>
							emit('update', {
								name: props.path,
								value: (e.target as HTMLInputElement).value,
							}),
					});
			},
		}),
	};
});

const parameter: INodeProperties = {
	displayName: 'Agent Variables',
	name: 'trustedValues',
	type: 'fixedCollection',
	default: {},
	typeOptions: { multipleValues: true, agentVariables: true },
};

const tools = [
	{
		type: 'node',
		name: 'dashboard',
		node: { nodeParameters: { url: '={{ $json.dashboard_url }}', t: '={{ $json.tenant }}' } },
		trustedMetadata: { dashboard_url: { mode: 'fixed', value: 'https://default.example' } },
	},
];

const renderComponent = createComponentRenderer(AgentVariablesParameter);

function render(values?: unknown) {
	return renderComponent({
		props: {
			parameter,
			path: 'trustedValues',
			values,
			nodeValues: { agentSource: 'referenced', agentId: { __rl: true, mode: 'list', value: 'a1' } },
		} as never,
	});
}

describe('AgentVariablesParameter', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		getAgentConfig.mockReset();
		getAgentConfig.mockResolvedValue({ config: { tools }, configHash: 'h' });
	});

	it('lists the variables of the agent without manual add or name controls', async () => {
		const { findByTestId, queryByRole, queryByText } = render();
		await findByTestId('input-dashboard_url');
		await findByTestId('input-tenant');
		expect(getAgentConfig).toHaveBeenCalledWith(expect.anything(), 'proj-1', 'a1');
		expect(queryByRole('button')).toBeNull();
		expect(queryByText(/add/i)).toBeNull();
	});

	it('shows the tool default as placeholder', async () => {
		const { findByTestId } = render();
		const input = await findByTestId('input-dashboard_url');
		expect(input).toHaveAttribute('placeholder', 'https://default.example');
		expect(await findByTestId('input-tenant')).not.toHaveAttribute('placeholder');
	});

	it('stores only filled values', async () => {
		const { findByTestId, emitted } = render();
		await userEvent.type(await findByTestId('input-tenant'), 'a');
		const events = emitted('valueChanged') as Array<[{ name: string; value: unknown }]>;
		expect(events.at(-1)?.[0]).toEqual({
			name: 'trustedValues.values',
			value: [{ name: 'tenant', value: 'a' }],
		});
	});

	it('removes the entry when the input is cleared', async () => {
		const { findByTestId, emitted } = render({
			values: [
				{ name: 'tenant', value: 'a' },
				{ name: 'dashboard_url', value: 'x' },
			],
		});
		await userEvent.clear(await findByTestId('input-tenant'));
		const events = emitted('valueChanged') as Array<[{ name: string; value: unknown }]>;
		expect(events.at(-1)?.[0].value).toEqual([{ name: 'dashboard_url', value: 'x' }]);
	});

	it('flags saved entries the agent does not use and lets the user remove them', async () => {
		const { findByTestId, emitted } = render({ values: [{ name: 'legacy', value: 'z' }] });
		await findByTestId('input-legacy');
		expect(await findByTestId('agent-variable-unused')).toBeInTheDocument();
		await userEvent.click(await findByTestId('agent-variable-remove'));
		await waitFor(() => {
			const events = emitted('valueChanged') as Array<[{ name: string; value: unknown }]>;
			expect(events.at(-1)?.[0]).toEqual({ name: 'trustedValues.values', value: undefined });
		});
	});

	it('uses the saved entry index for the row path, not the render index', async () => {
		const { findByTestId } = render({
			values: [
				{ name: 'tenant', value: 'a' },
				{ name: 'dashboard_url', value: 'x' },
			],
		});
		const dashboard = await findByTestId('input-dashboard_url');
		const tenant = await findByTestId('input-tenant');
		expect(dashboard).toHaveValue('x');
		expect(dashboard).toHaveAttribute('data-path', 'trustedValues.values[1].value');
		expect(tenant).toHaveValue('a');
		expect(tenant).toHaveAttribute('data-path', 'trustedValues.values[0].value');
	});

	it('uses append positions for variables without a saved entry', async () => {
		const { findByTestId } = render({ values: [{ name: 'tenant', value: 'a' }] });
		expect(await findByTestId('input-dashboard_url')).toHaveAttribute(
			'data-path',
			'trustedValues.values[1].value',
		);
		expect(await findByTestId('input-tenant')).toHaveAttribute(
			'data-path',
			'trustedValues.values[0].value',
		);
	});

	it('reads the variables of an inline agent stored as a JSON string', async () => {
		const { findByTestId } = renderComponent({
			props: {
				parameter,
				path: 'trustedValues',
				nodeValues: { agentSource: 'inline', inlineAgent: JSON.stringify({ config: { tools } }) },
			} as never,
		});
		await findByTestId('input-dashboard_url');
		expect(getAgentConfig).not.toHaveBeenCalled();
	});

	it('treats an invalid inline agent JSON string as no variables', async () => {
		const { findByTestId, queryByTestId } = renderComponent({
			props: {
				parameter,
				path: 'trustedValues',
				nodeValues: { agentSource: 'inline', inlineAgent: '{not json' },
			} as never,
		});
		await findByTestId('agent-variables-empty');
		expect(queryByTestId('input-dashboard_url')).toBeNull();
	});
});
