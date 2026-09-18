import { ref } from 'vue';

import { useEditorContext } from '@/app/composables/useEditorContext';
import { usePostHog } from '@/app/stores/posthog.store';

import { INSTANCE_AI_MENTIONS_FLAG } from '../constants';
import { useIsInstanceAiMentionsEnabled } from './useIsInstanceAiMentionsEnabled';

vi.mock('@/app/composables/useEditorContext', () => ({ useEditorContext: vi.fn() }));
vi.mock('@/app/stores/posthog.store', () => ({ usePostHog: vi.fn() }));

describe('useIsInstanceAiMentionsEnabled', () => {
	it.each([
		{ flag: true, instanceAi: true, expected: true },
		{ flag: false, instanceAi: true, expected: false },
		{ flag: true, instanceAi: false, expected: false },
	])('returns $expected for flag=$flag and availability=$instanceAi', (input) => {
		vi.mocked(usePostHog).mockReturnValue({
			isFeatureEnabled: vi.fn((flag) => flag === INSTANCE_AI_MENTIONS_FLAG && input.flag),
		} as never);
		vi.mocked(useEditorContext).mockReturnValue({ instanceAi: ref(input.instanceAi) } as never);

		expect(useIsInstanceAiMentionsEnabled().value).toBe(input.expected);
	});
});
