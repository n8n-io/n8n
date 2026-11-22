import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import type { INodeProperties } from 'n8n-workflow';

import type { WizardIssue } from '../wizard.types';
import ReviewStep from './ReviewStep.vue';

const renderStep = createComponentRenderer(ReviewStep);

const PROPERTIES: INodeProperties[] = [
	{ displayName: 'Item ID', name: 'id', type: 'string', default: '', required: true },
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		options: [{ displayName: 'Limit', name: 'limit', type: 'number', default: 0 }],
	},
];

const setup = (
	props: Partial<{
		host: string;
		properties: INodeProperties[];
		issues: WizardIssue[];
		loading: boolean;
		failed: boolean;
		showCredentialNote: boolean;
		droppedSecrets: string[];
		showChangeNote: boolean;
	}> = {},
) =>
	renderStep({
		props: {
			host: 'api.acme.test',
			properties: PROPERTIES,
			issues: [],
			loading: false,
			failed: false,
			showCredentialNote: false,
			droppedSecrets: [],
			showChangeNote: false,
			...props,
		},
	});

describe('ReviewStep', () => {
	it('shows the host of the request', () => {
		const { getByTestId } = setup();

		expect(getByTestId('custom-action-wizard-review-host')).toHaveTextContent('api.acme.test');
	});

	it('says when the host is not known', () => {
		const { getByTestId } = setup({ host: undefined });

		expect(getByTestId('custom-action-wizard-review-host-unknown')).toBeInTheDocument();
	});

	it('lists the generated fields, also the optional ones', () => {
		const { getAllByTestId } = setup();

		const fields = getAllByTestId('custom-action-wizard-review-field');
		expect(fields.map((field) => field.textContent?.trim())).toEqual([
			expect.stringContaining('Item ID'),
			'Limit',
		]);
		expect(fields[0]).toHaveTextContent('Required');
	});

	it('lists the issues with their step and goes to the step', async () => {
		const { getByTestId, queryAllByTestId, emitted } = setup({
			issues: [{ path: 'inputs[0].name', code: 'reserved_input_name', message: 'Reserved name' }],
		});

		expect(getByTestId('custom-action-wizard-issue')).toHaveTextContent('Fields: Reserved name');
		expect(queryAllByTestId('custom-action-wizard-review-field')).toHaveLength(0);

		await userEvent.click(getByTestId('custom-action-wizard-issue-go-to'));
		expect(emitted('goToStep')).toEqual([['fields']]);
	});

	it('explains the credential domains with the host', () => {
		const { getByTestId } = setup({ showCredentialNote: true });

		expect(getByTestId('custom-action-wizard-credential-note')).toHaveTextContent(
			'it must allow api.acme.test',
		);
		expect(getByTestId('custom-action-wizard-credential-note')).toHaveTextContent('"None"');
	});

	it('hides the credential note when no credential limits the hosts', () => {
		const { queryByTestId } = setup();

		expect(queryByTestId('custom-action-wizard-credential-note')).not.toBeInTheDocument();
	});

	it('names the values that were not copied', () => {
		const { getByTestId } = setup({ droppedSecrets: ['Authorization', 'api_key'] });

		expect(getByTestId('custom-action-wizard-secrets-note')).toHaveTextContent(
			'Not copied: Authorization, api_key.',
		);
	});

	it('shows the progress and a retry after a failed check', async () => {
		const loading = setup({ loading: true });
		expect(loading.getByTestId('custom-action-wizard-review-loading')).toBeInTheDocument();
		loading.unmount();

		const { getByTestId, emitted } = setup({ failed: true });
		await userEvent.click(getByTestId('custom-action-wizard-review-retry'));
		expect(emitted('retry')).toHaveLength(1);
	});

	it('emits the change note of an edit', async () => {
		const { getByTestId, emitted } = setup({ showChangeNote: true });

		await userEvent.type(getByTestId('custom-action-wizard-change-note'), 'F');

		expect(emitted('update:changeNote')).toEqual([['F']]);
	});
});
