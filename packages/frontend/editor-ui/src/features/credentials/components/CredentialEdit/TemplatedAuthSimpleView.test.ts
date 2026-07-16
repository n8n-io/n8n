import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import TemplatedAuthSimpleView from './TemplatedAuthSimpleView.vue';

// ParameterInputExpanded transitively derives the workflow id from the route
// (focus panel store); these tests run without a router.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

// ParameterInputExpanded pulls real stores (ui, settings, workflows fallback
// for the document-store inject), so the renderer needs an active pinia.
const pinia = createTestingPinia({ stubActions: false });
setActivePinia(pinia);

const renderComponent = createComponentRenderer(TemplatedAuthSimpleView, { pinia });

const credentialData = (overrides: Record<string, string> = {}) => ({
	template: JSON.stringify({
		headers: { Authorization: 'Key {{api_key}}', 'api-version': '{{api_version}}' },
	}),
	placeholderDefs: JSON.stringify([
		{ name: 'api_key', title: 'fal.ai API key', info: 'Dashboard → Keys', type: 'password' },
		{ name: 'api_version', title: 'API version', type: 'plain' },
	]),
	placeholderValues: JSON.stringify({ api_key: '***', api_version: '202404' }),
	...overrides,
});

describe('TemplatedAuthSimpleView', () => {
	it('renders one input per template marker, labeled from the defs', () => {
		const { getAllByTestId, getByText } = renderComponent({
			props: { credentialData: credentialData() },
		});

		expect(getAllByTestId('templated-auth-value-input')).toHaveLength(2);
		expect(getByText('fal.ai API key')).toBeInTheDocument();
		expect(getByText('API version')).toBeInTheDocument();
	});

	it('masks inputs unless the def marks them plain', () => {
		const { getAllByTestId } = renderComponent({
			props: { credentialData: credentialData() },
		});

		const [apiKey, apiVersion] = getAllByTestId('templated-auth-value-input');
		expect(apiKey.querySelector('input') ?? apiKey).toHaveAttribute('type', 'password');
		expect(apiVersion.querySelector('input') ?? apiVersion).toHaveAttribute('type', 'text');
	});

	it('shows expression values in the expression editor, like native credential fields', () => {
		const { getAllByTestId } = renderComponent({
			props: {
				credentialData: credentialData({
					placeholderValues: JSON.stringify({
						api_key: '={{ $secrets.vault.replicate }}',
						api_version: '202404',
					}),
				}),
			},
		});

		const [apiKey] = getAllByTestId('templated-auth-value-input');
		// an expression renders the (unmasked) expression editor, not a password input
		expect(apiKey.querySelector('input[type="password"]')).toBeNull();
		expect(apiKey.textContent).toContain('Expression');
	});

	it('falls back to the marker name when a def is missing', () => {
		const { getByText } = renderComponent({
			props: { credentialData: credentialData({ placeholderDefs: '' }) },
		});

		expect(getByText('api_key')).toBeInTheDocument();
	});

	it('prefills plain inputs with the stored values, like other credential fields', async () => {
		const { getAllByTestId } = renderComponent({
			props: { credentialData: credentialData() },
		});

		// masked display of the redacted sentinel is ParameterInput's own domain;
		// this component's contract is passing the stored values through.
		const [, apiVersion] = getAllByTestId('templated-auth-value-input');
		await waitFor(() =>
			expect(apiVersion.querySelector('input') ?? apiVersion).toHaveValue('202404'),
		);
	});

	it('composes typed values and keeps untouched stored values on update', async () => {
		const { getAllByTestId, emitted } = renderComponent({
			props: {
				// api_key has no stored value yet; api_version is saved
				credentialData: credentialData({
					placeholderValues: JSON.stringify({ api_version: '202404' }),
				}),
			},
		});

		const apiKeyEl = getAllByTestId('templated-auth-value-input')[0];
		const input = apiKeyEl.querySelector('input') ?? apiKeyEl;
		await userEvent.type(input, 'Key new-secret');

		// ParameterInput debounces value updates — wait for the final compose:
		// typed value cleaned of the template prefix; the untouched marker keeps
		// its stored value, which merges back to the real secret on save
		await waitFor(() => {
			const updates = emitted<[{ name: string; value: string }]>('update');
			expect(updates).toBeTruthy();
			const last = updates[updates.length - 1][0];
			expect(last.name).toBe('placeholderValues');
			expect(JSON.parse(last.value)).toEqual({ api_key: 'new-secret', api_version: '202404' });
		});
	});

	it('renders the docs link when the credential stores a documentation URL', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				credentialData: credentialData({ docsUrl: 'https://replicate.com/account/api-tokens' }),
			},
		});

		expect(getByTestId('templated-auth-docs-link')).toBeInTheDocument();
		expect(
			queryByTestId('templated-auth-docs-link')?.closest('a')?.getAttribute('href') ??
				getByTestId('templated-auth-docs-link').getAttribute('href'),
		).toContain('replicate.com/account/api-tokens');
	});
});
