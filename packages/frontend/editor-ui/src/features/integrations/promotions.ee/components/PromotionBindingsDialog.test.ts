import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { ApplyPackageResultDto } from '@n8n/api-types';
import PromotionBindingsDialog from './PromotionBindingsDialog.vue';
import { continueApplyPackage } from '../promotionsApply.api';
import {
	applied,
	blocked,
	consumers,
	credential,
	savedCredential,
	variable,
} from '../__tests__/bindings.fixtures';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ publicApiContext: { baseUrl: '/custom/api/v1' } }),
}));
vi.mock('../promotionsApply.api');

const renderComponent = createComponentRenderer(PromotionBindingsDialog);

async function renderDialog(options: Parameters<typeof renderComponent>[0]) {
	const result = renderComponent(options);
	await result.findByRole('dialog');
	return result;
}

beforeEach(() => vi.resetAllMocks());

it('shows all projects, scopes, and blocker reasons without exposing source values', async () => {
	const { getByRole, getByText, getAllByText, queryByText } = await renderDialog({
		props: {
			open: true,
			blockedResult: blocked({
				missingBindings: [credential, variable],
				accessRequirements: [
					{
						...credential,
						sourceId: 'restricted-credential',
						name: 'Restricted credential',
						code: 'access-required',
					},
				],
				conflicts: [
					{
						kind: 'project',
						code: 'project-not-team',
						project: { id: 'personal', name: 'Personal project' },
						filePath: 'project.json',
						workflows: [],
					},
				],
				warnings: applied.warnings,
			}),
			createBinding: vi.fn(),
		},
	});
	expect(getByRole('heading', { name: 'Team A' })).toBeInTheDocument();
	expect(getByRole('heading', { name: 'Team B' })).toBeInTheDocument();
	expect(getByRole('table', { name: 'Workflow A' })).toBeInTheDocument();
	expect(getByRole('table', { name: 'Workflow B' })).toBeInTheDocument();
	expect(getAllByText('Owner team')).toHaveLength(2);
	expect(getByText('Global')).toBeInTheDocument();
	expect(getAllByText('Needs setup')).toHaveLength(3);
	expect(getByText(/Ask an administrator/)).toBeInTheDocument();
	expect(getByText(/destination project is not a team project/)).toBeInTheDocument();
	expect(getByText(/project variable overrides the global variable SETTING/)).toBeInTheDocument();
	expect(queryByText('private-value')).not.toBeInTheDocument();
	expect(queryByText('={{ $vars.SECRET }}')).not.toBeInTheDocument();
	expect(getByRole('button', { name: 'Continue' })).toBeDisabled();
	expect(getByRole('status')).toHaveTextContent('4 items still need setup');
});

it('creates the original binding, restores focus, and emits the full applied result', async () => {
	const createBinding = vi.fn().mockResolvedValue(savedCredential);
	vi.mocked(continueApplyPackage).mockResolvedValue(applied);
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
		expect(continueApplyPackage).not.toHaveBeenCalled();
	},
);

it('blocks dismissal and repeated form submissions while Continue is pending', async () => {
	const pending = createDeferredPromise<ApplyPackageResultDto>();
	vi.mocked(continueApplyPackage).mockReturnValue(pending.promise);
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
	expect(continueApplyPackage).toHaveBeenCalledTimes(1);
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
	vi.mocked(continueApplyPackage).mockResolvedValue(result);
	const { getByRole, getByText, emitted } = await renderDialog({
		props: { open: true, blockedResult: initial, createBinding: vi.fn() },
	});
	await userEvent.click(getByRole('button', { name: 'Continue' }));
	expect(emitted('source-changed')).toEqual([[result]]);
	expect(getByText(/The source changed/)).toBeInTheDocument();
	expect(getByRole('button', { name: 'Continue' })).toBeDisabled();
	expect(continueApplyPackage).toHaveBeenCalledTimes(1);
});

it('shows recovery guidance after a request fails and keeps the saved row', async () => {
	vi.mocked(continueApplyPackage).mockRejectedValue(new Error('Offline'));
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
