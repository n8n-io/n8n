import { ROLE } from '@n8n/api-types';
import { createComponentRenderer, mockedStore, waitAllPromises } from '@n8n/frontend-test-utils';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useUsersStore } from '@n8n/stores/users.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, it, expect, vi } from 'vitest';

import ContactAdminModal from './ContactAdminModal.vue';
import { mockPolicyProject } from '../__tests__/mocks';

vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	return {
		...actual,
		N8nDialog: {
			name: 'N8nDialog',
			props: ['open', 'header', 'description'],
			template: '<div v-if="open"><h2>{{ header }}</h2><p>{{ description }}</p><slot /></div>',
		},
		N8nDialogDescription: {
			name: 'N8nDialogDescription',
			template: '<p data-slot="dialog-description"><slot /></p>',
		},
	};
});

const owner = {
	id: 'owner-1',
	firstName: 'Ada',
	lastName: 'Lovelace',
	fullName: 'Ada Lovelace',
	email: 'ada@example.com',
	role: ROLE.Owner,
	isPendingUser: false,
} as unknown as IUser;

const member = { ...owner, id: 'member-1', fullName: 'Bob Builder', role: ROLE.Member } as IUser;

const renderComponent = createComponentRenderer(ContactAdminModal, {
	props: { open: true, nodeTypeName: 'Slack' },
});

function setup(allUsers: IUser[], fetchUsers = vi.fn().mockResolvedValue(undefined)) {
	setActivePinia(createTestingPinia());
	const usersStore = mockedStore(useUsersStore);
	usersStore.allUsers = allUsers;
	usersStore.fetchUsers = fetchUsers;
	return usersStore;
}

describe('ContactAdminModal', () => {
	it('lists the owners with a mailto link and builds the copy from the node type name', async () => {
		const usersStore = setup([owner, member]);
		const { findByTestId, getByText } = renderComponent();

		const list = await findByTestId('contact-admin-list');

		expect(usersStore.fetchUsers).toHaveBeenCalledWith({ filter: { isOwner: true } });
		expect(list).toHaveTextContent('Ada Lovelace');
		expect(list).not.toHaveTextContent('Bob Builder');
		expect(getByText('ada@example.com').closest('a')).toHaveAttribute(
			'href',
			'mailto:ada@example.com?subject=Access%20request%20for%20the%20Slack%20node',
		);
		expect(getByText(/request access to 'Slack'/)).toBeInTheDocument();
	});

	it('builds the credential type copy', async () => {
		setup([owner]);
		const { findByTestId, getByText } = renderComponent({
			props: { open: true, nodeTypeName: 'Anthropic credentials', kind: 'credential' },
		});

		await findByTestId('contact-admin-list');

		expect(getByText('ada@example.com').closest('a')).toHaveAttribute(
			'href',
			'mailto:ada@example.com?subject=Access%20request%20for%20Anthropic%20credentials',
		);
		expect(getByText(/request access to Anthropic credentials/)).toBeInTheDocument();
	});

	it('keeps loading until the latest owner lookup resolves after a reopen', async () => {
		const lookups: Array<() => void> = [];
		setup(
			[owner],
			vi.fn(async () => await new Promise<void>((resolve) => lookups.push(resolve))),
		);
		const { rerender, queryByTestId, findByTestId } = renderComponent();

		await rerender({ open: false });
		await rerender({ open: true });
		expect(lookups).toHaveLength(2);

		lookups[0]();
		await waitAllPromises();
		expect(queryByTestId('contact-admin-list')).not.toBeInTheDocument();

		lookups[1]();
		expect(await findByTestId('contact-admin-list')).toBeInTheDocument();
	});

	it('falls back to a generic hint when the owner lookup yields nothing', async () => {
		setup([], vi.fn().mockRejectedValue(new Error('forbidden')));
		const { findByTestId } = renderComponent();

		expect(await findByTestId('contact-admin-empty')).toBeInTheDocument();
	});

	describe('for a project restriction', () => {
		const projectAdmin = {
			id: 'admin-1',
			firstName: 'Grace',
			lastName: 'Hopper',
			email: 'grace@example.com',
			role: 'project:admin',
		};
		const projectEditor = {
			id: 'editor-1',
			firstName: 'Alan',
			lastName: 'Turing',
			email: 'alan@example.com',
			role: 'project:editor',
		};

		it('lists only the project admins with a mailto link', async () => {
			const usersStore = setup([owner]);
			mockPolicyProject({ type: 'team', relations: [projectAdmin, projectEditor] });
			const { findByTestId, getByText } = renderComponent({
				props: { open: true, nodeTypeName: 'Slack', audience: 'project' },
			});

			const list = await findByTestId('contact-admin-list');

			expect(usersStore.fetchUsers).not.toHaveBeenCalled();
			expect(getByText('Project admins')).toBeInTheDocument();
			expect(list).toHaveTextContent('Grace Hopper');
			expect(list).not.toHaveTextContent('Alan Turing');
			expect(list).not.toHaveTextContent('Ada Lovelace');
			expect(getByText('grace@example.com').closest('a')).toHaveAttribute(
				'href',
				'mailto:grace@example.com?subject=Access%20request%20for%20the%20Slack%20node',
			);
		});

		it('lists the instance owners and admins when the project has no admin of its own', async () => {
			setup([owner]);
			mockPolicyProject({
				type: 'team',
				relations: [projectEditor],
				implicitMembers: [
					{
						id: 'global-owner-1',
						firstName: 'Katherine',
						lastName: 'Johnson',
						email: 'katherine@example.com',
						globalRole: { slug: 'global:owner', displayName: 'Owner' },
					},
					{
						id: 'global-admin-1',
						firstName: 'Margaret',
						lastName: 'Hamilton',
						email: 'margaret@example.com',
						globalRole: { slug: 'global:admin', displayName: 'Admin' },
					},
				],
			});
			const { findByTestId } = renderComponent({
				props: { open: true, nodeTypeName: 'Slack', audience: 'project' },
			});

			const list = await findByTestId('contact-admin-list');

			expect(list).toHaveTextContent('Katherine Johnson');
			expect(list).toHaveTextContent('Margaret Hamilton');
			expect(list).not.toHaveTextContent('Alan Turing');
		});

		it('falls back to a project hint when the project has no admin to list', async () => {
			setup([owner]);
			mockPolicyProject({ type: 'team', relations: [projectEditor] });
			const { findByTestId } = renderComponent({
				props: { open: true, nodeTypeName: 'Slack', audience: 'project' },
			});

			expect(await findByTestId('contact-admin-empty')).toHaveTextContent(
				'No project admin is listed here.',
			);
		});
	});
});
