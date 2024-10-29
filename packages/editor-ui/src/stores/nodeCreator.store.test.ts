import { createPinia, setActivePinia } from 'pinia';
import { useNodeCreatorStore } from './nodeCreator.store';
import { useTelemetry } from '@/composables/useTelemetry';

const workflow_id = 'workflow-id';
const category_name = 'category-name';
const source = 'source';
const mode = 'mode';
const now = 1717602004819;

vi.mock('@/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => {
			return {
				track,
			};
		},
	};
});

describe('useNodeCreatorStore', () => {
	let nodeCreatorStore: ReturnType<typeof useNodeCreatorStore>;

	beforeEach(() => {
		vi.useFakeTimers({
			now,
		});
		vi.restoreAllMocks();
		setActivePinia(createPinia());
		nodeCreatorStore = useNodeCreatorStore();
	});

	it('tracks event on category expanded', () => {
		nodeCreatorStore.onCreatorOpenedOrClosed({
			source,
			mode,
			workflow_id,
			createNodeActive: true,
		});
		nodeCreatorStore.onCategoryExpanded({ workflow_id, category_name });

		expect(useTelemetry().track).toHaveBeenCalledWith(
			'User viewed node category',
			{
				category_name,
				is_subcategory: false,
				nodes_panel_session_id: getSessionId(now),
				workflow_id,
			},
			{
				withPostHog: false,
			},
		);
	});
});

function getSessionId(time: number) {
	return `nodes_panel_session_${time}`;
}
