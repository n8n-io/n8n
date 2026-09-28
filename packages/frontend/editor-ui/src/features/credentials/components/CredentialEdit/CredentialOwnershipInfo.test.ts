import { createTestingPinia } from '@pinia/testing';
import { i18n } from '@n8n/i18n';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import CredentialOwnershipInfo from './CredentialOwnershipInfo.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';

const personalProject: ProjectSharingData & { relations: []; scopes: []; rolesManaged: boolean } = {
	id: 'personal-project-id',
	name: 'Mona Pfeffer <mona@example.com>',
	icon: null,
	type: 'personal',
	createdAt: '',
	updatedAt: '',
	relations: [],
	scopes: [],
	rolesManaged: false,
};

const otherPersonProject: ProjectSharingData = {
	id: 'other-person-project-id',
	name: 'Kai Tanaka <kai@example.com>',
	icon: null,
	type: 'personal',
	createdAt: '',
	updatedAt: '',
};

const teamProject = (id: string, name: string): ProjectSharingData => ({
	id,
	name,
	icon: null,
	type: 'team',
	createdAt: '',
	updatedAt: '',
});

const renderComponent = createComponentRenderer(CredentialOwnershipInfo, {
	pinia: createTestingPinia(),
});

describe('CredentialOwnershipInfo', () => {
	beforeEach(() => {
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.personalProject = personalProject;
	});

	it('shows "Owned by you" and "not shared" when the viewer owns it and it is not shared', () => {
		const { getByText, queryByTestId } = renderComponent({
			props: {
				homeProject: personalProject,
				sharedWithProjects: [],
			},
		});

		expect(getByText('Owned by you')).toBeInTheDocument();
		expect(getByText('Not shared with any other project')).toBeInTheDocument();
		expect(
			queryByTestId('credential-ownership-not-shared-with-project-notice'),
		).not.toBeInTheDocument();
	});

	it('hides the owner line instead of showing a nonsensical fallback when there is no home project', () => {
		const { queryByText, getByText } = renderComponent({
			props: {
				homeProject: undefined,
				sharedWithProjects: [],
			},
		});

		expect(queryByText(/Owned by/)).not.toBeInTheDocument();
		expect(getByText('Not shared with any other project')).toBeInTheDocument();
	});

	it('lists shared projects with an Oxford-comma join', () => {
		const sharedWithProjects = [
			teamProject('sales-ops', 'Sales Ops'),
			teamProject('marketing', 'Marketing'),
			teamProject('support', 'Support'),
		];

		const { getByText } = renderComponent({
			props: {
				homeProject: personalProject,
				sharedWithProjects,
			},
		});

		expect(getByText('Owned by you')).toBeInTheDocument();
		expect(getByText('Shared with Sales Ops, Marketing, and Support')).toBeInTheDocument();
	});

	it('joins the shared-projects list using the active i18n locale, not a fixed one', () => {
		// `locale` is a getter inherited from I18nClass.prototype; shadow it with an
		// own property on the singleton so this test can control it without a full
		// locale/message load. `baseText` itself still reads the real underlying
		// vue-i18n locale (unaffected), so the surrounding copy stays in English —
		// only the native Intl.ListFormat join, which reads `i18n.locale` directly,
		// is expected to switch to German conjunction ("und" instead of "and").
		Object.defineProperty(i18n, 'locale', { value: 'de', configurable: true });

		try {
			const { getByText } = renderComponent({
				props: {
					homeProject: personalProject,
					sharedWithProjects: [
						teamProject('sales-ops', 'Sales Ops'),
						teamProject('marketing', 'Marketing'),
					],
				},
			});

			expect(getByText('Shared with Sales Ops und Marketing')).toBeInTheDocument();
		} finally {
			delete (i18n as { locale?: string }).locale;
		}
	});

	it("shows the owner's name when someone else owns the credential, with no callout regardless of the working project", () => {
		const { getByText, queryByTestId } = renderComponent({
			props: {
				homeProject: otherPersonProject,
				sharedWithProjects: [],
				workingProjectId: 'some-other-project-id',
			},
		});

		expect(getByText('Owned by Kai Tanaka')).toBeInTheDocument();
		expect(
			queryByTestId('credential-ownership-not-shared-with-project-notice'),
		).not.toBeInTheDocument();
	});

	it('shows "Shared with everyone" when the credential is global', () => {
		const { getByText } = renderComponent({
			props: {
				homeProject: personalProject,
				sharedWithProjects: [teamProject('sales-ops', 'Sales Ops')],
				isGlobal: true,
			},
		});

		expect(getByText('Shared with everyone')).toBeInTheDocument();
	});

	it('shows the "not shared with current project" notice when the viewer owns a personal credential not shared into the working project', () => {
		const { getByTestId, getByText } = renderComponent({
			props: {
				homeProject: personalProject,
				sharedWithProjects: [teamProject('sales-ops', 'Sales Ops')],
				workingProjectId: 'a-project-not-shared-into',
			},
		});

		expect(getByTestId('credential-ownership-not-shared-with-project-notice')).toBeInTheDocument();
		expect(
			getByText(
				"This project doesn't have access to this credential. You can still use it here because you own it. Others in this project can't, unless you share it.",
			),
		).toBeInTheDocument();
	});

	it('does not show the notice when the working project already has access via sharing', () => {
		const { queryByTestId } = renderComponent({
			props: {
				homeProject: personalProject,
				sharedWithProjects: [teamProject('sales-ops', 'Sales Ops')],
				workingProjectId: 'sales-ops',
			},
		});

		expect(
			queryByTestId('credential-ownership-not-shared-with-project-notice'),
		).not.toBeInTheDocument();
	});

	it("does not show the notice when the working project is the credential's own home project", () => {
		const { queryByTestId } = renderComponent({
			props: {
				homeProject: personalProject,
				sharedWithProjects: [],
				workingProjectId: personalProject.id,
			},
		});

		expect(
			queryByTestId('credential-ownership-not-shared-with-project-notice'),
		).not.toBeInTheDocument();
	});

	it('does not show the notice when no working project is known', () => {
		const { queryByTestId } = renderComponent({
			props: {
				homeProject: personalProject,
				sharedWithProjects: [],
			},
		});

		expect(
			queryByTestId('credential-ownership-not-shared-with-project-notice'),
		).not.toBeInTheDocument();
	});

	it('does not show the notice for a team-owned credential', () => {
		const teamOwned = teamProject('team-a', 'Team A');
		const { queryByTestId } = renderComponent({
			props: {
				homeProject: teamOwned,
				sharedWithProjects: [],
				workingProjectId: 'some-other-project-id',
			},
		});

		expect(
			queryByTestId('credential-ownership-not-shared-with-project-notice'),
		).not.toBeInTheDocument();
	});
});
