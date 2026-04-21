import type { WorkflowCheckDto, WorkflowCheckTypeDto } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { renderComponent } from '@/__tests__/render';
import WorkflowAuthoringChecksSettings from '@/features/settings/workflowAuthoringChecks/WorkflowAuthoringChecksSettings.vue';
import * as authoringChecksApi from '@/features/workflows/authoringChecks/authoringChecks.api';

vi.mock('@/features/workflows/authoringChecks/authoringChecks.api');

const instance: WorkflowCheckDto = {
	id: 'instance-1',
	name: 'AI Agents must use Guardrails',
	type: 'node-has-direct-parent',
	typeTitle: 'Node has direct parent',
	config: { childNodeType: 'agent', parentNodeType: 'guardrails' },
	enabled: true,
	severity: 'warning',
};

const type: WorkflowCheckTypeDto = {
	type: 'node-has-direct-parent',
	title: 'Node has direct parent',
	description: 'Ensures a node has a specific parent',
	defaultSeverity: 'warning',
	configSchema: {
		fields: [
			{ name: 'childNodeType', label: 'Child', kind: 'nodeType', required: true },
			{ name: 'parentNodeType', label: 'Parent', kind: 'nodeType', required: true },
		],
	},
};

function renderSettings() {
	return renderComponent(WorkflowAuthoringChecksSettings, {
		pinia: createTestingPinia({ stubActions: false }),
	});
}

describe('WorkflowAuthoringChecksSettings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(authoringChecksApi.listWorkflowChecks).mockResolvedValue({ checks: [instance] });
		vi.mocked(authoringChecksApi.listWorkflowCheckTypes).mockResolvedValue({ types: [type] });
		vi.mocked(authoringChecksApi.updateWorkflowCheck).mockImplementation(
			async (_ctx, id, patch) => ({
				...instance,
				id,
				enabled: patch.enabled ?? instance.enabled,
				severity: patch.severity ?? instance.severity,
				name: patch.name ?? instance.name,
			}),
		);
	});

	it('fetches instances on mount and renders one row per instance', async () => {
		const { findByText, findByTestId } = renderSettings();

		expect(await findByText('AI Agents must use Guardrails')).toBeVisible();
		expect(await findByTestId('workflow-authoring-check-row-instance-1')).toBeInTheDocument();
		expect(authoringChecksApi.listWorkflowChecks).toHaveBeenCalled();
		expect(authoringChecksApi.listWorkflowCheckTypes).toHaveBeenCalled();
	});

	it('renders the empty state when no instances are configured', async () => {
		vi.mocked(authoringChecksApi.listWorkflowChecks).mockResolvedValue({ checks: [] });
		const { getByTestId } = renderSettings();

		await waitFor(() => expect(getByTestId('workflow-authoring-checks-empty-state')).toBeVisible());
	});

	it('calls the update API when the enabled toggle is flipped', async () => {
		const { findByTestId } = renderSettings();

		const toggle = await findByTestId('workflow-authoring-check-toggle-instance-1');
		await userEvent.click(toggle);

		await waitFor(() =>
			expect(authoringChecksApi.updateWorkflowCheck).toHaveBeenCalledWith(
				expect.anything(),
				'instance-1',
				{ enabled: false },
			),
		);
	});
});
