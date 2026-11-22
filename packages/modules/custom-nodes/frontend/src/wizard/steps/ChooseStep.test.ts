import { createComponentRenderer, waitAllPromises } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';

import type { NewNodeFields, WizardIssue, WizardTarget } from '../wizard.types';
import ChooseStep from './ChooseStep.vue';

vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const { N8nSelect2Stub } = await import('../../__tests__/designSystemStubs');
	return { ...actual, N8nSelect2: N8nSelect2Stub };
});

const { showMessage } = vi.hoisted(() => ({ showMessage: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage }) }));

const renderStep = createComponentRenderer(ChooseStep);

beforeAll(() => {
	// The combobox list scrolls the highlighted option into view. jsdom has no layout.
	Element.prototype.scrollIntoView = vi.fn();
});

const node = (): NewNodeFields => ({
	displayName: '',
	description: '',
	baseUrl: '',
	auth: { kind: 'none' },
});

const setup = (
	props: {
		mode?: 'create' | 'edit';
		target?: WizardTarget | null;
		issues?: WizardIssue[];
		editTargetLabel?: string;
		node?: NewNodeFields;
	} = {},
) =>
	renderStep({
		props: {
			mode: props.mode ?? 'create',
			target: props.target === undefined ? { kind: 'newNode' } : props.target,
			node: props.node ?? node(),
			name: '',
			description: '',
			editTargetLabel: props.editTargetLabel,
			targetItems: [
				{ value: 'node:node-1', label: 'Acme' },
				{ value: 'parent:n8n-nodes-base.github', label: 'GitHub' },
				{ value: 'parent:n8n-nodes-base.slack', label: 'Slack' },
			],
			issues: props.issues ?? [],
		},
	});

describe('ChooseStep', () => {
	it('emits the fields of a new custom node', async () => {
		const { getByTestId, emitted } = setup();

		await userEvent.type(getByTestId('custom-action-wizard-node-name'), 'A');
		await userEvent.type(getByTestId('custom-action-wizard-node-base-url'), 'h');
		await userEvent.selectOptions(getByTestId('custom-action-wizard-node-auth'), 'httpBearerAuth');

		expect(emitted('update:node')).toEqual([
			[expect.objectContaining({ displayName: 'A' })],
			[expect.objectContaining({ baseUrl: 'h' })],
			[expect.objectContaining({ auth: { kind: 'generic', type: 'httpBearerAuth' } })],
		]);
	});

	describe('icon', () => {
		const upload = async (view: ReturnType<typeof setup>, file: File) => {
			await userEvent.upload(view.getByTestId('custom-action-wizard-icon-input'), file);
			await waitAllPromises();
		};

		it('shows the field only for a new custom node', async () => {
			const view = setup();
			expect(view.getByTestId('custom-action-wizard-icon-choose')).toBeInTheDocument();

			await userEvent.click(view.getByTestId('custom-action-wizard-choice-existing'));
			expect(view.queryByTestId('custom-action-wizard-icon-choose')).not.toBeInTheDocument();
		});

		it('does not show the field when the node is an action target in the edit mode', () => {
			const view = setup({
				mode: 'edit',
				target: { kind: 'parent', parentNodeType: 'n8n-nodes-base.slack' },
			});
			expect(view.queryByTestId('custom-action-wizard-icon-choose')).not.toBeInTheDocument();
		});

		it('emits the chosen file as a data URI', async () => {
			const view = setup();

			await upload(view, new File([new Uint8Array([1, 2, 3])], 'icon.png', { type: 'image/png' }));

			expect(view.emitted('update:icon')).toEqual([
				[{ fileName: 'icon.png', dataUri: 'data:image/png;base64,AQID' }],
			]);
		});

		it('rejects a file over 256 KiB', async () => {
			const view = setup();

			await upload(
				view,
				new File([new Uint8Array(256 * 1024 + 1)], 'big.png', { type: 'image/png' }),
			);

			expect(view.emitted('update:icon')).toBeUndefined();
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ title: expect.stringContaining('too large'), type: 'error' }),
			);
		});

		it('rejects a file that is not PNG or SVG', async () => {
			const view = setup();

			// The file picker filters by type. A dropped or renamed file can still arrive.
			await userEvent
				.setup({ applyAccept: false })
				.upload(
					view.getByTestId('custom-action-wizard-icon-input'),
					new File(['x'], 'icon.gif', { type: 'image/gif' }),
				);
			await waitAllPromises();

			expect(view.emitted('update:icon')).toBeUndefined();
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Use a PNG or SVG file.', type: 'error' }),
			);
		});

		it('shows the file name and a preview, and removes the icon', async () => {
			const view = renderStep({
				props: {
					mode: 'create',
					target: { kind: 'newNode' },
					node: node(),
					name: '',
					description: '',
					targetItems: [],
					issues: [],
					icon: { fileName: 'icon.png', dataUri: 'data:image/png;base64,AQID' },
				},
			});

			expect(view.getByTestId('custom-action-wizard-icon-name')).toHaveTextContent('icon.png');
			expect(view.getByTestId('custom-action-wizard-icon-preview')).toHaveAttribute(
				'src',
				'data:image/png;base64,AQID',
			);

			await userEvent.click(view.getByTestId('custom-action-wizard-icon-remove'));

			expect(view.emitted('update:icon')).toEqual([[null]]);
		});
	});

	it('asks for the credential type of a predefined credential', async () => {
		const { getByTestId, emitted } = setup({
			node: { ...node(), auth: { kind: 'predefined', credentialType: '' } },
		});

		await userEvent.type(getByTestId('custom-action-wizard-node-credential-type'), 'g');

		expect(emitted('update:node')).toEqual([
			[expect.objectContaining({ auth: { kind: 'predefined', credentialType: 'g' } })],
		]);
	});

	it('emits an existing node as the target', async () => {
		const { getByTestId, queryByTestId, getByRole, emitted } = setup();

		await userEvent.click(getByTestId('custom-action-wizard-choice-existing'));
		expect(queryByTestId('custom-action-wizard-node-name')).not.toBeInTheDocument();
		await userEvent.type(getByRole('combobox', { name: 'Node' }), 'Sla');
		await userEvent.click(await screen.findByRole('option', { name: 'Slack' }));

		expect(emitted('update:target')).toEqual([
			[null],
			[{ kind: 'parent', parentNodeType: 'n8n-nodes-base.slack' }],
		]);
	});

	it('filters the list of nodes as the user types', async () => {
		const { getByTestId, getByRole } = setup();

		await userEvent.click(getByTestId('custom-action-wizard-choice-existing'));
		await userEvent.type(getByRole('combobox', { name: 'Node' }), 'git');

		await waitFor(() => {
			expect(screen.getAllByRole('option').map((option) => option.textContent?.trim())).toEqual([
				'GitHub',
			]);
		});
	});

	it('emits the name and description of the action', async () => {
		const { getByTestId, emitted } = setup();

		await userEvent.type(getByTestId('custom-action-wizard-action-name'), 'G');
		await userEvent.type(getByTestId('custom-action-wizard-action-description'), 'D');

		expect(emitted('update:name')).toEqual([['G']]);
		expect(emitted('update:description')).toEqual([['D']]);
	});

	it('shows the node of the action in the edit mode', () => {
		const { getByTestId, queryByTestId } = setup({
			mode: 'edit',
			target: { kind: 'parent', parentNodeType: 'n8n-nodes-base.slack' },
			editTargetLabel: 'Slack',
		});

		expect(getByTestId('custom-action-wizard-edit-target')).toHaveTextContent('Action of Slack');
		expect(queryByTestId('custom-action-wizard-choice-new')).not.toBeInTheDocument();
	});

	it('shows the issues at their fields', () => {
		const { getAllByTestId } = setup({
			issues: [
				{ path: 'node.baseUrl', code: 'invalid_base_url', message: 'Bad base URL' },
				{ path: 'name', code: 'required', message: 'Enter a name' },
			],
		});

		expect(
			getAllByTestId('custom-action-wizard-field-issues').map((list) => list.textContent),
		).toEqual(['Bad base URL', 'Enter a name']);
	});
});
