import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';
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

	it('falls back to a humanized marker name when a def is missing', () => {
		const { getByText } = renderComponent({
			props: { credentialData: credentialData({ placeholderDefs: '' }) },
		});

		expect(getByText('Api Key')).toBeInTheDocument();
	});

	it('prefills plain inputs with the stored values, like other credential fields', async () => {
		const { getAllByTestId } = renderComponent({
			props: { credentialData: credentialData() },
		});

		const [, apiVersion] = getAllByTestId('templated-auth-value-input');
		await waitFor(() =>
			expect(apiVersion.querySelector('input') ?? apiVersion).toHaveValue('202404'),
		);
	});

	it('displays the stored redacted sentinel as a full-length mask, like native credential fields', async () => {
		const { getAllByTestId } = renderComponent({
			props: { credentialData: credentialData() },
		});

		// the 3-char `***` sentinel renders as the same blanking value native
		// fields use, so a redacted secret doesn't show as three dots
		const [apiKey] = getAllByTestId('templated-auth-value-input');
		await waitFor(() =>
			expect(apiKey.querySelector('input') ?? apiKey).toHaveValue(CREDENTIAL_BLANKING_VALUE),
		);
	});

	it('keeps the untouched `***` sentinel — not the display mask — when composing', async () => {
		const { getAllByTestId, emitted } = renderComponent({
			props: {
				// api_key is stored redacted; api_version has no stored value yet
				credentialData: credentialData({
					placeholderValues: JSON.stringify({ api_key: '***' }),
				}),
			},
		});

		// edit the plain field; the untouched redacted field must round-trip `***`
		// so the server merges back the stored secret
		const apiVersionEl = getAllByTestId('templated-auth-value-input')[1];
		const input = apiVersionEl.querySelector('input') ?? apiVersionEl;
		await userEvent.type(input, '202501');

		await waitFor(() => {
			const updates = emitted<[{ name: string; value: string }]>('update');
			expect(updates).toBeTruthy();
			const last = updates[updates.length - 1][0];
			expect(JSON.parse(last.value)).toEqual({ api_key: '***', api_version: '202501' });
		});
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

	it('fills markers whose names contain dots', async () => {
		// ParameterInputExpanded truncates dotted parameter names to the last
		// path segment — the inputs' index-based names must survive that and map
		// back to the real marker
		const { getAllByTestId, emitted } = renderComponent({
			props: {
				credentialData: {
					template: JSON.stringify({ headers: { 'X-Key': '{{api.key}}' } }),
					placeholderValues: JSON.stringify({}),
				},
			},
		});

		const el = getAllByTestId('templated-auth-value-input')[0];
		await userEvent.type(el.querySelector('input') ?? el, 'secret');

		await waitFor(() => {
			const updates = emitted<[{ name: string; value: string }]>('update');
			expect(updates).toBeTruthy();
			const last = updates[updates.length - 1][0];
			expect(JSON.parse(last.value)).toEqual({ 'api.key': 'secret' });
		});
	});

	it('leaves empty optional placeholders out of the composed values', async () => {
		const { getAllByTestId, emitted } = renderComponent({
			props: {
				credentialData: credentialData({
					placeholderDefs: JSON.stringify([
						{ name: 'api_key', title: 'fal.ai API key', type: 'password' },
						{ name: 'api_version', title: 'API version', type: 'plain', optional: true },
					]),
					// only the required marker has a stored value
					placeholderValues: JSON.stringify({}),
				}),
			},
		});

		const apiKeyEl = getAllByTestId('templated-auth-value-input')[0];
		const input = apiKeyEl.querySelector('input') ?? apiKeyEl;
		await userEvent.type(input, 'new-secret');

		// the untouched empty optional must not be stored as '' — it would come
		// back redacted and read like a saved secret
		await waitFor(() => {
			const updates = emitted<[{ name: string; value: string }]>('update');
			expect(updates).toBeTruthy();
			const last = updates[updates.length - 1][0];
			expect(JSON.parse(last.value)).toEqual({ api_key: 'new-secret' });
		});
	});
});
