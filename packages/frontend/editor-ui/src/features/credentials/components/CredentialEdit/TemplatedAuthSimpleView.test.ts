import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import TemplatedAuthSimpleView from './TemplatedAuthSimpleView.vue';

const renderComponent = createComponentRenderer(TemplatedAuthSimpleView);

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

	it('falls back to the marker name when a def is missing', () => {
		const { getByText } = renderComponent({
			props: { credentialData: credentialData({ placeholderDefs: '' }) },
		});

		expect(getByText('api_key')).toBeInTheDocument();
	});

	it('replaces the typed value and keeps untouched stored values on update', async () => {
		const { getAllByTestId, emitted } = renderComponent({
			props: { credentialData: credentialData() },
		});

		const apiKeyEl = getAllByTestId('templated-auth-value-input')[0];
		await userEvent.type(apiKeyEl.querySelector('input') ?? apiKeyEl, 'Key new-secret');

		const updates = emitted<[{ name: string; value: string }]>('update');
		expect(updates).toBeTruthy();
		const last = updates[updates.length - 1][0];
		expect(last.name).toBe('placeholderValues');
		// typed value cleaned of the template prefix; untouched marker keeps ***
		expect(JSON.parse(last.value)).toEqual({ api_key: 'new-secret', api_version: '202404' });
	});
});
