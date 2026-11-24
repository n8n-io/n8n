import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import NodeVersionPicker from './NodeVersionPicker.vue';

const OLDER_DISABLED = 'Older than the current version. Use Undo or Version History to go back.';

const renderComponent = createComponentRenderer(NodeVersionPicker, {
	props: {
		nodeName: 'HTTP Request',
		currentVersion: 3,
		latest: 4.5,
		versions: [4.5, 4.4, 3, 2, 1],
		disabled: false,
	},
});

async function openMenu() {
	await userEvent.click(screen.getByTestId('node-version-select'));
	return await screen.findByRole('listbox');
}

async function pick(version: string) {
	const listbox = await openMenu();
	await userEvent.click(within(listbox).getByRole('option', { name: new RegExp(`^${version}`) }));
}

describe('NodeVersionPicker', () => {
	it('names the select after the node', () => {
		renderComponent();

		const select = screen.getByRole('combobox', { name: 'HTTP Request node version' });
		expect(select).toHaveTextContent('3');
	});

	it('lists the latest version under Recommended and the rest under Previous versions', async () => {
		renderComponent();

		const listbox = await openMenu();
		const recommended = within(listbox).getByRole('group', { name: 'Recommended' });
		const previous = within(listbox).getByRole('group', { name: 'Previous versions' });

		const recommendedOptions = within(recommended).getAllByRole('option');
		expect(recommendedOptions).toHaveLength(1);
		expect(recommendedOptions[0]).toHaveTextContent('4.5');
		expect(recommendedOptions[0]).toHaveTextContent('Latest');

		const previousOptions = within(previous).getAllByRole('option');
		expect(previousOptions.map((option) => option.textContent?.trim().split(/\s+/)[0])).toEqual([
			'4.4',
			'3',
			'2',
			'1',
		]);
		expect(previous).not.toHaveTextContent('Latest');
	});

	it('marks only the current version', async () => {
		renderComponent();

		const listbox = await openMenu();
		const marked = within(listbox)
			.getAllByRole('option')
			.filter((option) => option.textContent?.includes('Current'));

		expect(marked).toHaveLength(1);
		expect(marked[0]).toHaveTextContent('3');
		expect(marked[0]).toHaveAttribute('aria-selected', 'true');
	});

	it('disables the versions older than the current version and gives the reason', async () => {
		renderComponent();

		const listbox = await openMenu();
		const disabled = within(listbox)
			.getAllByRole('option')
			.filter((option) => option.getAttribute('aria-disabled') === 'true');

		expect(disabled.map((option) => option.textContent?.trim())).toEqual(['2', '1']);
		expect(screen.getByText(OLDER_DISABLED)).toBeInTheDocument();
	});

	it('gives no reason when no version is disabled', async () => {
		renderComponent({ props: { currentVersion: 1 } });

		await openMenu();

		expect(screen.queryByText(OLDER_DISABLED)).not.toBeInTheDocument();
	});

	it('omits the Recommended group when no version is the latest', async () => {
		renderComponent({ props: { latest: undefined } });

		const listbox = await openMenu();

		expect(within(listbox).queryByRole('group', { name: 'Recommended' })).not.toBeInTheDocument();
		expect(within(listbox).getAllByRole('option')).toHaveLength(5);
	});

	it('asks for confirmation when the user picks a newer version', async () => {
		const { emitted } = renderComponent();

		await pick('4.5');

		const dialog = await screen.findByRole('dialog');
		expect(
			within(dialog).getByRole('heading', { name: 'Update HTTP Request to version 4.5?' }),
		).toBeInTheDocument();
		expect(dialog).toHaveTextContent(
			'Your parameters carry over where the new version supports them. Missing values are highlighted after the update.',
		);
		expect(dialog).toHaveTextContent(
			'You can undo the update until you publish. Edits made after the update are lost on undo.',
		);
		expect(emitted('update')).toBeUndefined();
	});

	it('emits the picked version when the user confirms', async () => {
		const { emitted } = renderComponent();

		await pick('4.5');
		const dialog = await screen.findByRole('dialog');
		await userEvent.click(within(dialog).getByRole('button', { name: 'Update' }));

		expect(emitted('update')).toEqual([[4.5]]);
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('emits nothing when the user cancels', async () => {
		const { emitted } = renderComponent();

		await pick('4.5');
		const dialog = await screen.findByRole('dialog');
		await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(emitted('update')).toBeUndefined();
		expect(screen.getByTestId('node-version-select')).toHaveTextContent('3');
	});

	it('emits nothing when the user closes the dialog with Escape', async () => {
		const { emitted } = renderComponent();

		await pick('4.5');
		await screen.findByRole('dialog');
		await userEvent.keyboard('{Escape}');

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(emitted('update')).toBeUndefined();
	});

	it('opens no dialog when the user picks the current version', async () => {
		const { emitted } = renderComponent();

		await pick('3');

		await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(emitted('update')).toBeUndefined();
	});

	it('does not open when disabled', async () => {
		renderComponent({ props: { disabled: true } });

		const select = screen.getByTestId('node-version-select');
		expect(select).toHaveAttribute('data-disabled');
		await userEvent.click(select);

		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
	});
});
