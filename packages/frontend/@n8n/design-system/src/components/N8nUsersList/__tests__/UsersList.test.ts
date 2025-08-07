/**
 * Test suite for N8nUsersList component
 */

import { render, fireEvent } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import N8nUsersList from '../UsersList.vue';
import type { IUser, UserAction } from '../../../types';

// Mock the child components
vi.mock('../../N8nUserInfo', () => ({
	default: {
		name: 'N8nUserInfo',
		template: `
			<div class="user-info-mock" 
				:data-is-current-user="isCurrentUser"
				:data-is-saml-login-enabled="isSamlLoginEnabled"
				:data-first-name="firstName"
				:data-last-name="lastName"
				:data-email="email"
				:data-is-owner="isOwner"
				:data-is-pending-user="isPendingUser">
				{{ firstName }} {{ lastName }} ({{ email }})
			</div>
		`,
		props: [
			'firstName',
			'lastName',
			'email',
			'isOwner',
			'isPendingUser',
			'isCurrentUser',
			'isSamlLoginEnabled',
			'signInType',
			'disabled',
			'mfaEnabled',
		],
	},
}));

vi.mock('../../N8nBadge', () => ({
	default: {
		name: 'N8nBadge',
		template: `
			<span class="badge-mock" 
				:data-theme="theme" 
				:data-bold="bold">
				<slot />
			</span>
		`,
		props: ['theme', 'bold'],
	},
}));

vi.mock('../../N8nActionToggle', () => ({
	default: {
		name: 'N8nActionToggle',
		template: `
			<div class="action-toggle-mock" 
				:data-placement="placement"
				:data-theme="theme"
				:data-actions="JSON.stringify(actions)"
				@action="$emit('action', $event)">
				Actions
			</div>
		`,
		props: ['placement', 'actions', 'theme'],
		emits: ['action'],
	},
}));

// Mock the composable
vi.mock('../../../composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string) => {
			const translations: Record<string, string> = {
				'nds.auth.roles.owner': 'Owner',
			};
			return translations[key] || key;
		},
	}),
}));

describe('N8nUsersList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockUsers: IUser[] = [
		{
			id: '1',
			firstName: 'John',
			lastName: 'Doe',
			email: 'john.doe@example.com',
			isOwner: true,
			isPendingUser: false,
			signInType: 'email',
		},
		{
			id: '2',
			firstName: 'Jane',
			lastName: 'Smith',
			email: 'jane.smith@example.com',
			isOwner: false,
			isPendingUser: false,
			signInType: 'email',
		},
		{
			id: '3',
			firstName: null,
			lastName: null,
			email: 'pending.user@example.com',
			isOwner: false,
			isPendingUser: true,
			signInType: 'email',
		},
		{
			id: '4',
			firstName: 'LDAP',
			lastName: 'User',
			email: 'ldap.user@example.com',
			isOwner: false,
			isPendingUser: false,
			signInType: 'ldap',
		},
	];

	const mockActions: UserAction<IUser>[] = [
		{
			label: 'Delete User',
			value: 'delete',
			disabled: false,
		},
		{
			label: 'Reset Password',
			value: 'reset-password',
			disabled: false,
		},
		{
			label: 'Make Admin',
			value: 'make-admin',
			guard: (user: IUser) => !user.isOwner,
		},
	];

	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nUsersList);

			const usersList = container.querySelector('div');
			expect(usersList).toBeInTheDocument();
		});

		it('should render users when provided', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: mockUsers.slice(0, 2),
				},
			});

			const userItems = container.querySelectorAll('[data-test-id^="user-list-item-"]');
			expect(userItems).toHaveLength(2);

			const userInfos = container.querySelectorAll('.user-info-mock');
			expect(userInfos).toHaveLength(2);
			expect(userInfos[0]).toHaveTextContent('John Doe (john.doe@example.com)');
			expect(userInfos[1]).toHaveTextContent('Jane Smith (jane.smith@example.com)');
		});

		it('should render empty list when no users provided', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [],
				},
			});

			const userItems = container.querySelectorAll('[data-test-id^="user-list-item-"]');
			expect(userItems).toHaveLength(0);
		});

		it('should apply correct test IDs to user items', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: mockUsers.slice(0, 2),
				},
			});

			const johnItem = container.querySelector(
				'[data-test-id="user-list-item-john.doe@example.com"]',
			);
			const janeItem = container.querySelector(
				'[data-test-id="user-list-item-jane.smith@example.com"]',
			);

			expect(johnItem).toBeInTheDocument();
			expect(janeItem).toBeInTheDocument();
		});
	});

	describe('User Sorting', () => {
		it('should sort users with owner first', () => {
			const unsortedUsers: IUser[] = [
				mockUsers[1], // Jane (regular user)
				mockUsers[0], // John (owner)
				mockUsers[2], // Pending user
			];

			const { container } = render(N8nUsersList, {
				props: {
					users: unsortedUsers,
				},
			});

			const userInfos = container.querySelectorAll('.user-info-mock');
			expect(userInfos[0]).toHaveAttribute('data-is-owner', 'true'); // Owner should be first
			expect(userInfos[0]).toHaveTextContent('John Doe');
		});

		it('should sort pending users after owners but before regular users', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: mockUsers,
				},
			});

			const userInfos = container.querySelectorAll('.user-info-mock');

			// First should be owner
			expect(userInfos[0]).toHaveAttribute('data-is-owner', 'true');

			// Second should be pending user (sorted by email)
			expect(userInfos[1]).toHaveAttribute('data-is-pending-user', 'true');
			expect(userInfos[1]).toHaveAttribute('data-email', 'pending.user@example.com');
		});

		it('should sort regular users by last name then first name', () => {
			const usersWithSameLastName: IUser[] = [
				{
					id: '1',
					firstName: 'Bob',
					lastName: 'Smith',
					email: 'bob.smith@example.com',
					isOwner: false,
					isPendingUser: false,
				},
				{
					id: '2',
					firstName: 'Alice',
					lastName: 'Smith',
					email: 'alice.smith@example.com',
					isOwner: false,
					isPendingUser: false,
				},
			];

			const { container } = render(N8nUsersList, {
				props: {
					users: usersWithSameLastName,
				},
			});

			const userInfos = container.querySelectorAll('.user-info-mock');
			expect(userInfos[0]).toHaveTextContent('Alice Smith'); // Alice should come before Bob
			expect(userInfos[1]).toHaveTextContent('Bob Smith');
		});

		it('should fall back to email sorting when names are missing', () => {
			const usersWithoutNames: IUser[] = [
				{
					id: '1',
					email: 'z.user@example.com',
					isOwner: false,
					isPendingUser: false,
				},
				{
					id: '2',
					email: 'a.user@example.com',
					isOwner: false,
					isPendingUser: false,
				},
			];

			const { container } = render(N8nUsersList, {
				props: {
					users: usersWithoutNames,
				},
			});

			const userInfos = container.querySelectorAll('.user-info-mock');
			expect(userInfos[0]).toHaveAttribute('data-email', 'a.user@example.com');
			expect(userInfos[1]).toHaveAttribute('data-email', 'z.user@example.com');
		});

		it('should throw error when users have no email', () => {
			const usersWithoutEmail: IUser[] = [
				{
					id: '1',
					firstName: 'John',
					lastName: 'Doe',
					isOwner: false,
					isPendingUser: false,
				},
			];

			expect(() => {
				render(N8nUsersList, {
					props: {
						users: usersWithoutEmail,
					},
				});
			}).toThrow('Expected all users to have email');
		});
	});

	describe('Owner Badge', () => {
		it('should show owner badge for owner users', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[0]], // John (owner)
				},
			});

			const badge = container.querySelector('.badge-mock');
			expect(badge).toBeInTheDocument();
			expect(badge).toHaveAttribute('data-theme', 'tertiary');
			expect(badge).toHaveAttribute('data-bold', 'true');
			expect(badge).toHaveTextContent('Owner');
		});

		it('should not show owner badge for non-owner users', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[1]], // Jane (not owner)
				},
			});

			const badge = container.querySelector('.badge-mock');
			expect(badge).not.toBeInTheDocument();
		});
	});

	describe('Current User Indication', () => {
		it('should mark current user correctly', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: mockUsers.slice(0, 2),
					currentUserId: '1',
				},
			});

			const userInfos = container.querySelectorAll('.user-info-mock');
			expect(userInfos[0]).toHaveAttribute('data-is-current-user', 'true'); // John
			expect(userInfos[1]).toHaveAttribute('data-is-current-user', 'false'); // Jane
		});

		it('should handle null currentUserId', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: mockUsers.slice(0, 2),
					currentUserId: null,
				},
			});

			const userInfos = container.querySelectorAll('.user-info-mock');
			expect(userInfos[0]).toHaveAttribute('data-is-current-user', 'false');
			expect(userInfos[1]).toHaveAttribute('data-is-current-user', 'false');
		});

		it('should handle empty currentUserId', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: mockUsers.slice(0, 2),
					currentUserId: '',
				},
			});

			const userInfos = container.querySelectorAll('.user-info-mock');
			expect(userInfos[0]).toHaveAttribute('data-is-current-user', 'false');
			expect(userInfos[1]).toHaveAttribute('data-is-current-user', 'false');
		});
	});

	describe('SAML Login Support', () => {
		it('should pass SAML login enabled flag to user info', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: mockUsers.slice(0, 1),
					isSamlLoginEnabled: true,
				},
			});

			const userInfo = container.querySelector('.user-info-mock');
			expect(userInfo).toHaveAttribute('data-is-saml-login-enabled', 'true');
		});

		it('should default SAML login to false', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: mockUsers.slice(0, 1),
				},
			});

			const userInfo = container.querySelector('.user-info-mock');
			expect(userInfo).toHaveAttribute('data-is-saml-login-enabled', 'false');
		});
	});

	describe('Actions and Action Toggle', () => {
		it('should show action toggle for non-owner users when actions provided', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[1]], // Jane (not owner)
					actions: mockActions,
				},
			});

			const actionToggle = container.querySelector('.action-toggle-mock');
			expect(actionToggle).toBeInTheDocument();
			expect(actionToggle).toHaveAttribute('data-placement', 'bottom');
			expect(actionToggle).toHaveAttribute('data-theme', 'dark');
		});

		it('should not show action toggle for owner users', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[0]], // John (owner)
					actions: mockActions,
				},
			});

			const actionToggle = container.querySelector('.action-toggle-mock');
			expect(actionToggle).not.toBeInTheDocument();
		});

		it('should not show action toggle for LDAP users', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[3]], // LDAP user
					actions: mockActions,
				},
			});

			const actionToggle = container.querySelector('.action-toggle-mock');
			expect(actionToggle).not.toBeInTheDocument();
		});

		it('should not show action toggle when readonly', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[1]], // Jane (not owner)
					actions: mockActions,
					readonly: true,
				},
			});

			const actionToggle = container.querySelector('.action-toggle-mock');
			expect(actionToggle).not.toBeInTheDocument();
		});

		it('should not show action toggle when no actions provided', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[1]], // Jane (not owner)
					actions: [],
				},
			});

			const actionToggle = container.querySelector('.action-toggle-mock');
			expect(actionToggle).not.toBeInTheDocument();
		});

		it('should filter actions based on guard functions', () => {
			const actionsWithGuards: UserAction<IUser>[] = [
				{
					label: 'Admin Only Action',
					value: 'admin-action',
					guard: (user: IUser) => user.isOwner, // Only for owners
				},
				{
					label: 'Regular Action',
					value: 'regular-action',
				},
			];

			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[1]], // Jane (not owner)
					actions: actionsWithGuards,
				},
			});

			const actionToggle = container.querySelector('.action-toggle-mock');
			const actions = JSON.parse(actionToggle?.getAttribute('data-actions') || '[]');

			expect(actions).toHaveLength(1);
			expect(actions[0].value).toBe('regular-action');
		});

		it('should emit action events', async () => {
			const onAction = vi.fn();
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[1]], // Jane (not owner)
					actions: mockActions,
					onAction,
				},
			});

			const actionToggle = container.querySelector('.action-toggle-mock');
			await fireEvent(actionToggle!, new CustomEvent('action', { detail: 'delete' }));

			expect(onAction).toHaveBeenCalledWith({
				action: 'delete',
				userId: '2',
			});
		});
	});

	describe('Slots', () => {
		it('should render actions slot for non-owner users when not readonly', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[1]], // Jane (not owner)
				},
				slots: {
					actions: `
						<template #actions="{ user }">
							<button class="custom-action" :data-user-id="user.id">Custom Action</button>
						</template>
					`,
				},
			});

			const customAction = container.querySelector('.custom-action');
			expect(customAction).toBeInTheDocument();
		});

		it('should not render actions slot for owner users', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[0]], // John (owner)
				},
				slots: {
					actions: `
						<template #actions="{ user }">
							<button class="custom-action">Custom Action</button>
						</template>
					`,
				},
			});

			const customAction = container.querySelector('.custom-action');
			expect(customAction).not.toBeInTheDocument();
		});

		it('should not render actions slot when readonly', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[1]], // Jane (not owner)
					readonly: true,
				},
				slots: {
					actions: `
						<template #actions="{ user }">
							<button class="custom-action">Custom Action</button>
						</template>
					`,
				},
			});

			const customAction = container.querySelector('.custom-action');
			expect(customAction).not.toBeInTheDocument();
		});
	});

	describe('CSS Classes and Layout', () => {
		it('should apply correct CSS classes to user items', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: mockUsers.slice(0, 2),
				},
			});

			const userItems = container.querySelectorAll('[data-test-id^="user-list-item-"]');

			// First item should have border
			expect(userItems[0]).toHaveClass('itemWithBorder');

			// Last item should not have border
			expect(userItems[1]).toHaveClass('itemContainer');
			expect(userItems[1]).not.toHaveClass('itemWithBorder');
		});

		it('should apply correct classes for single user', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[0]],
				},
			});

			const userItem = container.querySelector('[data-test-id^="user-list-item-"]');
			expect(userItem).toHaveClass('itemContainer');
			expect(userItem).not.toHaveClass('itemWithBorder');
		});

		it('should have proper badge container structure', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[0]], // Owner
				},
			});

			const badgeContainer = container.querySelector('[class*="badgeContainer"]');
			expect(badgeContainer).toBeInTheDocument();

			const badge = badgeContainer?.querySelector('.badge-mock');
			expect(badge).toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		it('should handle users with missing names gracefully', () => {
			const userWithoutNames: IUser[] = [
				{
					id: '1',
					firstName: null,
					lastName: null,
					email: 'no.name@example.com',
					isOwner: false,
					isPendingUser: false,
				},
			];

			const { container } = render(N8nUsersList, {
				props: {
					users: userWithoutNames,
				},
			});

			const userInfo = container.querySelector('.user-info-mock');
			expect(userInfo).toHaveTextContent('null null (no.name@example.com)');
		});

		it('should handle empty string names', () => {
			const userWithEmptyNames: IUser[] = [
				{
					id: '1',
					firstName: '',
					lastName: '',
					email: 'empty.name@example.com',
					isOwner: false,
					isPendingUser: false,
				},
			];

			const { container } = render(N8nUsersList, {
				props: {
					users: userWithEmptyNames,
				},
			});

			const userInfo = container.querySelector('.user-info-mock');
			expect(userInfo).toBeInTheDocument();
		});

		it('should handle very long email addresses', () => {
			const userWithLongEmail: IUser[] = [
				{
					id: '1',
					firstName: 'User',
					lastName: 'Test',
					email: 'very.long.email.address.that.might.cause.layout.issues@example.com',
					isOwner: false,
					isPendingUser: false,
				},
			];

			const { container } = render(N8nUsersList, {
				props: {
					users: userWithLongEmail,
				},
			});

			const userInfo = container.querySelector('.user-info-mock');
			expect(userInfo).toHaveAttribute(
				'data-email',
				'very.long.email.address.that.might.cause.layout.issues@example.com',
			);
		});

		it('should handle component unmounting gracefully', () => {
			const { unmount } = render(N8nUsersList, {
				props: {
					users: mockUsers,
					actions: mockActions,
				},
			});

			expect(() => {
				unmount();
			}).not.toThrow();
		});
	});

	describe('Performance', () => {
		it('should handle large user lists efficiently', () => {
			const largeUserList: IUser[] = Array.from({ length: 1000 }, (_, i) => ({
				id: `${i + 1}`,
				firstName: `User${i + 1}`,
				lastName: `Test${i + 1}`,
				email: `user${i + 1}@example.com`,
				isOwner: i === 0,
				isPendingUser: false,
			}));

			const { container } = render(N8nUsersList, {
				props: {
					users: largeUserList,
				},
			});

			const userItems = container.querySelectorAll('[data-test-id^="user-list-item-"]');
			expect(userItems).toHaveLength(1000);
		});

		it('should handle rapid prop changes', async () => {
			const { rerender } = render(N8nUsersList, {
				props: {
					users: mockUsers.slice(0, 2),
				},
			});

			// Rapid changes
			for (let i = 0; i < 5; i++) {
				await rerender({
					props: {
						users: mockUsers.slice(i % 2, 3),
						currentUserId: mockUsers[i % 2].id,
					},
				});
			}

			// Should still render correctly
			expect(document.querySelectorAll('[data-test-id^="user-list-item-"]')).not.toHaveLength(0);
		});
	});

	describe('Accessibility', () => {
		it('should have proper semantic structure', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: mockUsers.slice(0, 2),
				},
			});

			const usersList = container.querySelector('div');
			expect(usersList).toBeInTheDocument();

			const userItems = container.querySelectorAll('[data-test-id^="user-list-item-"]');
			userItems.forEach((item) => {
				expect(item.tagName).toBe('DIV');
			});
		});

		it('should maintain proper focus management with action toggles', () => {
			const { container } = render(N8nUsersList, {
				props: {
					users: [mockUsers[1]], // Jane (not owner)
					actions: mockActions,
				},
			});

			const actionToggle = container.querySelector('.action-toggle-mock');
			expect(actionToggle).toBeInTheDocument();
			// Action toggle should be focusable by default
		});
	});

	describe('Generic Type Support', () => {
		it('should work with extended user types', () => {
			interface ExtendedUser extends IUser {
				department?: string;
				role?: string;
			}

			const extendedUsers: ExtendedUser[] = [
				{
					...mockUsers[0],
					department: 'Engineering',
					role: 'Senior Developer',
				},
			];

			const { container } = render(N8nUsersList, {
				props: {
					users: extendedUsers,
				},
			});

			const userInfo = container.querySelector('.user-info-mock');
			expect(userInfo).toBeInTheDocument();
		});
	});
});
