import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { PermissionsRecord } from '@n8n/permissions';

import UnifiedCredentialsPicker from './UnifiedCredentialsPicker.vue';
import type { CredentialOption } from './UnifiedCredentialsPicker.vue';
import { createComponentRenderer } from '@/__tests__/render';

// Rich stub of the design-system dropdown: renders the trigger slot inline AND
// every menu item (with its slots), so we can assert both the trigger chrome and
// the menu contents without opening a teleported popover. `select` mirrors the
// real component's contract (emit item id on activation). The clickable carries
// each item's real `testId` so unit and E2E selectors stay identical.
const dropdownStub = {
	inheritAttrs: false,
	props: ['items', 'disabled'],
	emits: ['select'],
	template: `
		<div data-test-id="dropdown" :data-disabled="disabled">
			<slot name="trigger" />
			<ul>
				<li v-for="it in items" :key="it.id" :data-test-id="'menu-item-' + it.id">
					<span v-if="it.divided" :data-test-id="'menu-divided-' + it.id" />
					<button
						type="button"
						:disabled="it.disabled"
						:data-test-id="it.testId"
						@click="$emit('select', it.id)"
					>
						<slot name="item-leading" :item="it" :ui="{ class: '' }" />
						<slot name="item-label" :item="it" :ui="{ class: '' }">{{ it.label }}</slot>
						<slot name="item-trailing" :item="it" :ui="{ class: '' }" />
					</button>
					<span v-if="it.checked" :data-test-id="'menu-check-' + it.id" />
				</li>
			</ul>
		</div>`,
};
// CredentialIcon resolves a node icon from the store; stub it to a marker.
const credentialIconStub = { template: '<div data-test-id="ucp-icon-service" />' };

const renderComponent = createComponentRenderer(UnifiedCredentialsPicker, {
	global: {
		// The SFC's compiled name is `DropdownMenu` (filename), not the barrel alias.
		stubs: {
			DropdownMenu: dropdownStub,
			N8nDropdownMenu: dropdownStub,
			CredentialIcon: credentialIconStub,
		},
	},
});

// Menu item ids (select values) and their preserved test-ids.
const N8N_CREDITS_ID = '__n8n_credits__';
const CREATE_ID = '__create__';
const N8N_CREDITS_ITEM = 'node-credentials-select-item-n8n-credits';
const CREATE_ITEM = 'node-credentials-select-item-new';
const credItem = (id: string) => `node-credentials-select-item-${id}`;

function option(overrides: Partial<CredentialOption> = {}): CredentialOption {
	return {
		id: 'c1',
		name: 'OpenAI global key',
		typeDisplayName: 'OpenAI API',
		isResolvable: false,
		...overrides,
	};
}

const canCreate = { create: true } as unknown as PermissionsRecord['credential'];
const cannotCreate = { create: false } as unknown as PermissionsRecord['credential'];

const baseProps = {
	credentialType: 'openAiApi',
	nodeDisplayName: 'OpenAI',
	options: [] as CredentialOption[],
	selectedCredentialId: null as string | null,
	isAiGatewayManaged: false,
	permissions: canCreate,
};

describe('UnifiedCredentialsPicker', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	// ─── Trigger states ────────────────────────────────────────────────────────
	describe('trigger', () => {
		it('renders the "Connect to {node}" entry button with a service icon and no trailing button when there are no own credentials', () => {
			renderComponent({ props: { ...baseProps } });

			expect(screen.getByText('Connect to OpenAI')).toBeInTheDocument();
			expect(screen.getByTestId('ucp-icon-service')).toBeInTheDocument();
			expect(screen.queryByTestId('credential-edit-button')).not.toBeInTheDocument();
			expect(screen.queryByTestId('ucp-settings-button')).not.toBeInTheDocument();
		});

		it('shows wallet icon, "n8n credits" and the grey remaining pill when n8n credits is selected', () => {
			renderComponent({
				props: { ...baseProps, isAiGatewayManaged: true, balance: 2.75, options: [option()] },
			});

			const trigger = screen.getByTestId('node-credentials-select');
			expect(trigger).toHaveTextContent('n8n credits');
			expect(trigger).toHaveTextContent('$2.75 remaining');
			expect(screen.getByTestId('ucp-trigger-icon-wallet')).toBeInTheDocument();
		});

		it('shows an enabled settings gear and no pen when n8n credits is selected', () => {
			renderComponent({
				props: { ...baseProps, isAiGatewayManaged: true, balance: 2.75, options: [option()] },
			});

			expect(screen.getByTestId('ucp-settings-button')).toBeEnabled();
			expect(screen.queryByTestId('credential-edit-button')).not.toBeInTheDocument();
		});

		it('emits "topUp" when the settings gear is clicked (n8n credits)', async () => {
			const { emitted } = renderComponent({
				props: { ...baseProps, isAiGatewayManaged: true, balance: 2.75, options: [option()] },
			});

			await userEvent.click(screen.getByTestId('ucp-settings-button'));

			expect(emitted('topUp')).toBeTruthy();
		});

		it('shows a key icon, the name and a pen button when a standard own credential is selected', () => {
			renderComponent({ props: { ...baseProps, selectedCredentialId: 'c1', options: [option()] } });

			const trigger = screen.getByTestId('node-credentials-select');
			expect(trigger).toHaveTextContent('OpenAI global key');
			expect(screen.getByTestId('ucp-trigger-icon-key')).toBeInTheDocument();
			expect(screen.getByTestId('credential-edit-button')).toBeInTheDocument();
			expect(screen.queryByTestId('ucp-settings-button')).not.toBeInTheDocument();
		});

		it('shows a user icon when the selected own credential is resolvable (end-user)', () => {
			renderComponent({
				props: {
					...baseProps,
					selectedCredentialId: 'c2',
					options: [option({ id: 'c2', name: 'OpenAI dynamic', isResolvable: true })],
				},
			});

			expect(screen.getByTestId('node-credentials-select')).toHaveTextContent('OpenAI dynamic');
			expect(screen.getByTestId('ucp-trigger-icon-user')).toBeInTheDocument();
		});

		it('prefers the n8n credits state over a set credential id (managed wins)', () => {
			renderComponent({
				props: {
					...baseProps,
					isAiGatewayManaged: true,
					selectedCredentialId: 'c1',
					balance: 2.75,
					options: [option()],
				},
			});

			const trigger = screen.getByTestId('node-credentials-select');
			expect(trigger).toHaveTextContent('n8n credits');
			expect(trigger).not.toHaveTextContent('OpenAI global key');
		});

		it('falls back to the entry button when the selected id is stale (not in options) and not managed', () => {
			renderComponent({
				props: { ...baseProps, selectedCredentialId: 'missing', options: [option()] },
			});

			expect(screen.getByText('Connect to OpenAI')).toBeInTheDocument();
		});
	});

	// ─── Balance pill ────────────────────────────────────────────────────────
	describe('balance pill', () => {
		it('shows the danger "No credits" pill when balance is depleted', () => {
			renderComponent({
				props: { ...baseProps, isAiGatewayManaged: true, balance: 0, options: [option()] },
			});

			expect(screen.getByTestId('node-credentials-select')).toHaveTextContent('No credits');
		});

		it('shows no pill when the balance is unknown', () => {
			renderComponent({
				props: { ...baseProps, isAiGatewayManaged: true, balance: undefined, options: [option()] },
			});

			const trigger = screen.getByTestId('node-credentials-select');
			expect(trigger).toHaveTextContent('n8n credits');
			expect(trigger).not.toHaveTextContent('remaining');
			expect(trigger).not.toHaveTextContent('No credits');
		});

		it('does not emit "topUp" from the balance pill — the gear is the only top-up affordance', async () => {
			const { emitted } = renderComponent({
				props: { ...baseProps, isAiGatewayManaged: true, balance: 2.75, options: [option()] },
			});

			const trigger = screen.getByTestId('node-credentials-select');
			await userEvent.click(within(trigger).getByText('$2.75 remaining'));

			expect(emitted('topUp')).toBeFalsy();
		});
	});

	// ─── Entry menu (no own credentials) ───────────────────────────────────────
	describe('entry menu', () => {
		it('offers exactly two rows: "Use n8n credits / Ready to run" and "Use my own credential / Bring your own API key"', () => {
			renderComponent({ props: { ...baseProps } });

			const n8nCredits = screen.getByTestId(`menu-item-${N8N_CREDITS_ID}`);
			expect(n8nCredits).toHaveTextContent('Use n8n credits');
			expect(n8nCredits).toHaveTextContent('Ready to run');
			expect(screen.getByTestId('ucp-row-icon-wallet')).toBeInTheDocument();

			const own = screen.getByTestId(`menu-item-${CREATE_ID}`);
			expect(own).toHaveTextContent('Use my own credential');
			expect(own).toHaveTextContent('Bring your own API key');
			expect(screen.getByTestId('ucp-row-icon-key')).toBeInTheDocument();
		});

		it('shows the "{balance} remaining" pill on the entry n8n credits row', () => {
			renderComponent({ props: { ...baseProps, balance: 5 } });

			expect(screen.getByTestId(`menu-item-${N8N_CREDITS_ID}`)).toHaveTextContent(
				'$5.00 remaining',
			);
		});

		it('emits "selectN8nCredits" from the entry n8n credits row', async () => {
			const { emitted } = renderComponent({ props: { ...baseProps } });
			await userEvent.click(screen.getByTestId(N8N_CREDITS_ITEM));
			expect(emitted('selectN8nCredits')).toBeTruthy();
		});

		it('emits "createCredential" from the entry "use my own credential" row', async () => {
			const { emitted } = renderComponent({ props: { ...baseProps } });
			await userEvent.click(screen.getByTestId(CREATE_ITEM));
			expect(emitted('createCredential')).toBeTruthy();
		});
	});

	// ─── Configured menu (has own credentials) ──────────────────────────────────
	describe('configured menu', () => {
		const configuredProps = {
			...baseProps,
			selectedCredentialId: 'c1',
			balance: 2.75,
			options: [option(), option({ id: 'c2', name: 'OpenAI dynamic', isResolvable: true })],
		};

		it('lists n8n credits first, then each credential, then a divided "Create a new credential"', () => {
			renderComponent({ props: { ...configuredProps } });

			const n8n = screen.getByTestId(`menu-item-${N8N_CREDITS_ID}`);
			expect(n8n).toHaveTextContent('n8n credits');
			expect(n8n).toHaveTextContent('$2.75 remaining');

			expect(screen.getByTestId('menu-item-c1')).toHaveTextContent('OpenAI global key');

			const create = screen.getByTestId(`menu-item-${CREATE_ID}`);
			expect(create).toHaveTextContent('Create a new credential');
			expect(screen.getByTestId(`menu-divided-${CREATE_ID}`)).toBeInTheDocument();
		});

		it('shows the type name as subtitle for a standard credential and a key icon', () => {
			renderComponent({ props: { ...configuredProps } });

			const row = screen.getByTestId('menu-item-c1');
			expect(row).toHaveTextContent('OpenAI API');
			expect(within(row).getByTestId('ucp-row-icon-key')).toBeInTheDocument();
		});

		it('shows "End-user credential" as subtitle for a resolvable credential and a user icon', () => {
			renderComponent({ props: { ...configuredProps } });

			const row = screen.getByTestId('menu-item-c2');
			expect(row).toHaveTextContent('End-user credential');
			expect(within(row).getByTestId('ucp-row-icon-user')).toBeInTheDocument();
		});

		it('checkmarks the active row only (the selected credential)', () => {
			renderComponent({ props: { ...configuredProps } });

			expect(screen.getByTestId('menu-check-c1')).toBeInTheDocument();
			expect(screen.queryByTestId('menu-check-c2')).not.toBeInTheDocument();
			expect(screen.queryByTestId(`menu-check-${N8N_CREDITS_ID}`)).not.toBeInTheDocument();
		});

		it('checkmarks the n8n credits row when n8n credits is active', () => {
			renderComponent({
				props: { ...configuredProps, isAiGatewayManaged: true, selectedCredentialId: null },
			});

			expect(screen.getByTestId(`menu-check-${N8N_CREDITS_ID}`)).toBeInTheDocument();
			expect(screen.queryByTestId('menu-check-c1')).not.toBeInTheDocument();
		});

		it('emits "selectCredential" with the id when a credential row is chosen', async () => {
			const { emitted } = renderComponent({ props: { ...configuredProps } });
			await userEvent.click(screen.getByTestId(credItem('c2')));
			expect(emitted('selectCredential')).toEqual([['c2']]);
		});

		it('emits "selectN8nCredits" when the n8n credits row is chosen', async () => {
			const { emitted } = renderComponent({ props: { ...configuredProps } });
			await userEvent.click(screen.getByTestId(N8N_CREDITS_ITEM));
			expect(emitted('selectN8nCredits')).toBeTruthy();
		});

		it('emits "createCredential" from the create row', async () => {
			const { emitted } = renderComponent({ props: { ...configuredProps } });
			await userEvent.click(screen.getByTestId(CREATE_ITEM));
			expect(emitted('createCredential')).toBeTruthy();
		});

		it('replaces "Create a new credential" with "Use my own credential" when n8n credits is selected and no own credentials exist', async () => {
			const { emitted } = renderComponent({
				props: { ...baseProps, isAiGatewayManaged: true, balance: 5, options: [] },
			});

			// n8n credits row stays (checked, with the remaining pill).
			const n8n = screen.getByTestId(`menu-item-${N8N_CREDITS_ID}`);
			expect(n8n).toHaveTextContent('n8n credits');
			expect(screen.getByTestId(`menu-check-${N8N_CREDITS_ID}`)).toBeInTheDocument();

			// The create row reads as the invitational entry (no divider), same action.
			const create = screen.getByTestId(`menu-item-${CREATE_ID}`);
			expect(create).toHaveTextContent('Use my own credential');
			expect(create).toHaveTextContent('Bring your own API key');
			expect(create).not.toHaveTextContent('Create a new credential');
			expect(screen.queryByTestId(`menu-divided-${CREATE_ID}`)).not.toBeInTheDocument();

			await userEvent.click(screen.getByTestId(CREATE_ITEM));
			expect(emitted('createCredential')).toBeTruthy();
		});
	});

	// ─── Non-Connect nodes (showN8nCredits=false) ────────────────────────────
	describe('without n8n credits (unsupported type)', () => {
		it('omits the n8n credits row from the configured menu', () => {
			renderComponent({
				props: {
					...baseProps,
					showN8nCredits: false,
					selectedCredentialId: 'c1',
					options: [option()],
				},
			});

			expect(screen.queryByTestId(`menu-item-${N8N_CREDITS_ID}`)).not.toBeInTheDocument();
			expect(screen.getByTestId('menu-item-c1')).toBeInTheDocument();
			expect(screen.getByTestId(`menu-item-${CREATE_ID}`)).toBeInTheDocument();
		});

		it('shows only "Use my own credential" in the entry menu', () => {
			renderComponent({ props: { ...baseProps, showN8nCredits: false } });

			expect(screen.getByText('Connect to OpenAI')).toBeInTheDocument();
			expect(screen.queryByTestId(`menu-item-${N8N_CREDITS_ID}`)).not.toBeInTheDocument();
			const own = screen.getByTestId(`menu-item-${CREATE_ID}`);
			expect(own).toHaveTextContent('Use my own credential');
			expect(own).toHaveTextContent('Bring your own API key');
		});

		it('keeps the own-credential trigger and pen unchanged', () => {
			renderComponent({
				props: {
					...baseProps,
					showN8nCredits: false,
					selectedCredentialId: 'c1',
					options: [option()],
				},
			});

			expect(screen.getByTestId('node-credentials-select')).toHaveTextContent('OpenAI global key');
			expect(screen.getByTestId('ucp-trigger-icon-key')).toBeInTheDocument();
			expect(screen.getByTestId('credential-edit-button')).toBeInTheDocument();
		});
	});

	// ─── Trailing actions ────────────────────────────────────────────────────
	describe('trailing actions', () => {
		it('emits "edit" when the pen button is clicked for an own credential', async () => {
			const { emitted } = renderComponent({
				props: { ...baseProps, selectedCredentialId: 'c1', options: [option()] },
			});

			await userEvent.click(screen.getByTestId('credential-edit-button'));
			expect(emitted('edit')).toBeTruthy();
		});

		it('hides the pen when the selected end-user credential is not editable', () => {
			renderComponent({
				props: {
					...baseProps,
					selectedCredentialId: 'c2',
					options: [option({ id: 'c2', name: 'OpenAI dynamic', isResolvable: true })],
					canEdit: false,
				},
			});

			expect(screen.queryByTestId('credential-edit-button')).not.toBeInTheDocument();
		});
	});

	// ─── Issues & availability ───────────────────────────────────────────────
	describe('issues & availability', () => {
		it('shows a warning with the issue list when the credential has issues', () => {
			renderComponent({
				props: {
					...baseProps,
					selectedCredentialId: 'c1',
					options: [option()],
					issues: ['Credential is not connected'],
				},
			});

			expect(screen.getByTestId('ucp-issues-warning')).toBeInTheDocument();
		});

		it('shows no warning without issues', () => {
			renderComponent({
				props: { ...baseProps, selectedCredentialId: 'c1', options: [option()] },
			});

			expect(screen.queryByTestId('ucp-issues-warning')).not.toBeInTheDocument();
		});

		it('labels the trigger "{name} (unavailable)" when the stored credential no longer resolves', () => {
			renderComponent({
				props: {
					...baseProps,
					options: [option()],
					selectedCredentialId: 'gone',
					selectedCredentialName: 'Old key',
					issues: ['Credential not found'],
				},
			});

			expect(screen.getByTestId('node-credentials-select')).toHaveTextContent(
				'Old key (unavailable)',
			);
		});
	});

	// ─── End-user credential indicator ───────────────────────────────────────
	describe('end-user credential indicator', () => {
		const resolvableProps = {
			...baseProps,
			selectedCredentialId: 'c2',
			options: [option({ id: 'c2', name: 'OpenAI dynamic', isResolvable: true })],
		};

		it('shows the indicator next to the control when the selected credential is end-user', () => {
			renderComponent({ props: { ...resolvableProps } });

			expect(screen.getByTestId('node-credential-private-icon')).toBeInTheDocument();
		});

		it('keeps the indicator in readonly mode', () => {
			renderComponent({ props: { ...resolvableProps, readonly: true } });

			expect(screen.getByTestId('node-credential-private-icon')).toBeInTheDocument();
		});

		it('shows no indicator for a standard credential', () => {
			renderComponent({
				props: { ...baseProps, selectedCredentialId: 'c1', options: [option()] },
			});

			expect(screen.queryByTestId('node-credential-private-icon')).not.toBeInTheDocument();
		});
	});

	// ─── Readonly & permissions ──────────────────────────────────────────────
	describe('readonly & permissions', () => {
		it('disables the dropdown and the pen when readonly', () => {
			renderComponent({
				props: { ...baseProps, selectedCredentialId: 'c1', options: [option()], readonly: true },
			});

			expect(screen.getByTestId('dropdown')).toHaveAttribute('data-disabled', 'true');
			expect(screen.getByTestId('credential-edit-button')).toBeDisabled();
		});

		it('disables the "Create a new credential" row when the user cannot create credentials', () => {
			renderComponent({
				props: {
					...baseProps,
					selectedCredentialId: 'c1',
					options: [option()],
					permissions: cannotCreate,
				},
			});

			expect(screen.getByTestId(CREATE_ITEM)).toBeDisabled();
		});
	});
});
