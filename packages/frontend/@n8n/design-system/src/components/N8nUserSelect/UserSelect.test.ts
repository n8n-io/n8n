import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';

import N8nUserSelect from '.';
import { createComponentRenderer } from '../../__tests__/render';
import type { IUser } from '../../types/user';

const renderComponent = createComponentRenderer(N8nUserSelect);

const getRenderedOptions = async () => {
	const dropdown = await waitFor(() => screen.getByRole('listbox'));
	expect(dropdown).toBeInTheDocument();
	return dropdown.querySelectorAll('.el-select-dropdown__item');
};

const filterInput = async (filterText: string) => {
	const input = screen.getByRole('combobox');
	await userEvent.type(input, filterText);
};

const sampleUsers: IUser[] = [
	{
		id: 'u1',
		email: 'alice@example.com',
		firstName: 'Alice',
		lastName: 'Smith',
		fullName: 'Alice Smith',
		isOwner: true,
		isPendingUser: false,
		disabled: false,
		signInType: 'email',
	},
	{
		id: 'u2',
		email: 'bob@example.com',
		firstName: 'Bob',
		lastName: 'Johnson',
		fullName: 'Bob Johnson',
		isOwner: true,
		isPendingUser: false,
		disabled: false,
		signInType: 'email',
	},
	{
		id: 'u3',
		email: 'charlie@example.com',
		firstName: 'Charlie',
		lastName: 'Brown',
		fullName: 'Charlie Brown',
		isOwner: true,
		isPendingUser: false,
		disabled: false,
		signInType: 'email',
	},
	{
		id: 'u4',
		email: 'dave@example.com',
		firstName: 'Dave',
		lastName: 'Smith',
		fullName: 'Dave Smith',
		isOwner: true,
		isPendingUser: false,
		disabled: false,
		signInType: 'email',
	},
	{
		id: 'u5',
		email: 'eve@example.com',
		isOwner: true,
		isPendingUser: false,
		disabled: false,
		signInType: 'email',
	},
	{
		id: 'u6',
		email: 'frank@example.com',
		fullName: 'Frank Castle',
		isOwner: true,
		isPendingUser: false,
		disabled: false,
		signInType: 'email',
	},
	{
		id: 'u7',
		email: 'gina@example.com',
		firstName: 'Gina',
		lastName: 'Davis',
		fullName: 'Gina Davis',
		isOwner: true,
		isPendingUser: false,
		disabled: false,
		signInType: 'email',
	},
];

describe('UserSelect', () => {
	it('should render user select with all users (even pending ones)', async () => {
		const { getByRole } = renderComponent({
			props: {
				users: sampleUsers,
			},
		});

		// ACT
		const selectInput = getByRole('combobox'); // Find the select input
		expect(selectInput).toBeInTheDocument();

		// Simulate clicking the select input to open the dropdown
		await userEvent.click(selectInput);

		// ASSERT
		// Wait for the dropdown to appear in the DOM
		const options = await getRenderedOptions();
		expect(options).toHaveLength(sampleUsers.length);
	});

	it('filters users by full name (case-insensitive)', async () => {
		renderComponent({
			props: {
				users: sampleUsers,
			},
		});

		await filterInput('alice');
		await waitFor(async () => {
			const options = await getRenderedOptions();
			expect(options.length).toBe(1);
			expect(options[0]).toHaveAttribute('id', 'user-select-option-id-u1');
		});

		await userEvent.click(document.body);

		await filterInput('SMITH');
		await waitFor(async () => {
			const options = await getRenderedOptions();
			expect(options.length).toBe(2); // Alice Smith, Dave Smith
			expect(Array.from(options).map((o) => o.getAttribute('id'))).toEqual([
				'user-select-option-id-u1',
				'user-select-option-id-u4',
			]); // Sorted by first name
		});
	});

	it('filters users by email (case-sensitive for filter term, if full name does not match)', async () => {
		renderComponent({
			props: {
				users: sampleUsers,
			},
		});

		await filterInput('alice@example.com');
		await waitFor(async () => {
			const options = await getRenderedOptions();
			expect(options.length).toBe(1);
			expect(options[0]).toHaveAttribute('id', 'user-select-option-id-u1');
		});

		await userEvent.click(document.body);

		await filterInput('Example.com'); // Email part of filter is case-sensitive in the component's logic
		await waitFor(() => {
			expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		});

		await userEvent.click(document.body);

		await filterInput('example.com'); // Matches all users with email containing 'example.com'
		await waitFor(async () => {
			const options = await getRenderedOptions();
			expect(options.length).toBe(sampleUsers.length);
		});
	});

	it('filters by full name and email and sorts by last name', async () => {
		const specificUsers: IUser[] = [
			{
				id: 's1',
				email: 'test@email.com',
				fullName: 'Alice TestName',
				isOwner: true,
				isPendingUser: false,
				disabled: false,
				signInType: 'email',
			},
			{
				id: 's2',
				email: 'alice@another.com',
				fullName: 'Bob Something',
				isOwner: true,
				isPendingUser: false,
				disabled: false,
				signInType: 'email',
			},
		];
		renderComponent({
			props: {
				users: specificUsers,
			},
		});
		await filterInput('alice'); // Should match "Alice TestName" by fullName and "Bob Something" by email
		await waitFor(async () => {
			const options = await getRenderedOptions();
			expect(options.length).toBe(2);
			expect(Array.from(options).map((o) => o.getAttribute('id'))).toEqual([
				'user-select-option-id-s2',
				'user-select-option-id-s1',
			]);
		});
	});

	it('excludes users without an email from filtered results', async () => {
		const usersWithNoEmail: IUser[] = [
			sampleUsers[0], // Alice
			{
				id: 'noemail',
				fullName: 'No Email User',
				isOwner: true,
				isPendingUser: false,
				disabled: false,
				signInType: 'email',
			},
		];
		const { getByRole } = renderComponent({
			props: {
				users: usersWithNoEmail,
			},
		});

		const selectInput = getByRole('combobox');
		expect(selectInput).toBeInTheDocument();

		await userEvent.click(selectInput);

		await waitFor(async () => {
			const options = await getRenderedOptions();
			expect(options.length).toBe(1);
			expect(options[0]).toHaveAttribute('id', 'user-select-option-id-u1');
		});

		await filterInput('No Email User'); // Try to filter by name
		await waitFor(() => {
			expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		});
	});

	it('excludes users in ignoreIds from filtered results', async () => {
		const { getByRole } = renderComponent({
			props: {
				users: sampleUsers,
				ignoreIds: ['u1', 'u3'], // Exclude Alice and Bob
			},
		});

		const selectInput = getByRole('combobox');
		expect(selectInput).toBeInTheDocument();

		await userEvent.click(selectInput);

		await waitFor(async () => {
			const options = await getRenderedOptions();
			expect(options.length).toBe(5);
		});

		await userEvent.click(document.body);

		await filterInput('smith'); // Would normally match Alice Smith (u1) and Dave Smith (u4)
		await waitFor(async () => {
			const options = await getRenderedOptions();
			expect(options.length).toBe(1);
			expect(options[0]).toHaveAttribute('id', 'user-select-option-id-u4'); // Only Dave Smith
		});
	});

	it('sorts users by lastName, then firstName, then email', async () => {
		const usersToSort: IUser[] = [
			{
				id: 'a',
				email: 'zeta@example.com',
				firstName: 'Zeta',
				lastName: 'Able',
				fullName: 'Zeta Able',
				isOwner: true,
				isPendingUser: false,
				disabled: false,
				signInType: 'email',
			},
			{
				id: 'b',
				email: 'alpha@example.com',
				firstName: 'Alpha',
				lastName: 'Baker',
				fullName: 'Alpha Baker',
				isOwner: true,
				isPendingUser: false,
				disabled: false,
				signInType: 'email',
			},
			{
				id: 'c',
				email: 'beta@example.com',
				firstName: 'Beta',
				lastName: 'Able',
				fullName: 'Beta Able',
				isOwner: true,
				isPendingUser: false,
				disabled: false,
				signInType: 'email',
			},
			{
				id: 'd',
				email: 'gamma@example.com',
				firstName: 'Gamma',
				lastName: 'Able',
				fullName: 'Gamma Able',
				isOwner: true,
				isPendingUser: false,
				disabled: false,
				signInType: 'email',
			},
			{
				id: 'e',
				email: 'delta@example.com',
				isOwner: true,
				isPendingUser: false,
				disabled: false,
				signInType: 'email',
			}, // No names, sort by email
			{
				id: 'f',
				email: 'charlie@example.com',
				firstName: 'Charlie',
				lastName: 'Baker',
				fullName: 'Charlie Baker',
				isOwner: true,
				isPendingUser: false,
				disabled: false,
				signInType: 'email',
			},
		];
		const { getByRole } = renderComponent({
			props: {
				users: usersToSort,
			},
		});

		const selectInput = getByRole('combobox');
		expect(selectInput).toBeInTheDocument();

		await userEvent.click(selectInput);

		const dropdown = await waitFor(() => getByRole('listbox'));
		expect(dropdown).toBeInTheDocument();
		const options = dropdown.querySelectorAll('.el-select-dropdown__item');
		const sortedIds = Array.from(options).map((option) => option.getAttribute('id'));

		expect(sortedIds).toEqual([
			'user-select-option-id-c',
			'user-select-option-id-e',
			'user-select-option-id-d',
			'user-select-option-id-a',
			'user-select-option-id-b',
			'user-select-option-id-f',
		]);
	});
});
