import type { SkillSourceListItem } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import SkillSourceCredentialDialog from './SkillSourceCredentialDialog.vue';
import { useSkillsStore } from '../skills.store';

const showError = vi.fn();
const showMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError, showMessage }) }));

const source: SkillSourceListItem = {
	id: 'source-1',
	type: 'github',
	label: 'acme/skills',
	ref: 'main',
	path: '',
	webUrl: 'https://github.com/acme/skills',
	projectId: null,
	projectName: null,
	projectType: null,
	projectIcon: null,
	skillCount: 1,
	updatesAvailable: 0,
	updatesBlocked: 0,
	health: 'credential_issue',
	lastCheckedAt: null,
	missingSkills: [],
	canReview: true,
	canDelete: true,
	canReplaceCredential: true,
};
const render = createComponentRenderer(SkillSourceCredentialDialog, { props: { source } });

describe('SkillSourceCredentialDialog', () => {
	beforeEach(() => {
		createTestingPinia();
		vi.clearAllMocks();
		mockedStore(useSkillsStore).fetchReplacementCredentials.mockResolvedValue([
			{ id: 'new', name: 'New GitHub', type: 'githubApi' },
			{ id: 'other', name: 'Other GitHub', type: 'githubApi' },
		]);
	});

	async function pick(view: ReturnType<typeof render>, name: string) {
		await waitFor(() =>
			expect(view.getByTestId('skill-source-credential-select')).not.toHaveAttribute(
				'data-disabled',
			),
		);
		await userEvent.click(view.getByTestId('skill-source-credential-select'));
		await userEvent.click(await view.findByRole('option', { name }));
	}

	async function chooseCredential() {
		const view = render();
		await pick(view, 'New GitHub');
		return view;
	}

	it('verifies and saves the selected credential, then closes through the replaced event', async () => {
		const view = await chooseCredential();
		await userEvent.click(view.getByTestId('skill-source-credential-save'));
		await waitFor(() => expect(view.emitted('replaced')).toEqual([[]]));
		expect(mockedStore(useSkillsStore).replaceSourceCredential).toHaveBeenCalledWith(source, 'new');
		expect(showMessage).toHaveBeenCalledWith({ title: 'Credential replaced', type: 'success' });
	});

	it('keeps the selection and shows the reason when the credential fails validation', async () => {
		mockedStore(useSkillsStore).replaceSourceCredential.mockRejectedValue(
			new ResponseError('Expired', { meta: { reason: 'credential_invalid' } }),
		);
		const view = await chooseCredential();
		await userEvent.click(view.getByTestId('skill-source-credential-save'));
		expect(await view.findByRole('alert')).toHaveTextContent('GitHub rejected this credential');
		expect(view.getByTestId('skill-source-credential-select')).toHaveTextContent('New GitHub');
		expect(view.emitted('replaced')).toBeUndefined();
	});

	it('clears the error of a failed credential when the user picks another one', async () => {
		mockedStore(useSkillsStore).replaceSourceCredential.mockRejectedValue(
			new ResponseError('Expired', { meta: { reason: 'credential_invalid' } }),
		);
		const view = await chooseCredential();
		await userEvent.click(view.getByTestId('skill-source-credential-save'));
		expect(await view.findByRole('alert')).toBeInTheDocument();
		await pick(view, 'Other GitHub');
		expect(view.queryByRole('alert')).toBeNull();
	});

	it('shows no toast when the list fails after the dialog closed', async () => {
		let fail: (error: Error) => void = () => {};
		mockedStore(useSkillsStore).fetchReplacementCredentials.mockReturnValue(
			new Promise((_resolve, reject) => {
				fail = reject;
			}),
		);
		const view = render();
		view.unmount();
		fail(new Error('Network'));
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(showError).not.toHaveBeenCalled();
	});

	it('does not save before a selection and cancels without a write', async () => {
		const view = render();
		expect(await view.findByTestId('skill-source-credential-save')).toBeDisabled();
		await userEvent.click(view.getByRole('button', { name: 'Cancel' }));
		expect(view.emitted('close')).toEqual([[]]);
		expect(mockedStore(useSkillsStore).replaceSourceCredential).not.toHaveBeenCalled();
	});
});
