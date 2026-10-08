import { ROLE } from '@n8n/api-types';
import { createComponentRenderer, mockedStore, waitAllPromises } from '@n8n/frontend-test-utils';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useUsersStore } from '@n8n/stores/users.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, it, expect, vi } from 'vitest';

import ContactInstanceAdminModal from './ContactInstanceAdminModal.vue';

vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	return {
		...actual,
		N8nDialog: {
			name: 'N8nDialog',
			props: ['open', 'header', 'description'],
			template: '<div v-if="open"><h2>{{ header }}</h2><p>{{ description }}</p><slot /></div>',
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

const renderComponent = createComponentRenderer(ContactInstanceAdminModal, {
	props: { open: true, nodeTypeName: 'Slack' },
});

function setup(allUsers: IUser[], fetchUsers = vi.fn().mockResolvedValue(undefined)) {
	setActivePinia(createTestingPinia());
	const usersStore = mockedStore(useUsersStore);
	usersStore.allUsers = allUsers;
	usersStore.fetchUsers = fetchUsers;
	return usersStore;
}

describe('ContactInstanceAdminModal', () => {
	it('lists the owners with a mailto link and builds the copy from the node type name', async () => {
		const usersStore = setup([owner, member]);
		const { findByTestId, getByText } = renderComponent();

		const list = await findByTestId('contact-instance-admin-list');

		expect(usersStore.fetchUsers).toHaveBeenCalledWith({ filter: { isOwner: true } });
		expect(list).toHaveTextContent('Ada Lovelace');
		expect(list).not.toHaveTextContent('Bob Builder');
		expect(getByText('ada@example.com').closest('a')).toHaveAttribute(
			'href',
			'mailto:ada@example.com?subject=Access%20request%20for%20the%20Slack%20node',
		);
		expect(getByText(/request access to 'Slack'/)).toBeInTheDocument();
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
		expect(queryByTestId('contact-instance-admin-list')).not.toBeInTheDocument();

		lookups[1]();
		expect(await findByTestId('contact-instance-admin-list')).toBeInTheDocument();
	});

	it('falls back to a generic hint when the owner lookup yields nothing', async () => {
		setup([], vi.fn().mockRejectedValue(new Error('forbidden')));
		const { findByTestId } = renderComponent();

		expect(await findByTestId('contact-instance-admin-empty')).toBeInTheDocument();
	});
});
