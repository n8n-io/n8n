import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import AppBindingApproval, {
	type AppBindingMeta,
} from '@/features/ai/instanceAi/components/AppBindingApproval.vue';
import type { ApprovalOption } from '@/features/ai/instanceAi/components/ApprovalOptionList.vue';

const APP_BINDING: AppBindingMeta = {
	appId: 'app-1',
	appName: 'Runner',
	appNamespace: 'runner',
	workflowId: 'wf-1',
	workflowName: 'Echo',
	key: 'submit',
	inputSchema: { type: 'object', properties: { message: { type: 'string' } } },
	outputSchema: { type: 'array', items: { type: 'object', additionalProperties: true } },
};

const OPTIONS: ApprovalOption[] = [
	{ key: 'always-allow', icon: 'check-check', label: 'Always allow', testId: 'opt-always-allow' },
	{ key: 'allow-once', icon: 'check', label: 'Allow once', testId: 'opt-allow-once' },
	{ key: 'deny', icon: 'ban', label: 'Deny', testId: 'opt-deny' },
];

const renderComponent = createComponentRenderer(AppBindingApproval, {
	props: { appBinding: APP_BINDING, options: OPTIONS },
});

describe('AppBindingApproval', () => {
	it('names the workflow, the app and the key, and links the workflow in a new tab', () => {
		const { getByTestId, getByText } = renderComponent();

		expect(getByText('Allow AI Assistant to connect a workflow to the app?')).toBeInTheDocument();
		const link = getByTestId('instance-ai-app-binding-workflow');
		expect(link).toHaveTextContent('Echo');
		expect(link).toHaveAttribute('href', '/workflow/wf-1');
		expect(link).toHaveAttribute('target', '_blank');
		expect(getByTestId('instance-ai-app-binding-app')).toHaveTextContent('Runner');
		expect(getByTestId('instance-ai-app-binding-key')).toHaveTextContent('as submit');
		expect(getByText('Anyone who can open the app can run this workflow.')).toBeInTheDocument();
	});

	it('shows the input and output JSON Schema in collapsible sections', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-app-binding-input')).toHaveTextContent('"message"');
		expect(getByTestId('instance-ai-app-binding-output')).toHaveTextContent(
			'"additionalProperties": true',
		);
	});

	it('emits the selected option key', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('opt-allow-once'));
		await userEvent.click(getByTestId('opt-deny'));

		expect(emitted('select')).toEqual([['allow-once'], ['deny']]);
	});
});
