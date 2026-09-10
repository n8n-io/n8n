import userEvent from '@testing-library/user-event';

import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { createComponentRenderer } from '@/__tests__/render';
import type { GatewayOpportunity } from '../composables/useWorkflowGatewayScan';
import GatewayOpportunitySwitchModal from './GatewayOpportunitySwitchModal.vue';

const closeModal = vi.fn();
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ closeModal }),
}));

const showMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage }),
}));

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

const getCredentialTypeByName = vi.fn();
vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({ getCredentialTypeByName }),
}));

const applyToNodes = vi.fn();
vi.mock('../composables/useApplyGatewayCredential', () => ({
	useApplyGatewayCredential: () => ({ applyToNodes }),
}));

// Modal (ElDialog) doesn't render portalled content in jsdom, same workaround
// used by ProjectMoveResourceModal.test.ts.
const renderComponent = createComponentRenderer(GatewayOpportunitySwitchModal, {
	global: {
		stubs: {
			Modal: {
				template:
					'<div role="dialog"><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
			},
		},
	},
});

function makeOpportunity(overrides: Partial<GatewayOpportunity> = {}): GatewayOpportunity {
	return {
		nodeName: 'Node1',
		nodeType: 'n8n-nodes-base.openAi',
		credentialType: 'openAiApi',
		activationParameters: {},
		...overrides,
	};
}

function renderModal(opportunities: GatewayOpportunity[]) {
	return renderComponent({
		props: {
			modalName: 'gatewayOpportunitySwitch',
			data: { opportunities, workflowId: 'wf1' },
		},
	});
}

describe('GatewayOpportunitySwitchModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getCredentialTypeByName.mockReturnValue({ displayName: 'OpenAI account' });
		applyToNodes.mockReturnValue({ applied: [], failed: [] });
	});

	it('pre-selects every opportunity, so confirm switches all of them', async () => {
		const opportunities = [
			makeOpportunity({ nodeName: 'Node1' }),
			makeOpportunity({ nodeName: 'Node2' }),
		];
		applyToNodes.mockReturnValue({ applied: ['Node1', 'Node2'], failed: [] });
		const { getByTestId } = renderModal(opportunities);

		expect(getByTestId('gateway-opportunity-switch-confirm')).toHaveTextContent('Switch 2 nodes');

		await userEvent.click(getByTestId('gateway-opportunity-switch-confirm'));

		expect(applyToNodes).toHaveBeenCalledWith(opportunities);
	});

	it('excludes a deselected node from the confirm call', async () => {
		const opportunities = [
			makeOpportunity({ nodeName: 'Node1' }),
			makeOpportunity({ nodeName: 'Node2' }),
		];
		applyToNodes.mockReturnValue({ applied: ['Node1'], failed: [] });
		const { getByTestId } = renderModal(opportunities);

		await userEvent.click(getByTestId('gateway-opportunity-switch-checkbox-1'));
		expect(getByTestId('gateway-opportunity-switch-confirm')).toHaveTextContent('Switch 1 node');

		await userEvent.click(getByTestId('gateway-opportunity-switch-confirm'));

		expect(applyToNodes).toHaveBeenCalledWith([opportunities[0]]);
	});

	it('disables confirm once every row is deselected', async () => {
		const opportunities = [makeOpportunity({ nodeName: 'Node1' })];
		const { getByTestId } = renderModal(opportunities);

		await userEvent.click(getByTestId('gateway-opportunity-switch-checkbox-0'));

		expect(getByTestId('gateway-opportunity-switch-confirm')).toBeDisabled();
	});

	it('closes the modal, tracks the switch, and shows a success toast on full success', async () => {
		const opportunities = [makeOpportunity({ nodeName: 'Node1' })];
		applyToNodes.mockReturnValue({ applied: ['Node1'], failed: [] });
		const { getByTestId } = renderModal(opportunities);

		await userEvent.click(getByTestId('gateway-opportunity-switch-confirm'));

		expect(closeModal).toHaveBeenCalledWith('gatewayOpportunitySwitch');
		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.GATEWAY.SWITCH_APPLIED, {
			workflow_id: 'wf1',
			selected_count: 1,
			applied_count: 1,
			failed_count: 0,
		});
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Switched to Gateway credits',
				type: 'success',
				message: expect.stringContaining('1 node switched to Gateway credits.'),
			}),
		);
		expect(showMessage.mock.calls[0][0].message).toContain(
			'Save the workflow to keep this change.',
		);
	});

	it('mentions the failed count in the result toast when some nodes could not switch', async () => {
		const opportunities = [
			makeOpportunity({ nodeName: 'Node1' }),
			makeOpportunity({ nodeName: 'Node2' }),
		];
		applyToNodes.mockReturnValue({ applied: ['Node1'], failed: ['Node2'] });
		const { getByTestId } = renderModal(opportunities);

		await userEvent.click(getByTestId('gateway-opportunity-switch-confirm'));

		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Some nodes couldn't switch",
				type: 'warning',
				message: expect.stringContaining("1 node couldn't switch."),
			}),
		);
	});

	it('shows the activation-parameter hint only for nodes whose authentication setting would also change', () => {
		const opportunities = [
			makeOpportunity({ nodeName: 'Node1', activationParameters: {} }),
			makeOpportunity({
				nodeName: 'Node2',
				activationParameters: { authentication: 'predefinedCredentialType' },
			}),
		];
		const { getAllByTestId } = renderModal(opportunities);

		expect(getAllByTestId('gateway-opportunity-switch-auth-hint')).toHaveLength(1);
	});

	it('shows the credential type each node would switch to', () => {
		getCredentialTypeByName.mockReturnValue({ displayName: 'OpenAI account' });
		const { getByText } = renderModal([makeOpportunity({ credentialType: 'openAiApi' })]);

		expect(getByText('OpenAI account')).toBeInTheDocument();
	});

	it('falls back to the raw credential type name when it is not registered', () => {
		getCredentialTypeByName.mockReturnValue(undefined);
		const { getByText } = renderModal([makeOpportunity({ credentialType: 'openAiApi' })]);

		expect(getByText('openAiApi')).toBeInTheDocument();
	});

	it('cancels without applying anything', async () => {
		const { getByText } = renderModal([makeOpportunity()]);

		await userEvent.click(getByText('Cancel'));

		expect(applyToNodes).not.toHaveBeenCalled();
		expect(closeModal).toHaveBeenCalledWith('gatewayOpportunitySwitch');
	});
});
