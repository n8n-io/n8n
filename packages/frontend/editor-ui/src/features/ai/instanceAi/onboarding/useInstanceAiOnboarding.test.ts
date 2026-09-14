import { ref } from 'vue';

import { useInstanceAiOnboarding } from './useInstanceAiOnboarding';

function createConfiguration() {
	return {
		modelConfigured: ref(false),
		sandboxConfigured: ref(false),
		searchDecided: ref(false),
		searchEnvConfigured: ref(false),
	};
}

describe('useInstanceAiOnboarding', () => {
	it('resumes at the first unmet setup step', () => {
		const configuration = createConfiguration();
		const onboarding = useInstanceAiOnboarding(configuration);

		expect(onboarding.firstUnmetStep()).toBe('model');

		configuration.modelConfigured.value = true;
		expect(onboarding.firstUnmetStep()).toBe('sandbox');

		configuration.sandboxConfigured.value = true;
		expect(onboarding.firstUnmetStep()).toBe('search');

		configuration.searchDecided.value = true;
		expect(onboarding.firstUnmetStep()).toBe('done');
	});

	it('omits configured services from the setup sequence', () => {
		const configuration = createConfiguration();
		configuration.sandboxConfigured.value = true;
		configuration.searchEnvConfigured.value = true;
		configuration.searchDecided.value = true;
		const onboarding = useInstanceAiOnboarding(configuration);

		expect(onboarding.sequence.value).toEqual(['model', 'done']);

		onboarding.start();
		configuration.modelConfigured.value = true;
		onboarding.advance();
		expect(onboarding.step.value).toBe('done');
	});

	it('keeps a disabled sandbox in the sequence until it is enabled', () => {
		const configuration = createConfiguration();
		configuration.modelConfigured.value = true;
		configuration.searchEnvConfigured.value = true;
		configuration.searchDecided.value = true;
		const onboarding = useInstanceAiOnboarding(configuration);

		expect(onboarding.sequence.value).toEqual(['model', 'sandbox', 'done']);
		expect(onboarding.firstUnmetStep()).toBe('sandbox');

		configuration.sandboxConfigured.value = true;
		expect(onboarding.sequence.value).toEqual(['model', 'done']);
		expect(onboarding.firstUnmetStep()).toBe('done');
	});

	it('returns to an earlier unmet prerequisite after completing a later checklist step', () => {
		const configuration = createConfiguration();
		configuration.modelConfigured.value = true;
		const onboarding = useInstanceAiOnboarding(configuration);

		onboarding.start('search');
		configuration.searchDecided.value = true;
		onboarding.advance();

		expect(onboarding.step.value).toBe('sandbox');
	});

	it('returns to the summary after applying a single-step edit', () => {
		const configuration = createConfiguration();
		configuration.modelConfigured.value = true;
		configuration.sandboxConfigured.value = true;
		configuration.searchDecided.value = true;
		const onboarding = useInstanceAiOnboarding(configuration);

		onboarding.start('sandbox', true);
		onboarding.advance();

		expect(onboarding.step.value).toBe('done');
		expect(onboarding.editMode.value).toBe(false);
		expect(onboarding.open.value).toBe(true);
	});

	it('closes a direct edit when other setup steps are still incomplete', () => {
		const configuration = createConfiguration();
		configuration.modelConfigured.value = true;
		const onboarding = useInstanceAiOnboarding(configuration);

		onboarding.start('search', true);
		configuration.searchDecided.value = true;
		onboarding.advance();

		expect(onboarding.open.value).toBe(false);
		expect(onboarding.editMode.value).toBe(false);
		expect(onboarding.firstUnmetStep()).toBe('sandbox');
	});

	it('clears edit mode when the wizard closes', () => {
		const onboarding = useInstanceAiOnboarding(createConfiguration());

		onboarding.start('search', true);
		onboarding.close();

		expect(onboarding.open.value).toBe(false);
		expect(onboarding.editMode.value).toBe(false);
	});

	it('moves back through the visible setup sequence', () => {
		const onboarding = useInstanceAiOnboarding(createConfiguration());

		onboarding.start('search');
		onboarding.back();
		expect(onboarding.step.value).toBe('sandbox');

		onboarding.back();
		expect(onboarding.step.value).toBe('model');

		onboarding.back();
		expect(onboarding.step.value).toBe('model');
	});

	it('returns to the summary when backing out of an edit', () => {
		const onboarding = useInstanceAiOnboarding(createConfiguration());

		onboarding.start('model', true);
		onboarding.back();

		expect(onboarding.step.value).toBe('done');
		expect(onboarding.editMode.value).toBe(false);
	});
});
