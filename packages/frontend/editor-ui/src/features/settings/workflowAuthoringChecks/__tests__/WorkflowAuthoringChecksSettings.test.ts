import type { WorkflowCheckConfigDto } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { renderComponent } from '@/__tests__/render';
import WorkflowAuthoringChecksSettings from '@/features/settings/workflowAuthoringChecks/WorkflowAuthoringChecksSettings.vue';
import * as authoringChecksApi from '@/features/workflows/authoringChecks/authoringChecks.api';

vi.mock('@/features/workflows/authoringChecks/authoringChecks.api');

const guardrailCheck: WorkflowCheckConfigDto = {
	checkId: 'ai-agent-requires-guardrail',
	title: 'AI Agent requires Guardrails',
	description: 'Every AI Agent needs a Guardrails node.',
	defaultSeverity: 'warning',
	severityOverride: null,
	effectiveSeverity: 'warning',
	enabled: true,
};

function renderSettings() {
	return renderComponent(WorkflowAuthoringChecksSettings, {
		pinia: createTestingPinia({ stubActions: false }),
	});
}

describe('WorkflowAuthoringChecksSettings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(authoringChecksApi.listWorkflowAuthoringChecks).mockResolvedValue({
			checks: [guardrailCheck],
		});
		vi.mocked(authoringChecksApi.updateWorkflowAuthoringCheckConfig).mockImplementation(
			async (_ctx, checkId, patch) => ({
				...guardrailCheck,
				checkId,
				enabled: patch.enabled ?? guardrailCheck.enabled,
				severityOverride:
					patch.severityOverride === undefined
						? guardrailCheck.severityOverride
						: patch.severityOverride,
				effectiveSeverity:
					(patch.severityOverride === undefined
						? guardrailCheck.severityOverride
						: patch.severityOverride) ?? guardrailCheck.defaultSeverity,
			}),
		);
	});

	it('fetches checks on mount and renders one row per check', async () => {
		const { findByText, findByTestId } = renderSettings();

		expect(await findByText('AI Agent requires Guardrails')).toBeVisible();
		expect(await findByText('Every AI Agent needs a Guardrails node.')).toBeVisible();
		expect(
			await findByTestId('workflow-authoring-check-row-ai-agent-requires-guardrail'),
		).toBeInTheDocument();
		expect(authoringChecksApi.listWorkflowAuthoringChecks).toHaveBeenCalled();
	});

	it('renders the empty state when no checks are registered', async () => {
		vi.mocked(authoringChecksApi.listWorkflowAuthoringChecks).mockResolvedValue({ checks: [] });
		const { getByTestId } = renderSettings();

		await waitFor(() => expect(getByTestId('workflow-authoring-checks-empty-state')).toBeVisible());
		await waitFor(() => expect(authoringChecksApi.listWorkflowAuthoringChecks).toHaveBeenCalled());
	});

	it('calls the update API when the enabled toggle is flipped', async () => {
		const { findByTestId } = renderSettings();

		const toggle = await findByTestId(
			'workflow-authoring-check-toggle-ai-agent-requires-guardrail',
		);
		await userEvent.click(toggle);

		await waitFor(() =>
			expect(authoringChecksApi.updateWorkflowAuthoringCheckConfig).toHaveBeenCalledWith(
				expect.anything(),
				'ai-agent-requires-guardrail',
				{ enabled: false },
			),
		);
	});
});
