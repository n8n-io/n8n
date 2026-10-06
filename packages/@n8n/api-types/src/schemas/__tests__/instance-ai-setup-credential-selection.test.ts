import {
	instanceAiSetupCredentialAppliedKey,
	instanceAiSetupCredentialSelectionKey,
	readPendingInstanceAiSetupCredentialSelections,
	type InstanceAiSetupCredentialSelection,
} from '../instance-ai-setup-credential-selection';

const selection: InstanceAiSetupCredentialSelection = {
	selectionId: 'choice-1',
	credentialType: 'slackApi',
	credentialId: 'credential-1',
};
const itemId = 'workflow-1:credential:slackApi';

describe('readPendingInstanceAiSetupCredentialSelections', () => {
	it('reads only valid selections for the requested workflow', () => {
		expect(
			readPendingInstanceAiSetupCredentialSelections(
				{
					[instanceAiSetupCredentialSelectionKey(itemId)]: selection,
					[instanceAiSetupCredentialSelectionKey('workflow-2:credential:slackApi')]: selection,
					[instanceAiSetupCredentialSelectionKey('workflow-1:credential:gmailOAuth2')]: selection,
					[instanceAiSetupCredentialSelectionKey(`${itemId}:invalid`)]: { credentialId: 'id' },
				},
				'workflow-1',
			),
		).toEqual([{ itemId, selection }]);
	});

	it('keeps a newer choice pending when an earlier save finishes', () => {
		const metadata = {
			[instanceAiSetupCredentialSelectionKey(itemId)]: selection,
			[instanceAiSetupCredentialAppliedKey(itemId, 'older-choice')]: true,
		};
		expect(readPendingInstanceAiSetupCredentialSelections(metadata, 'workflow-1')).toEqual([
			{ itemId, selection },
		]);
		metadata[instanceAiSetupCredentialAppliedKey(itemId, selection.selectionId)] = true;
		metadata[instanceAiSetupCredentialAppliedKey(itemId, 'older-choice')] = true;
		expect(readPendingInstanceAiSetupCredentialSelections(metadata, 'workflow-1')).toEqual([]);
	});
});
