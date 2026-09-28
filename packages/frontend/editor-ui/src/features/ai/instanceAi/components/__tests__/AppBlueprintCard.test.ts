import type { AppBlueprint } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { setActivePinia } from 'pinia';

import AppBlueprintCard from '../AppBlueprintCard.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../../instanceAi.store';
import { createThreadComponentRenderer } from '../../__tests__/createThreadComponentRenderer';

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

const renderComponent = createThreadComponentRenderer(AppBlueprintCard);

const blueprint: AppBlueprint = {
	name: 'Joy Greet',
	namespace: 'joy-greet',
	summary: 'A cheerful greeter',
	pages: [{ route: '/', purpose: 'Greeting' }],
	connections: [
		{ kind: 'workflow', id: 'wf-1', name: 'Log greeting', key: 'log' },
		{ kind: 'dataTable', id: 'dt-1', name: 'Greetings', key: 'greetings' },
	],
	theme: { mode: 'system', primary: '#ff6900' },
};

describe('AppBlueprintCard', () => {
	let thread: ThreadRuntime;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		thread = useInstanceAiStore().getOrCreateRuntime('thread-1');
		thread.resolvedConfirmationIds.clear();
	});

	it('follows the name with the namespace until the namespace is edited', async () => {
		const { getByTestId } = renderComponent({ props: { requestId: 'req-1', blueprint } });

		const name = getByTestId('instance-ai-app-blueprint-name');
		await userEvent.clear(name);
		await userEvent.type(name, 'Hello World!');
		expect(getByTestId('instance-ai-app-blueprint-namespace')).toHaveValue('hello-world');

		const namespace = getByTestId('instance-ai-app-blueprint-namespace');
		await userEvent.clear(namespace);
		await userEvent.type(namespace, 'hi');
		await userEvent.type(name, '?');
		expect(getByTestId('instance-ai-app-blueprint-namespace')).toHaveValue('hi');
	});

	it('approves with the edited blueprint and the remaining connections', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');
		const { getByTestId, getAllByTestId } = renderComponent({
			props: { requestId: 'req-1', blueprint },
		});

		await userEvent.click(getAllByTestId('instance-ai-app-blueprint-connection-remove')[0]);
		await userEvent.click(getByTestId('instance-ai-app-blueprint-approve'));

		await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('req-1', 'approved'));
		expect(confirmSpy).toHaveBeenCalledWith('req-1', {
			kind: 'appBlueprint',
			approved: true,
			blueprint: {
				...blueprint,
				connections: [blueprint.connections[1]],
				theme: { mode: 'system', primary: '#ff6900' },
			},
		});
	});

	it('blocks approval while the namespace is invalid', async () => {
		const { getByTestId } = renderComponent({ props: { requestId: 'req-1', blueprint } });

		const namespace = getByTestId('instance-ai-app-blueprint-namespace');
		await userEvent.clear(namespace);
		await userEvent.type(namespace, 'Not Valid');

		expect(getByTestId('instance-ai-app-blueprint-approve')).toBeDisabled();
	});

	it('sends feedback as a change request', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');
		const { getByTestId } = renderComponent({ props: { requestId: 'req-1', blueprint } });

		await userEvent.click(getByTestId('instance-ai-app-blueprint-request-changes'));
		await userEvent.type(getByTestId('instance-ai-app-blueprint-feedback'), 'Add a history page');
		await userEvent.click(getByTestId('instance-ai-app-blueprint-feedback-submit'));

		await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('req-1', 'changes-requested'));
		expect(confirmSpy).toHaveBeenCalledWith('req-1', {
			kind: 'appBlueprint',
			approved: false,
			feedback: 'Add a history page',
		});
	});

	it('renders read-only once resolved', () => {
		thread.resolveConfirmation('req-1', 'approved');
		const { queryByTestId, getByTestId } = renderComponent({
			props: { requestId: 'req-1', blueprint },
		});

		expect(queryByTestId('instance-ai-app-blueprint-approve')).toBeNull();
		expect(getByTestId('instance-ai-app-blueprint-name')).toBeDisabled();
	});
});
