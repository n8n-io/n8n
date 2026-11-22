import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';

import { createEntry, emptyRequest } from '../draftMapping';
import type { EditableRequest, WizardIssue } from '../wizard.types';
import RequestStep from './RequestStep.vue';

vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const { N8nSelect2Stub } = await import('../../__tests__/designSystemStubs');
	return { ...actual, N8nSelect2: N8nSelect2Stub };
});

const renderStep = createComponentRenderer(RequestStep);

const setup = (
	props: { request?: EditableRequest; absoluteUrl?: boolean; issues?: WizardIssue[] } = {},
) =>
	renderStep({
		props: {
			request: props.request ?? emptyRequest(),
			absoluteUrl: props.absoluteUrl ?? false,
			baseUrl: 'https://api.acme.test/v1',
			issues: props.issues ?? [],
		},
	});

const lastRequest = (emitted: Record<string, unknown[]>): EditableRequest => {
	const events = emitted['update:request'];
	const [request] = events[events.length - 1] as [EditableRequest];
	return request;
};

describe('RequestStep', () => {
	it('explains that the URL of a parent node must be absolute', () => {
		const { getByTestId } = setup({ absoluteUrl: true });

		expect(getByTestId('custom-action-wizard-url-hint')).toHaveTextContent(
			'Enter the full URL, for example https://api.example.com/v1/items/{id}.',
		);
	});

	it('explains that the URL of a custom node is a path after the base URL', () => {
		const { getByTestId, getByText } = setup();

		expect(getByTestId('custom-action-wizard-url-hint')).toHaveTextContent(
			'Enter a path after the base URL',
		);
		expect(getByText('https://api.acme.test/v1')).toBeInTheDocument();
	});

	it('emits the method and the URL', async () => {
		const { getByTestId, emitted } = setup();

		await userEvent.selectOptions(getByTestId('custom-action-wizard-method'), 'POST');
		expect(lastRequest(emitted()).method).toBe('POST');

		await userEvent.type(getByTestId('custom-action-wizard-url'), '/');
		expect(lastRequest(emitted()).url).toBe('/');
	});

	it('adds, edits and removes a fixed header', async () => {
		const request = { ...emptyRequest(), headers: [createEntry('Accept', 'text/plain')] };
		const { getByTestId, emitted } = setup({ request });

		await userEvent.type(getByTestId('custom-action-wizard-headers-value'), 'x');
		expect(lastRequest(emitted()).headers).toEqual([
			expect.objectContaining({ key: 'Accept', value: 'text/plainx' }),
		]);

		await userEvent.click(getByTestId('custom-action-wizard-headers-remove'));
		expect(lastRequest(emitted()).headers).toEqual([]);

		await userEvent.click(getByTestId('custom-action-wizard-headers-add'));
		expect(lastRequest(emitted()).headers).toEqual([expect.objectContaining({ key: '' })]);
	});

	it('adds a fixed query parameter', async () => {
		const { getByTestId, emitted } = setup();

		await userEvent.click(getByTestId('custom-action-wizard-query-add'));

		expect(lastRequest(emitted()).query).toEqual([expect.objectContaining({ key: '', value: '' })]);
	});

	it('shows the body only with a body type', async () => {
		const { getByTestId, queryByTestId, emitted, rerender } = setup();
		expect(queryByTestId('custom-action-wizard-body')).not.toBeInTheDocument();

		await userEvent.selectOptions(getByTestId('custom-action-wizard-body-type'), 'json');
		expect(lastRequest(emitted()).bodyType).toBe('json');

		await rerender({ request: { ...emptyRequest(), bodyType: 'json' } });
		await userEvent.type(getByTestId('custom-action-wizard-body'), '{{}');
		expect(lastRequest(emitted()).bodyText).toBe('{}');
	});

	it('shows the issues of the URL and the headers', () => {
		const { getAllByTestId } = setup({
			issues: [
				{ path: 'request.url', code: 'invalid_url', message: 'Bad URL' },
				{ path: 'request.headers.X Y', code: 'invalid_header_name', message: 'Bad header' },
			],
		});

		expect(
			getAllByTestId('custom-action-wizard-field-issues').map((list) => list.textContent),
		).toEqual(['Bad URL', 'Bad header']);
	});
});
