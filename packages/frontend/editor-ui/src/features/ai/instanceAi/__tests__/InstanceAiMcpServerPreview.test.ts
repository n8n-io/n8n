import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import InstanceAiMcpServerPreview from '../components/InstanceAiMcpServerPreview.vue';

const { refresh, mounted } = vi.hoisted(() => ({ refresh: vi.fn(), mounted: vi.fn() }));

vi.mock('@n8n/frontend-module-mcp-servers', () => ({
	loadMcpServerView: async () =>
		defineComponent({
			props: {
				artifactMode: Boolean,
				artifactProjectId: String,
				artifactServerId: String,
			},
			emits: ['deleted', 'renamed'],
			setup(props, { expose, emit }) {
				mounted(props.artifactServerId);
				expose({ refresh });
				return () =>
					h('div', [
						h('span', { 'data-test-id': 'artifact-mode' }, String(props.artifactMode)),
						h('span', { 'data-test-id': 'server-id' }, props.artifactServerId),
						h('span', { 'data-test-id': 'project-id' }, props.artifactProjectId),
						h('button', {
							'data-test-id': 'delete-btn',
							onClick: () => emit('deleted', props.artifactServerId),
						}),
						h('button', {
							'data-test-id': 'rename-btn',
							onClick: () => emit('renamed', 'Renamed server'),
						}),
					]);
			},
		}),
}));

const renderPreview = (
	props: { projectId: string; serverId: string; refreshKey: number } = {
		projectId: 'project-1',
		serverId: 'srv-1',
		refreshKey: 0,
	},
) => render(InstanceAiMcpServerPreview, { props });

describe('InstanceAiMcpServerPreview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the server view in artifact mode and refreshes in place on refreshKey change', async () => {
		const { rerender, getByTestId } = renderPreview();
		await flushPromises();

		expect(getByTestId('artifact-mode')).toHaveTextContent('true');
		expect(getByTestId('server-id')).toHaveTextContent('srv-1');
		expect(getByTestId('project-id')).toHaveTextContent('project-1');

		await rerender({ projectId: 'project-1', serverId: 'srv-1', refreshKey: 1 });
		await flushPromises();

		expect(refresh).toHaveBeenCalledTimes(1);
		expect(mounted).toHaveBeenCalledTimes(1);
	});

	it('mounts a fresh view when switching to another server', async () => {
		const { rerender } = renderPreview();
		await flushPromises();

		await rerender({ projectId: 'project-1', serverId: 'srv-2', refreshKey: 0 });
		await flushPromises();

		expect(mounted).toHaveBeenCalledTimes(2);
		expect(refresh).not.toHaveBeenCalled();
	});

	it('forwards deleted and renamed events from the server view', async () => {
		const { getByTestId, emitted } = renderPreview();
		await flushPromises();

		await userEvent.click(getByTestId('delete-btn'));
		await userEvent.click(getByTestId('rename-btn'));

		expect(emitted('deleted')).toEqual([['srv-1']]);
		expect(emitted('renamed')).toEqual([['Renamed server']]);
	});
});
