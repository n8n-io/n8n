import userEvent from '@testing-library/user-event';

vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	return {
		...actual,
		N8nDialog: {
			name: 'N8nDialog',
			props: ['open'],
			template: '<div v-if="open"><slot /></div>',
		},
		N8nDialogHeader: { name: 'N8nDialogHeader', template: '<div><slot /></div>' },
		N8nDialogTitle: { name: 'N8nDialogTitle', template: '<h2><slot /></h2>' },
		N8nDialogFooter: { name: 'N8nDialogFooter', template: '<div><slot /></div>' },
	};
});

import { createComponentRenderer } from '@/__tests__/render';
import type { CredentialsResource } from '@/Interface';

import BulkCredentialActionReviewDialog from './BulkCredentialActionReviewDialog.vue';
import type { ResolvedBulkCredentialAction } from './bulkCredentialActions.types';

const renderComponent = createComponentRenderer(BulkCredentialActionReviewDialog, {
	props: {
		open: true,
		action: null,
		submitting: false,
		errorMessage: null,
		errorDetails: [],
		projectSearchFn: vi.fn().mockResolvedValue({ count: 0, data: [] }),
	},
	global: {
		stubs: {
			ProjectSharing: {
				emits: ['update:modelValue'],
				template:
					"<button data-test-id=\"choose-destination\" @click=\"$emit('update:modelValue', { id: 'target', name: 'Target' })\">Choose destination</button>",
			},
		},
	},
});

const credential = (overrides: Partial<CredentialsResource> = {}): CredentialsResource =>
	({
		resourceType: 'credential',
		id: 'cred-1',
		name: 'Slack',
		createdAt: '',
		updatedAt: '',
		type: 'slackApi',
		readOnly: false,
		needsSetup: false,
		...overrides,
	}) as CredentialsResource;

const action = (
	id: ResolvedBulkCredentialAction['id'],
	affected: CredentialsResource[],
): ResolvedBulkCredentialAction => ({
	id,
	label: id,
	destructive: id === 'delete',
	affected,
});

describe('BulkCredentialActionReviewDialog', () => {
	it('explains the permanent impact of Delete', () => {
		const { getByText, getByTestId } = renderComponent({
			props: { action: action('delete', [credential()]) },
		});

		expect(getByText('Delete credentials?')).toBeInTheDocument();
		expect(
			getByText(
				"This permanently deletes the selected credentials. Workflows that use them may stop working. This can't be undone.",
			),
		).toBeInTheDocument();
		expect(getByTestId('bulk-action-confirm')).toHaveTextContent('Delete credentials');
	});

	it('requires a Move destination and warns about ownership and connections', async () => {
		const { getByText, getByTestId, emitted } = renderComponent({
			props: { action: action('move', [credential({ isResolvable: true })]) },
		});

		expect(getByTestId('bulk-action-confirm')).toBeDisabled();
		expect(
			getByText('Moving changes ownership and removes existing sharing access.'),
		).toBeInTheDocument();
		expect(
			getByText('People who lose access after the move will lose their individual connections.'),
		).toBeInTheDocument();

		await userEvent.click(getByTestId('choose-destination'));
		await userEvent.click(getByTestId('bulk-action-confirm'));

		expect(emitted().confirm).toEqual([[{ destinationProjectId: 'target' }]]);
	});

	it('emits cancellation while idle', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { action: action('delete', [credential()]) },
		});

		await userEvent.click(getByTestId('bulk-action-cancel'));

		expect(emitted()['update:open']).toEqual([[false]]);
	});

	it('locks cancellation and confirmation while submitting', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { action: action('delete', [credential()]), submitting: true },
		});

		expect(getByTestId('bulk-action-cancel')).toBeDisabled();
		expect(getByTestId('bulk-action-confirm')).toBeDisabled();
		await userEvent.click(getByTestId('bulk-action-cancel'));
		await userEvent.click(getByTestId('bulk-action-confirm'));

		expect(emitted()['update:open']).toBeUndefined();
		expect(emitted().confirm).toBeUndefined();
	});

	it('shows retryable errors and named issue details', () => {
		const { getByText } = renderComponent({
			props: {
				action: action('delete', [credential()]),
				errorMessage: "Credentials couldn't be deleted. Review the details and try again.",
				errorDetails: ['Slack: Credential does not exist or is not accessible.'],
			},
		});

		expect(
			getByText("Credentials couldn't be deleted. Review the details and try again."),
		).toBeInTheDocument();
		expect(getByText('Slack: Credential does not exist or is not accessible.')).toBeInTheDocument();
	});
});
