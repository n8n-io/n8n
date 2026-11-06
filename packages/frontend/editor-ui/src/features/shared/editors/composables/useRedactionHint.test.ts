import { createTestWorkflowExecutionResponse } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useI18n } from '@n8n/i18n';
import { createTestingPinia } from '@pinia/testing';
import { createRunExecutionData, type RedactionInfo } from 'n8n-workflow';
import { useRedactionHint } from './useRedactionHint';

const i18n = useI18n();

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => ({ meta: {} }),
	RouterLink: vi.fn(),
}));

describe('useRedactionHint', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it.each<{
		reason: RedactionInfo['reason'];
		canReveal: boolean;
		key: Parameters<typeof i18n.baseText>[0];
	}>([
		{
			reason: 'credential_inaccessible',
			canReveal: false,
			key: 'expressionModalInput.redacted.credentialInaccessible',
		},
		{
			reason: 'workflow_redaction_policy',
			canReveal: false,
			key: 'expressionModalInput.redacted.noPermission',
		},
		{
			reason: 'workflow_redaction_policy',
			canReveal: true,
			key: 'expressionModalInput.redacted',
		},
		{
			reason: 'dynamic_credentials',
			canReveal: false,
			key: 'expressionModalInput.redacted.dynamicCredentials',
		},
		{
			reason: 'sub_workflow_redaction_policy',
			canReveal: true,
			key: 'expressionModalInput.redacted.subWorkflow',
		},
		{
			reason: 'sub_workflow_redaction_policy',
			canReveal: false,
			key: 'expressionModalInput.redacted.noPermission',
		},
	])('shows $key for $reason with canReveal=$canReveal', ({ reason, canReveal, key }) => {
		mockedStore(useWorkflowExecutionStateStore, createWorkflowDocumentId('')).activeExecution =
			createTestWorkflowExecutionResponse({
				data: createRunExecutionData({
					redactionInfo: { isRedacted: true, reason, canReveal },
				}),
			});

		const { isRedacted, redactedHintText } = useRedactionHint();

		expect(isRedacted.value).toBe(true);
		expect(redactedHintText.value).toBe(i18n.baseText(key));
	});
});
