import { mount } from '@vue/test-utils';
import { computed, defineComponent, ref } from 'vue';

import type { ToolConnectionStatus } from '@/features/shared/toolsConnection/types';
import { CloudBrowserTasksKey, type CloudBrowserTask } from '../useCloudBrowserTasks';
import { LOCAL_BROWSER_COACHMARK_KEY, useLocalBrowserCoachmark } from '../useLocalBrowserCoachmark';

const { settings, isCalloutDismissed, dismissCallout } = vi.hoisted(() => ({
	settings: {
		isBrowserUseAvailable: true,
		browserUseConnectionStatus: 'none' as ToolConnectionStatus,
	},
	isCalloutDismissed: vi.fn(),
	dismissCallout: vi.fn(),
}));

vi.mock('../../instanceAiSettings.store', () => ({
	useInstanceAiSettingsStore: () => settings,
}));

vi.mock('@/app/composables/useCalloutHelpers', () => ({
	useCalloutHelpers: () => ({ isCalloutDismissed, dismissCallout }),
}));

function makeTask(overrides: Partial<CloudBrowserTask> = {}): CloudBrowserTask {
	return {
		agentId: 'agent-1',
		taskId: 'task-1',
		title: 'Find the price',
		state: 'running',
		sessionKey: 'tc-1',
		...overrides,
	};
}

/** Runs the composable in a component, the way the + menu does. `null` provides no task list. */
function setup(initial: CloudBrowserTask[] | null) {
	const tasks = ref(initial ?? []);
	let coachmark!: ReturnType<typeof useLocalBrowserCoachmark>;
	mount(
		defineComponent({
			setup() {
				coachmark = useLocalBrowserCoachmark();
				return () => null;
			},
		}),
		{
			global: {
				provide: initial ? { [CloudBrowserTasksKey]: computed(() => tasks.value) } : {},
			},
		},
	);
	return { tasks, coachmark };
}

describe('useLocalBrowserCoachmark', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		settings.isBrowserUseAvailable = true;
		settings.browserUseConnectionStatus = 'none';
		isCalloutDismissed.mockReturnValue(false);
	});

	it('shows while a task runs in an open browser', () => {
		const { coachmark } = setup([makeTask()]);

		expect(coachmark.shouldShowCoachmark.value).toBe(true);
	});

	it('waits until the first site passes its access check', () => {
		const { tasks, coachmark } = setup([makeTask({ sessionKey: '' })]);

		expect(coachmark.shouldShowCoachmark.value).toBe(false);

		tasks.value = [makeTask({ sessionKey: 'tc-1' })];

		expect(coachmark.shouldShowCoachmark.value).toBe(true);
	});

	it.each(['done', 'failed'] as const)('does not show for a task that is %s', (state) => {
		const { coachmark } = setup([makeTask({ state })]);

		expect(coachmark.shouldShowCoachmark.value).toBe(false);
	});

	it('does not show outside a thread, where no task list is provided', () => {
		const { coachmark } = setup(null);

		expect(coachmark.shouldShowCoachmark.value).toBe(false);
	});

	it('does not show when the user cannot connect a local browser', () => {
		settings.isBrowserUseAvailable = false;
		const { coachmark } = setup([makeTask()]);

		expect(coachmark.shouldShowCoachmark.value).toBe(false);
	});

	it.each(['connected', 'connecting', 'disconnected'] as const)(
		'does not show when the local browser is %s',
		(status) => {
			settings.browserUseConnectionStatus = status;
			const { coachmark } = setup([makeTask()]);

			expect(coachmark.shouldShowCoachmark.value).toBe(false);
		},
	);

	it('does not show after the user dismissed it', () => {
		isCalloutDismissed.mockImplementation((key: string) => key === LOCAL_BROWSER_COACHMARK_KEY);
		const { coachmark } = setup([makeTask()]);

		expect(coachmark.shouldShowCoachmark.value).toBe(false);
	});

	it('saves the dismissal', async () => {
		const { coachmark } = setup([makeTask()]);

		await coachmark.onDismissCoachmark();

		expect(dismissCallout).toHaveBeenCalledWith(LOCAL_BROWSER_COACHMARK_KEY);
	});
});
