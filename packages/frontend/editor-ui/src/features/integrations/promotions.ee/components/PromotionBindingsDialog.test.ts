import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { ApplyPackageResultDto } from '@n8n/api-types';
import PromotionBindingsDialog from './PromotionBindingsDialog.vue';
import { continueApplyPromotion } from '../promotionsSettings.api';
import {
	applied,
	blocked,
	consumers,
	credential,
	destructiveChange,
	projectConflict,
	savedCredential,
	variable,
} from '../__tests__/bindings.fixtures';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ publicApiContext: { baseUrl: '/custom/api/v1' } }),
}));
vi.mock('../promotionsSettings.api');

const renderComponent = createComponentRenderer(PromotionBindingsDialog);

async function renderDialog(options: Parameters<typeof renderComponent>[0]) {
	const result = renderComponent(options);
	await result.findByRole('dialog');
	return result;
}

beforeEach(() => vi.resetAllMocks());

const restartLine = /close this dialog and start Apply remote changes again/;

function precedes(first: Node, second: Node) {
	return !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

it('shows every missing binding with its destination scope without exposing source values', async () => {
	const { getByRole, getByText, getAllByText, queryByText } = await renderDialog({
		props: {
			open: true,
			blockedResult: blocked({
				missingBindings: [credential, variable],
				warnings: applied.warnings,
			}),
			createBinding: vi.fn(),
		},
	});
	expect(getByRole('heading', { level: 2, name: 'Resolve bindings' })).toBeInTheDocument();
	expect(getByRole('heading', { name: 'Team A' })).toBeInTheDocument();
	expect(getByRole('heading', { name: 'Team B' })).toBeInTheDocument();
	expect(getByRole('table', { name: 'Workflow A' })).toBeInTheDocument();
	expect(getByRole('table', { name: 'Workflow B' })).toBeInTheDocument();
	expect(getAllByText('Owner team')).toHaveLength(2);
	expect(getByText('Global')).toBeInTheDocument();
	expect(getAllByText('Needs setup')).toHaveLength(3);
	expect(getByText(/project variable overrides the global variable SETTING/)).toBeInTheDocument();
	expect(queryByText('private-value')).not.toBeInTheDocument();
	expect(queryByText('={{ $vars.SECRET }}')).not.toBeInTheDocument();
	expect(getByRole('button', { name: 'Continue' })).toBeDisabled();
	expect(getByRole('status')).toHaveTextContent('2 items still need setup');
});

it('blocks apply and asks to correct missing access', async () => {
	const { getByRole, getByText, queryByRole } = await renderDialog({
		props: {
			open: true,
			blockedResult: blocked({
				missingBindings: [credential],
				accessRequirements: [
					{
						...credential,
						sourceId: 'restricted-credential',
						name: 'Restricted credential',
						code: 'access-required',
					},
				],
			}),
			createBinding: vi.fn(),
		},
	});
	expect(getByRole('heading', { level: 2, name: 'Apply is blocked' })).toBeInTheDocument();
	expect(getByText(/Ask an administrator/)).toBeInTheDocument();
	expect(getByText(restartLine)).toBeInTheDocument();
	expect(queryByRole('table')).not.toBeInTheDocument();
	expect(queryByRole('button', { name: 'Create Source credential' })).not.toBeInTheDocument();
	expect(queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
	expect(queryByRole('status')).not.toBeInTheDocument();
	expect(getByRole('button', { name: 'Close' })).toBeInTheDocument();
});

it('lists destructive changes after the blocking conflicts and keeps apply blocked', async () => {
	const { getByRole, getByText, getAllByText, queryByRole, queryByText } = await renderDialog({
		props: {
			open: true,
			blockedResult: blocked({
				conflicts: [
					projectConflict,
					destructiveChange,
					{ ...destructiveChange, id: 'invoices-id', name: 'Invoices' },
				],
			}),
			createBinding: vi.fn(),
		},
	});
	const destructiveHeading = getByRole('heading', { name: 'Destructive changes' });
	expect(getByRole('heading', { level: 2, name: 'Apply is blocked' })).toBeInTheDocument();
	expect(getByText(/destination project is not a team project/)).toBeInTheDocument();
	expect(getByText('These data tables lose data when you apply.')).toBeInTheDocument();
	expect(getByText('Orders')).toBeInTheDocument();
	expect(getByText('Invoices')).toBeInTheDocument();
	expect(getAllByText('Team A: Workflow A')).toHaveLength(2);
	expect(precedes(getByText(/destination project is not a team project/), destructiveHeading)).toBe(
		true,
	);
	expect(precedes(getByText(restartLine), destructiveHeading)).toBe(true);
	expect(queryByText(/no longer need this data/)).not.toBeInTheDocument();
	expect(
		queryByRole('button', { name: /Apply data table changes|Continue/ }),
	).not.toBeInTheDocument();
});

it('asks to confirm data deletion when only destructive changes block apply', async () => {
	vi.mocked(continueApplyPromotion).mockResolvedValue(applied);
	const { getByRole, getByText, queryByRole, queryByText, emitted } = await renderDialog({
		props: {
			open: true,
			blockedResult: blocked({ missingBindings: [], conflicts: [destructiveChange] }),
			createBinding: vi.fn(),
		},
	});
	expect(
		getByRole('heading', { level: 2, name: 'Review destructive changes' }),
	).toBeInTheDocument();
	expect(getByText('Confirm the data loss before you apply')).toBeInTheDocument();
	expect(
		getByText(
			'This data table loses data when you apply. Apply only if you no longer need this data.',
		),
	).toBeInTheDocument();
	expect(getByText('Orders')).toBeInTheDocument();
	expect(queryByRole('heading', { name: 'Destructive changes' })).not.toBeInTheDocument();
	expect(queryByRole('heading', { name: 'Conflicts' })).not.toBeInTheDocument();
	expect(queryByText(/Create the missing credentials/)).not.toBeInTheDocument();
	expect(queryByText(restartLine)).not.toBeInTheDocument();
	expect(queryByRole('table')).not.toBeInTheDocument();
	expect(queryByRole('status')).not.toBeInTheDocument();
	const apply = getByRole('button', { name: 'Apply data table changes' });
	expect(apply).toBeEnabled();
	await userEvent.click(apply);
	expect(continueApplyPromotion).toHaveBeenCalledTimes(1);
	expect(continueApplyPromotion).toHaveBeenCalledWith(
		expect.anything(),
		expect.any(String),
		expect.objectContaining({ confirmDestructiveChanges: true }),
	);
	expect(emitted('applied')).toEqual([[applied]]);
});

it('shows destructive changes above the bindings and continues with data deletion after setup', async () => {
	vi.mocked(continueApplyPromotion).mockResolvedValue(
		blocked({ missingBindings: [], conflicts: [destructiveChange] }),
	);
	const { getByRole, getByText, queryByText, emitted } = await renderDialog({
		props: {
			open: true,
			blockedResult: blocked({
				missingBindings: [{ ...credential, consumers: [consumers[0]] }],
				conflicts: [destructiveChange],
			}),
			createBinding: vi.fn().mockResolvedValue(savedCredential),
		},
	});
	expect(getByRole('heading', { level: 2, name: 'Resolve bindings' })).toBeInTheDocument();
	expect(precedes(getByRole('heading', { name: 'Destructive changes' }), getByRole('table'))).toBe(
		true,
	);
	expect(getByText(/Apply only if you no longer need this data/)).toBeInTheDocument();
	expect(
		precedes(
			getByRole('heading', { level: 3, name: 'Credentials and variables' }),
			getByRole('table'),
		),
	).toBe(true);
	expect(getByRole('status')).toHaveTextContent('1 item still needs setup');
	expect(getByRole('button', { name: 'Apply data table changes' })).toBeDisabled();

	await userEvent.click(getByRole('button', { name: 'Create Source credential' }));
	expect(getByRole('status')).toHaveTextContent('All items are ready');
	await userEvent.click(getByRole('button', { name: 'Apply data table changes' }));

	expect(continueApplyPromotion).toHaveBeenCalledTimes(1);
	expect(continueApplyPromotion).toHaveBeenCalledWith(
		expect.anything(),
		expect.any(String),
		expect.objectContaining({ confirmDestructiveChanges: true }),
	);
	expect(emitted('applied')).toBeUndefined();
	expect(getByRole('heading', { level: 2, name: 'Resolve bindings' })).toBeInTheDocument();
	expect(getByRole('heading', { name: 'Destructive changes' })).toBeInTheDocument();
	expect(within(getByRole('table')).getByText('Resolved')).toBeInTheDocument();
	expect(queryByText(restartLine)).not.toBeInTheDocument();
	expect(getByRole('button', { name: 'Apply data table changes' })).toBeEnabled();
	await waitFor(() =>
		expect(getByRole('heading', { level: 2, name: 'Resolve bindings' })).toHaveFocus(),
	);
});

it('moves focus to the title when Continue reveals a blocking conflict', async () => {
	vi.mocked(continueApplyPromotion).mockResolvedValue(
		blocked({ missingBindings: [], conflicts: [projectConflict] }),
	);
	const { getByRole } = await renderDialog({
		props: { open: true, blockedResult: blocked({ missingBindings: [] }), createBinding: vi.fn() },
	});
	await userEvent.click(getByRole('button', { name: 'Continue' }));
	await waitFor(() =>
		expect(getByRole('heading', { level: 2, name: 'Apply is blocked' })).toHaveFocus(),
	);
});

it('creates the original binding, restores focus, and emits the full applied result', async () => {
	const createBinding = vi.fn().mockResolvedValue(savedCredential);
	vi.mocked(continueApplyPromotion).mockResolvedValue(applied);
	const { getAllByRole, getByRole, getAllByText, emitted } = await renderDialog({
		props: { open: true, blockedResult: blocked(), createBinding },
	});
	const create = getAllByRole('button', { name: 'Create Source credential' })[0];
	const row = create.closest('tr');
	await userEvent.click(create);
	expect(createBinding.mock.calls[0][0]).toStrictEqual(credential);
	expect(getAllByText('Destination credential')).toHaveLength(2);
	expect(getAllByText('Resolved')).toHaveLength(2);
	expect(row).toHaveFocus();
	await userEvent.click(getByRole('button', { name: 'Continue' }));
	expect(emitted('applied')).toEqual([[applied]]);
	expect(emitted('update:open')).toEqual([[false]]);
	expect(emitted('close-requested')).toBeUndefined();
});

it.each(['Close', 'Close dialog', 'Back', 'Escape'] as const)(
	'keeps saved resources when dismissed with %s',
	async (action) => {
		const { getAllByRole, getByRole, getByText, emitted } = await renderDialog({
			props: {
				open: true,
				blockedResult: blocked(),
				createBinding: vi.fn().mockResolvedValue(savedCredential),
			},
		});
		await userEvent.click(getAllByRole('button', { name: 'Create Source credential' })[0]);
		expect(getByText(/Closing keeps the credentials and variables you saved/)).toBeInTheDocument();
		if (action === 'Escape') await userEvent.keyboard('{Escape}');
		else await userEvent.click(getByRole('button', { name: action }));
		expect(emitted('close-requested')).toEqual([[[savedCredential]]]);
		expect(emitted('update:open')).toEqual([[false]]);
		expect(continueApplyPromotion).not.toHaveBeenCalled();
	},
);

it('blocks dismissal and repeated form submissions while Continue is pending', async () => {
	const pending = createDeferredPromise<ApplyPackageResultDto>();
	vi.mocked(continueApplyPromotion).mockReturnValue(pending.promise);
	const { getByRole, queryByRole, emitted } = await renderDialog({
		props: { open: true, blockedResult: blocked({ missingBindings: [] }), createBinding: vi.fn() },
	});
	const button = getByRole('button', { name: 'Continue' });
	await userEvent.click(button);
	const form = button.closest('form');
	expect(form).not.toBeNull();
	await fireEvent.submit(form!);
	await userEvent.keyboard('{Escape}');
	expect(getByRole('button', { name: 'Close' })).toBeDisabled();
	expect(queryByRole('button', { name: 'Close dialog' })).not.toBeInTheDocument();
	expect(emitted('update:open')).toBeUndefined();
	expect(continueApplyPromotion).toHaveBeenCalledTimes(1);
	pending.resolve(applied);
	await waitFor(() => expect(emitted('applied')).toEqual([[applied]]));
});

it('returns a changed source to the caller and stops the session', async () => {
	const initial = blocked({ missingBindings: [] });
	const result = {
		status: 'source-changed' as const,
		connectionId: initial.connectionId,
		configId: initial.configId,
		git: { branchName: 'main', commitSha: 'b'.repeat(40) },
	};
	vi.mocked(continueApplyPromotion).mockResolvedValue(result);
	const { getByRole, getByText, emitted } = await renderDialog({
		props: { open: true, blockedResult: initial, createBinding: vi.fn() },
	});
	await userEvent.click(getByRole('button', { name: 'Continue' }));
	expect(emitted('source-changed')).toEqual([[result]]);
	expect(getByText(/The source changed/)).toBeInTheDocument();
	expect(getByRole('button', { name: 'Continue' })).toBeDisabled();
	expect(continueApplyPromotion).toHaveBeenCalledTimes(1);
});

it('shows recovery guidance after a request fails and keeps the saved row', async () => {
	vi.mocked(continueApplyPromotion).mockRejectedValue(new Error('Offline'));
	const { getByRole, getByText } = await renderDialog({
		props: {
			open: true,
			blockedResult: blocked({ missingBindings: [{ ...credential, consumers: [consumers[0]] }] }),
			createBinding: vi.fn().mockResolvedValue(savedCredential),
		},
	});
	await userEvent.click(getByRole('button', { name: 'Create Source credential' }));
	await userEvent.click(getByRole('button', { name: 'Continue' }));
	expect(getByText(/Check the destination before you try again/)).toBeInTheDocument();
	expect(within(getByRole('table')).getByText('Resolved')).toBeInTheDocument();
	expect(getByRole('button', { name: 'Continue' })).toBeEnabled();
});

it('keeps the binding dialog open when Escape closes an editor', async () => {
	const { getAllByRole, emitted } = await renderDialog({
		props: { open: true, blockedResult: blocked(), createBinding: vi.fn().mockResolvedValue(null) },
	});
	await userEvent.click(getAllByRole('button', { name: 'Create Source credential' })[0]);
	const editor = document.createElement('div');
	editor.setAttribute('role', 'dialog');
	document.body.append(editor);
	try {
		await fireEvent.keyDown(editor, { key: 'Escape' });
		expect(emitted('update:open')).toBeUndefined();
	} finally {
		editor.remove();
	}
});
