import type { AgentToolPolicyRefusal, PolicyViolation } from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToolPolicyRefusalText } from '../useToolPolicyRefusalText';

const getNodeTypeMock = vi.fn();
const getCredentialTypeByNameMock = vi.fn();
const loadNodeTypesMock = vi.fn();
const fetchCredentialTypesMock = vi.fn();

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: getNodeTypeMock,
		loadNodeTypesIfNotLoaded: loadNodeTypesMock,
	}),
}));
vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		getCredentialTypeByName: getCredentialTypeByNameMock,
		fetchCredentialTypes: fetchCredentialTypesMock,
	}),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: { name?: string } }) =>
			`${key}:${opts?.interpolate?.name}`,
	}),
}));

function violation(overrides: Partial<PolicyViolation> = {}): PolicyViolation {
	return {
		kind: 'node-type-unavailable',
		checkId: 'check-1',
		message: 'Not allowed',
		...overrides,
	};
}

function refusal(violations: [PolicyViolation, ...PolicyViolation[]]): AgentToolPolicyRefusal {
	return { status: 'policy_refused', error: 'Blocked', instruction: 'Stop', violations };
}

describe('useToolPolicyRefusalText', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('subjectName', () => {
		it('names a `*Tool` node type by its base type', () => {
			getNodeTypeMock.mockImplementation((type: string) =>
				type === 'n8n-nodes-base.gmail' ? { displayName: 'Gmail' } : undefined,
			);
			const { subjectName } = useToolPolicyRefusalText();

			expect(subjectName(violation({ subject: 'n8n-nodes-base.gmailTool' }))).toBe('Gmail');
		});

		it('names a credential subject from the credentials store', () => {
			getCredentialTypeByNameMock.mockReturnValue({ displayName: 'Slack API' });
			const { subjectName } = useToolPolicyRefusalText();

			expect(subjectName(violation({ subject: 'slackApi', subjectType: 'credentialType' }))).toBe(
				'Slack API',
			);
		});

		it('returns undefined rather than the type id when the type is not loaded', () => {
			const { subjectName } = useToolPolicyRefusalText();

			expect(subjectName(violation({ subject: 'n8n-nodes-base.gmailTool' }))).toBeUndefined();
			expect(subjectName(violation())).toBeUndefined();
		});
	});

	describe('reason', () => {
		it('names the resolved subject', () => {
			getNodeTypeMock.mockReturnValue({ displayName: 'Gmail' });
			const { reason } = useToolPolicyRefusalText();

			expect(reason(violation({ subject: 'n8n-nodes-base.gmail' }), 'Send email')).toBe(
				'agents.chat.toolPolicyRefusal.reason:Gmail',
			);
		});

		it('names the tool when the subject is not resolvable', () => {
			const { reason } = useToolPolicyRefusalText();

			expect(reason(violation({ subject: 'n8n-nodes-base.gmailTool' }), 'Send email')).toBe(
				'agents.chat.toolPolicyRefusal.reason:Send email',
			);
		});
	});

	describe('loadSubjectTypes', () => {
		it('loads only the type lists the violations name', async () => {
			const { loadSubjectTypes } = useToolPolicyRefusalText();

			await loadSubjectTypes(refusal([violation({ subjectType: 'nodeType' })]));
			expect(loadNodeTypesMock).toHaveBeenCalledTimes(1);
			expect(fetchCredentialTypesMock).not.toHaveBeenCalled();

			await loadSubjectTypes(refusal([violation({ subjectType: 'credentialType' })]));
			expect(fetchCredentialTypesMock).toHaveBeenCalledWith(false);
			expect(loadNodeTypesMock).toHaveBeenCalledTimes(1);
		});
	});
});
