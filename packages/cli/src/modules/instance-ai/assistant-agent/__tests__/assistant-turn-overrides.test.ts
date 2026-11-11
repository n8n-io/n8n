import { Container } from '@n8n/di';

import { AssistantTurnOverrides } from '../assistant-turn-overrides';

describe('AssistantTurnOverrides', () => {
	afterEach(() => {
		Container.reset();
	});

	it('overrides nothing by default', () => {
		const overrides = Container.get(AssistantTurnOverrides);

		expect(overrides.getCredentialIdAllowlist('thread-1')).toBeUndefined();
		expect(overrides.shouldBypassCredentialTest('thread-1', 'cred-1')).toBe(false);
		expect(overrides.getCredentialTestTarget('thread-1', 'slackApi')).toBeUndefined();
		expect(overrides.getObserverThresholdTokens('thread-1')).toBeUndefined();
		expect(overrides.getBuildMode('thread-1')).toBeUndefined();
		expect(overrides.getPromptVersion('thread-1')).toBeUndefined();
	});

	it('lets a subclass replace the default in the container', () => {
		class FixedOverrides extends AssistantTurnOverrides {
			override getObserverThresholdTokens(): number {
				return 5_000;
			}
		}
		Container.set(AssistantTurnOverrides, new FixedOverrides());

		expect(Container.get(AssistantTurnOverrides).getObserverThresholdTokens('thread-1')).toBe(
			5_000,
		);
	});
});
