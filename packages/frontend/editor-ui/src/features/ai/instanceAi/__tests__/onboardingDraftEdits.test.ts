import { afterEach, describe, expect, it, vi } from 'vitest';
import { openOnboardingDraftEdits } from '@/features/ai/instanceAi/onboardingDraftEdits';

afterEach(() => {
	sessionStorage.clear();
	vi.useRealTimers();
});

describe('Cloud onboarding draft edits', () => {
	it('scopes edits to the signed-in owner, instance and confirmed handoff', () => {
		const current = openOnboardingDraftEdits('instance', 'owner', 'first');
		current.save('Use Slack');
		expect(openOnboardingDraftEdits('instance', 'owner', 'first').text).toBe('Use Slack');
		for (const [instance, owner, id] of [
			['another', 'owner', 'first'],
			['instance', 'another', 'first'],
			['instance', 'owner', 'another'],
		] as const) {
			const other = openOnboardingDraftEdits(instance, owner, id);
			expect(other.text).toBeUndefined();
			other.clear();
		}
		expect(openOnboardingDraftEdits('instance', 'owner', 'first').text).toBe('Use Slack');
		current.clear();
		expect(openOnboardingDraftEdits('instance', 'owner', 'first').text).toBeUndefined();
	});

	it('expires edits in the claim window, even after a refresh and more typing', () => {
		vi.useFakeTimers();
		const current = openOnboardingDraftEdits('instance', 'owner', 'first');
		current.save('Use Slack');
		vi.advanceTimersByTime(9 * 60_000);
		const refreshed = openOnboardingDraftEdits('instance', 'owner', 'first');
		expect(refreshed.text).toBe('Use Slack');
		refreshed.save('Use Gmail');
		vi.advanceTimersByTime(60_000);
		expect(openOnboardingDraftEdits('instance', 'owner', 'first').text).toBeUndefined();
		expect(JSON.stringify(sessionStorage)).not.toContain('Use Gmail');
	});
});
