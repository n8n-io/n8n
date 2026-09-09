import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import type { AppBindingMeta } from '@n8n/api-types';
import AppBindingApproval from '@/features/ai/instanceAi/components/AppBindingApproval.vue';
import type { ApprovalOption } from '@/features/ai/instanceAi/components/ApprovalOptionList.vue';

const APP_BINDING: AppBindingMeta = {
	appId: 'app-1',
	appName: 'Runner',
	appNamespace: 'runner',
	workflowId: 'wf-1',
	workflowName: 'Echo',
	key: 'submit',
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
	it('shows the app, then the workflow linked in a new tab, and nothing else', () => {
		const { getByTestId, getByText, queryByText } = renderComponent();

		expect(getByText('Allow AI Assistant to connect a workflow to the app?')).toBeInTheDocument();
		const app = getByTestId('instance-ai-app-binding-app');
		const link = getByTestId('instance-ai-app-binding-workflow');
		expect(app).toHaveTextContent('Runner');
		expect(link).toHaveTextContent('Echo');
		expect(link).toHaveAttribute('href', '/workflow/wf-1');
		expect(link).toHaveAttribute('target', '_blank');
		expect(app.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(queryByText(/submit/)).toBeNull();
	});

	it('emits the selected option key', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('opt-allow-once'));
		await userEvent.click(getByTestId('opt-deny'));

		expect(emitted('select')).toEqual([['allow-once'], ['deny']]);
	});
});
