import { mockInstance } from '@n8n/backend-test-utils';
import type { INode } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { findCredentialRefusal } from '../credential-refusal';
import { CredentialsPermissionChecker } from '../credentials-permission-checker';

describe('findCredentialRefusal', () => {
	const checker = mockInstance(CredentialsPermissionChecker);
	const node = { name: 'Slack' } as INode;

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('returns nothing when the check passes', async () => {
		checker.check.mockResolvedValue(undefined);

		await expect(findCredentialRefusal('wf-1', [node], 'user-1')).resolves.toBeUndefined();
		expect(checker.check).toHaveBeenCalledWith('wf-1', [node], 'user-1');
	});

	it('returns the reason and the node of a refusal', async () => {
		const refusal = Object.assign(
			new UserError('Node "Slack" uses the credential "Bot", which you cannot use', {
				description: 'Ask its owner to share this credential with you.',
			}),
			{ node },
		);
		checker.check.mockRejectedValue(refusal);

		await expect(findCredentialRefusal('wf-1', [node], 'user-1')).resolves.toEqual({
			message: 'Node "Slack" uses the credential "Bot", which you cannot use',
			description: 'Ask its owner to share this credential with you.',
			nodeName: 'Slack',
		});
	});

	it('returns nothing when the check fails for another reason', async () => {
		checker.check.mockRejectedValue(new Error('connection lost'));

		await expect(findCredentialRefusal('wf-1', [node], 'user-1')).resolves.toBeUndefined();
	});
});
