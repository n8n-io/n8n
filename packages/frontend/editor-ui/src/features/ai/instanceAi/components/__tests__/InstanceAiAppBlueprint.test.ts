import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { setActivePinia } from 'pinia';

import { createThreadComponentRenderer } from '../../__tests__/createThreadComponentRenderer';
import { useInstanceAiStore } from '../../instanceAi.store';
import InstanceAiAppBlueprint from '../InstanceAiAppBlueprint.vue';

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('../AppBlueprintCard.vue', () => ({
	default: {
		props: ['blueprint', 'readOnly'],
		emits: ['submit'],
		template:
			'<button data-test-id="app-blueprint-card" :data-read-only="readOnly" @click="$emit(\'submit\', { kind: \'appBlueprint\', approved: true, blueprint })" />',
	},
}));

const renderComponent = createThreadComponentRenderer(InstanceAiAppBlueprint);
const defaultProps = {
	requestId: 'req-app',
	blueprint: {
		name: 'Weekly planner',
		namespace: 'weekly-planner',
		visibility: 'project' as const,
		description: 'Plan the week and track completed tasks.',
		theme: 'both' as const,
	},
};

describe('InstanceAiAppBlueprint', () => {
	it('does not submit an expired blueprint', async () => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		const thread = useInstanceAiStore().getOrCreateRuntime('thread-1');
		const confirmSpy = vi.spyOn(thread, 'confirmAction');

		const { getByTestId } = renderComponent({ props: { ...defaultProps, expired: true } });
		const card = getByTestId('app-blueprint-card');

		expect(card).toHaveAttribute('data-read-only', 'true');
		await userEvent.click(card);
		expect(confirmSpy).not.toHaveBeenCalled();
	});
});
