import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import AgentVisualization from '../components/AgentVisualization.vue';
import { buildAgentVisualization } from '../components/agentVisualization';
import type { AgentVisualizationNode } from '../components/AgentVisualization.types';
import type { AgentJsonConfig } from '@n8n/api-types';

const reducedMotion = ref('no-preference');
let frame: (event: { delta: number }) => void;
vi.mock('@vueuse/core', async (importOriginal) => ({
	...(await importOriginal<typeof import('@vueuse/core')>()),
	usePreferredReducedMotion: () => reducedMotion,
	useDocumentVisibility: () => ref('visible'),
	useElementSize: () => ({ width: ref(1000), height: ref(700) }),
	useRafFn: (callback: typeof frame) => {
		frame = callback;
	},
}));
const root: AgentVisualizationNode = {
	id: 'agent',
	label: 'Research assistant',
	icon: 'bot',
	children: [
		{
			id: 'knowledge',
			label: 'Knowledge',
			icon: 'database',
			children: [
				{
					id: 'guide',
					editSection: 'knowledge',
					label: 'Guide.pdf',
					icon: 'file-text',
					configuration: { mimeType: 'application/pdf' },
				},
			],
		},
		{
			id: 'instructions',
			editSection: 'instructions',
			label: 'Instructions',
			icon: 'file-text',
			content: 'Explain each answer.',
		},
	],
};
async function advanceMotion(count = 12) {
	for (let index = 0; index < count; index++) frame({ delta: 32 });
	await nextTick();
}
function render() {
	return mount(AgentVisualization, {
		props: { root },
		global: { stubs: { AgentPersonalisationIcon: true } },
	});
}
describe('AgentVisualization', () => {
	it('supports zoom controls, reset, and fit to view', async () => {
		const wrapper = render();
		const scene = wrapper.get('[data-testid="agent-visualization-scene"]');
		await wrapper.get('[data-testid="agent-visualization-zoom-reset"]').trigger('click');
		expect(Number(scene.attributes('data-scale'))).toBe(1);
		await wrapper.get('[data-testid="agent-visualization-zoom-in"]').trigger('click');
		expect(Number(scene.attributes('data-scale'))).toBeCloseTo(1.2);
		await wrapper.get('[data-testid="agent-visualization-zoom-out"]').trigger('click');
		expect(Number(scene.attributes('data-scale'))).toBeCloseTo(1);
		await wrapper.get('[data-testid="agent-visualization-fit"]').trigger('click');
		expect(Number(scene.attributes('data-scale'))).toBeLessThan(1);
		wrapper.unmount();
	});
	it('zooms around the pointer and prevents browser scrolling for a pinch gesture', async () => {
		const wrapper = render();
		const scene = wrapper.get('[data-testid="agent-visualization-scene"]');
		const before = {
			scale: Number(scene.attributes('data-scale')),
			x: Number(scene.attributes('data-x')),
			y: Number(scene.attributes('data-y')),
		};
		const event = new WheelEvent('wheel', {
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
			deltaY: -80,
			clientX: 300,
			clientY: 220,
		});
		wrapper.get('[data-testid="agent-visualization-viewport"]').element.dispatchEvent(event);
		await nextTick();
		const scale = Number(scene.attributes('data-scale'));
		expect(scale).toBeGreaterThan(before.scale);
		expect((300 - Number(scene.attributes('data-x'))) / scale).toBeCloseTo(
			(300 - before.x) / before.scale,
		);
		expect((220 - Number(scene.attributes('data-y'))) / scale).toBeCloseTo(
			(220 - before.y) / before.scale,
		);
		expect(event.defaultPrevented).toBe(true);
		wrapper.unmount();
	});
	it('keeps the link to an open group smooth without doubling back', async () => {
		const wrapper = render();
		await wrapper.get('[data-testid="agent-visualization-node-knowledge"]').trigger('click');
		await advanceMotion();
		const d = wrapper.get('[data-testid="agent-visualization-link-knowledge"]').attributes('d');
		const [x0, y0, x1, y1, x2, y2, x3, y3] = (d?.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(
			Number,
		);
		const at = (t: number) => {
			const u = 1 - t;
			return {
				x: u ** 3 * x0 + 3 * u ** 2 * t * x1 + 3 * u * t ** 2 * x2 + t ** 3 * x3,
				y: u ** 3 * y0 + 3 * u ** 2 * t * y1 + 3 * u * t ** 2 * y2 + t ** 3 * y3,
			};
		};
		// The line must head steadily toward the group on both axes, with no overshoot or hook back.
		const end = at(1);
		for (let step = 1; step <= 50; step++) {
			const a = at((step - 1) / 50);
			const b = at(step / 50);
			expect((b.x - a.x) * Math.sign(end.x - x0)).toBeGreaterThanOrEqual(-0.01);
			expect((b.y - a.y) * Math.sign(end.y - y0)).toBeGreaterThanOrEqual(-0.01);
		}
		wrapper.unmount();
	});
	it('preserves a manually panned view when a branch expands and collapses', async () => {
		const wrapper = render();
		const scene = wrapper.get('[data-testid="agent-visualization-scene"]');
		const viewport = wrapper.get('[data-testid="agent-visualization-viewport"]');
		const initialX = Number(scene.attributes('data-x'));
		const initialY = Number(scene.attributes('data-y'));
		await viewport.trigger('wheel', { deltaX: 42, deltaY: 68 });
		expect(Number(scene.attributes('data-x'))).toBe(initialX - 42);
		expect(Number(scene.attributes('data-y'))).toBe(initialY - 68);
		const style = scene.attributes('style');
		await wrapper.get('[data-testid="agent-visualization-node-knowledge"]').trigger('click');
		await advanceMotion(40);
		expect(scene.attributes('style')).toBe(style);
		await wrapper.get('[data-testid="agent-visualization-node-knowledge"]').trigger('click');
		await advanceMotion();
		expect(scene.attributes('style')).toBe(style);
		wrapper.unmount();
	});
	it('pans by dragging the background and supports keyboard navigation', async () => {
		const wrapper = render();
		const viewport = wrapper.get('[data-testid="agent-visualization-viewport"]');
		Object.defineProperty(viewport.element, 'setPointerCapture', { value: vi.fn() });
		const scene = wrapper.get('[data-testid="agent-visualization-scene"]');
		const initialX = Number(scene.attributes('data-x'));
		const initialY = Number(scene.attributes('data-y'));
		function pointer(type: string, x: number, y: number) {
			const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
			Object.defineProperty(event, 'pointerId', { value: 7 });
			viewport.element.dispatchEvent(event);
		}
		pointer('pointerdown', 80, 90);
		pointer('pointermove', 220, 150);
		pointer('pointerup', 220, 150);
		await nextTick();
		expect(Number(scene.attributes('data-x'))).toBe(initialX + 140);
		expect(Number(scene.attributes('data-y'))).toBe(initialY + 60);
		await viewport.trigger('keydown', { key: '0' });
		expect(Number(scene.attributes('data-scale'))).toBe(1);
		const x = Number(scene.attributes('data-x'));
		await viewport.trigger('keydown', { key: 'ArrowRight' });
		expect(Number(scene.attributes('data-x'))).toBe(x - 48);
		wrapper.unmount();
	});
	it('keeps the same world point centered when the available canvas size changes', async () => {
		const wrapper = render();
		await wrapper.get('[data-testid="agent-visualization-zoom-reset"]').trigger('click');
		const scene = wrapper.get('[data-testid="agent-visualization-scene"]');
		const initialX = Number(scene.attributes('data-x'));
		const initialY = Number(scene.attributes('data-y'));
		const vm = wrapper.vm as unknown as { width: number; height: number };
		vm.width = 1200;
		vm.height = 900;
		await nextTick();
		expect(Number(scene.attributes('data-x'))).toBe(initialX + 100);
		expect(Number(scene.attributes('data-y'))).toBe(initialY + 100);
		expect(Number(scene.attributes('data-scale'))).toBe(1);
		wrapper.unmount();
	});
	it('clamps zoom and keeps automatic framing at a readable scale for large groups', async () => {
		const wrapper = render();
		await wrapper.setProps({
			root: {
				...root,
				children: Array.from({ length: 40 }, (_, index) => ({
					id: `node-${index}`,
					label: `Item ${index}`,
					icon: 'wrench' as const,
				})),
			},
		});
		const scene = wrapper.get('[data-testid="agent-visualization-scene"]');
		expect(Number(scene.attributes('data-scale'))).toBeGreaterThanOrEqual(0.55);
		for (let index = 0; index < 20; index++)
			await wrapper.get('[data-testid="agent-visualization-zoom-in"]').trigger('click');
		expect(Number(scene.attributes('data-scale'))).toBe(2);
		expect(
			wrapper.get('[data-testid="agent-visualization-zoom-in"]').attributes('disabled'),
		).toBeDefined();
		for (let index = 0; index < 35; index++)
			await wrapper.get('[data-testid="agent-visualization-zoom-out"]').trigger('click');
		expect(Number(scene.attributes('data-scale'))).toBe(0.15);
		wrapper.unmount();
	});
	it('uses the agent gradient colours and stops for the curved links', async () => {
		const wrapper = render();
		await wrapper.setProps({
			personalisation: {
				icon: 'bot',
				gradient: { from: '#00ABED', to: '#EE5F00', angle: 90, fromStop: 10, toStop: 90 },
			},
		});
		const stops = wrapper.findAll('linearGradient stop');
		expect(stops.map((stop) => stop.attributes('stop-color'))).toEqual(['#00ABED', '#EE5F00']);
		expect(stops.map((stop) => stop.attributes('offset'))).toEqual(['10%', '90%']);
		expect(wrapper.get('linearGradient').attributes('gradientUnits')).toBe('userSpaceOnUse');
		expect(
			wrapper.get('[data-testid="agent-visualization-link-knowledge"]').attributes('d'),
		).toContain(' C ');
		wrapper.unmount();
	});
	it('gently changes link curvature with node motion', async () => {
		const wrapper = render();
		const link = wrapper.get('[data-testid="agent-visualization-link-knowledge"]');
		const initial = link.attributes('d');
		frame({ delta: 32 });
		await wrapper.vm.$nextTick();
		expect(link.attributes('d')).not.toBe(initial);
		wrapper.unmount();
	});
	it('opens Test chat and marks the active sections and central running state', async () => {
		const wrapper = render();
		await wrapper.setProps({ isRunnable: true, isRunning: true, activeNodeIds: ['knowledge'] });
		await wrapper.get('[data-testid="agent-visualization-test"]').trigger('click');
		expect(wrapper.emitted('open-preview')).toHaveLength(1);
		expect(wrapper.get('[data-node-id="knowledge"]').attributes('aria-busy')).toBe('true');
		expect(wrapper.get('[role="status"]').attributes('aria-label')).toBe('Agent is running');
		await wrapper.setProps({ isPreviewOpen: true, isRunning: false, activeNodeIds: [] });
		await wrapper.get('[data-testid="agent-visualization-test"]').trigger('click');
		expect(wrapper.emitted('close-preview')).toHaveLength(1);
		expect(wrapper.find('[role="status"]').exists()).toBe(false);
		wrapper.unmount();
	});
	it('hides the separate Test button when the host uses the shared chat switch', async () => {
		const wrapper = render();
		await wrapper.setProps({ hideTestButton: true });
		expect(wrapper.find('[data-testid="agent-visualization-test"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-visualization-pause"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-visualization-model"]').exists()).toBe(true);
		wrapper.unmount();
	});
	it('shows an icon-only center and workflow arrow markers without canvas banners', () => {
		const wrapper = render();
		expect(wrapper.get('[data-testid="agent-visualization-hub"]').text()).toBe('');
		expect(wrapper.findAll('h2')).toHaveLength(0);
		expect(wrapper.find('[data-testid="agent-visualization-close"]').exists()).toBe(false);
		expect(
			wrapper.get('[data-testid="agent-visualization-link-knowledge"]').attributes('marker-end'),
		).toContain('agent-visualization-arrow');
		expect(wrapper.get('marker').attributes('viewBox')).toBe('-10 -10 20 20');
		wrapper.unmount();
	});
	it('keeps drift near each resting position without rotating the layout', async () => {
		const wrapper = render();
		const card = wrapper.get('[data-node-id="knowledge"]');
		const initial =
			card
				.attributes('style')
				.match(/-?\d+(?:\.\d+)?px/g)
				?.map(Number.parseFloat) ?? [];
		for (let index = 0; index < 1000; index++) frame({ delta: 32 });
		await wrapper.vm.$nextTick();
		const moved =
			card
				.attributes('style')
				.match(/-?\d+(?:\.\d+)?px/g)
				?.map(Number.parseFloat) ?? [];
		expect(Math.hypot(moved[0] - initial[0], moved[1] - initial[1])).toBeLessThan(25);
		wrapper.unmount();
	});

	it('expands children onto the graph and toggles the parent closed', async () => {
		const wrapper = render();
		const parent = wrapper.get('[data-testid="agent-visualization-node-knowledge"]');
		await parent.trigger('click');
		expect(parent.attributes('aria-expanded')).toBe('true');
		expect(wrapper.get('[data-node-id="knowledge"]').classes()).toContain('expanded');
		expect(wrapper.get('[data-node-id="guide"]').attributes('data-parent')).toBe('agent/knowledge');
		expect(wrapper.find('[data-testid="agent-visualization-drawer"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-visualization-node-instructions"]').exists()).toBe(
			true,
		);
		for (let index = 0; index < 40; index++) frame({ delta: 32 });
		await wrapper.vm.$nextTick();
		expect(Number(wrapper.get('[data-node-id="guide"]').attributes('data-x'))).toBeGreaterThan(
			Number(wrapper.get('[data-node-id="knowledge"]').attributes('data-x')),
		);
		await wrapper.get('[data-testid="agent-visualization-node-guide"]').trigger('click');
		expect(wrapper.emitted('edit')).toEqual([['knowledge']]);
		await parent.trigger('click');
		expect(parent.attributes('aria-expanded')).toBe('false');
		expect(wrapper.get('[data-node-id="guide"]').attributes('data-closing')).toBe('true');
		await advanceMotion();
		expect(wrapper.find('[data-node-id="guide"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-visualization-details"]').exists()).toBe(false);
		wrapper.unmount();
	});

	it('opens Instructions in its modal on click without hover or inline content', async () => {
		const wrapper = render();
		const instructions = wrapper.get('[data-testid="agent-visualization-node-instructions"]');
		await instructions.trigger('pointerenter');
		await instructions.trigger('focus');
		expect(wrapper.findComponent({ name: 'N8nHoverCard' }).exists()).toBe(false);
		expect(wrapper.text()).not.toContain('Explain each answer.');
		expect(wrapper.emitted('edit')).toBeUndefined();
		await instructions.trigger('click');
		expect(wrapper.emitted('edit')).toEqual([['instructions']]);
		expect(instructions.attributes('aria-haspopup')).toBe('dialog');
		expect(instructions.attributes('aria-expanded')).toBeUndefined();
		expect(wrapper.find('[data-testid="agent-visualization-details"]').exists()).toBe(false);
		await wrapper.trigger('keydown', { key: 'Escape' });
		expect(wrapper.emitted('close')).toHaveLength(1);
		wrapper.unmount();
	});
	it('holds only the focused node still', async () => {
		const wrapper = render();
		const node = wrapper.get('[data-node-id="knowledge"]');
		const other = wrapper.get('[data-node-id="instructions"]');
		await node.trigger('focusin');
		const initial = node.attributes('style');
		const otherInitial = other.attributes('style');
		frame({ delta: 32 });
		await wrapper.vm.$nextTick();
		expect(node.attributes('style')).toBe(initial);
		expect(other.attributes('style')).not.toBe(otherInitial);
		wrapper.unmount();
	});
	it('keeps the other nodes moving after a leaf opens its modal', async () => {
		const wrapper = render();
		const other = wrapper.get('[data-node-id="knowledge"]');
		await wrapper.get('[data-testid="agent-visualization-node-instructions"]').trigger('click');
		const initial = other.attributes('style');
		frame({ delta: 32 });
		await wrapper.vm.$nextTick();
		expect(wrapper.emitted('edit')).toEqual([['instructions']]);
		expect(other.attributes('style')).not.toBe(initial);
		wrapper.unmount();
	});
	it('returns a dragged node without opening it while other nodes keep moving', async () => {
		const wrapper = render();
		const node = wrapper.get('[data-testid="agent-visualization-node-knowledge"]');
		Object.defineProperty(node.element, 'setPointerCapture', { value: vi.fn() });
		const card = wrapper.get('[data-node-id="knowledge"]');
		const other = wrapper.get('[data-node-id="instructions"]');
		await card.trigger('focusin');
		const initial = card.attributes('style');
		const otherInitial = other.attributes('style');
		function pointer(type: string, clientX: number, clientY: number) {
			const event = new MouseEvent(type, { bubbles: true, button: 0, clientX, clientY });
			Object.defineProperty(event, 'pointerId', { value: 1 });
			node.element.dispatchEvent(event);
		}
		pointer('pointerdown', 100, 100);
		pointer('pointermove', 220, 180);
		await wrapper.vm.$nextTick();
		expect(card.attributes('style')).not.toBe(initial);
		frame({ delta: 32 });
		await wrapper.vm.$nextTick();
		expect(other.attributes('style')).not.toBe(otherInitial);
		pointer('pointerup', 220, 180);
		await node.trigger('click');
		expect(wrapper.find('[data-testid="agent-visualization-node-instructions"]').exists()).toBe(
			true,
		);
		for (let index = 0; index < 60; index++) frame({ delta: 32 });
		await wrapper.vm.$nextTick();
		expect(card.attributes('style')).toBe(initial);
		wrapper.unmount();
	});
	it('keeps every item reachable in a large group', async () => {
		const wrapper = mount(AgentVisualization, {
			props: {
				root: {
					...root,
					children: Array.from({ length: 13 }, (_, index) => ({
						id: `file-${index}`,
						label: `File ${index}`,
						icon: 'file-text' as const,
					})),
				},
			},
			global: { stubs: { AgentPersonalisationIcon: true } },
		});
		expect(wrapper.findAll('[data-node-key]')).toHaveLength(13);
		expect(wrapper.find('[data-testid="agent-visualization-node-file-12"]').exists()).toBe(true);
		wrapper.unmount();
	});
	it('keeps all nodes still with reduced motion', async () => {
		reducedMotion.value = 'reduce';
		const wrapper = render();
		const node = wrapper.get('[data-node-id="knowledge"]');
		const initial = node.attributes('style');
		frame({ delta: 32 });
		await wrapper.vm.$nextTick();
		expect(node.attributes('style')).toBe(initial);
		wrapper.unmount();
		reducedMotion.value = 'no-preference';
	});
	it('shows a missing credential on its group and item without marking unrelated nodes', async () => {
		const graph = buildAgentVisualization(
			{
				name: 'Mail',
				instructions: 'Search mail',
				model: '',
				tools: [
					{
						type: 'node',
						name: 'Search',
						node: { nodeType: 'gmail', nodeTypeVersion: 1, nodeParameters: {} },
					},
				],
			},
			null,
			[],
			[],
			(key) => key,
		);
		const wrapper = mount(AgentVisualization, {
			props: {
				root: graph,
				validationIssues: [
					{
						code: 'missing_credential',
						path: 'tools.0.node.credentials',
						capability: { kind: 'tool', index: 0 },
					},
				],
			},
			global: { stubs: { AgentPersonalisationIcon: true } },
		});
		expect(wrapper.get('[data-node-id="tools"]').classes()).toContain('nodeInvalid');
		expect(wrapper.get('[data-node-id="instructions"]').classes()).not.toContain('nodeInvalid');
		await wrapper.get('[data-testid="agent-visualization-node-tools"]').trigger('click');
		expect(wrapper.get('[data-node-id="tool-0"]').classes()).toContain('nodeInvalid');
		await wrapper.get('[data-testid="agent-visualization-node-tool-0"]').trigger('click');
		expect(wrapper.emitted('edit')).toEqual([['tool-0']]);
		expect(
			wrapper.get('[data-testid="agent-visualization-node-tool-0"]').attributes('aria-description'),
		).toContain('Credential is missing');
		wrapper.unmount();
	});
	it('opens existing editors directly and keeps add actions out of read-only mode', async () => {
		const wrapper = render();
		await wrapper.setProps({
			canEdit: true,
			root: {
				...root,
				addActions: [{ id: 'tools', label: 'Tools' }],
				children: [{ ...root.children![1], editSection: 'instructions' }],
			},
		});
		await wrapper.get('[data-testid="agent-visualization-node-instructions"]').trigger('click');
		expect(wrapper.emitted('edit')).toEqual([['instructions']]);
		expect(wrapper.find('[data-testid="agent-visualization-add"]').exists()).toBe(true);
		await wrapper.setProps({ canEdit: false });
		expect(wrapper.find('[data-testid="agent-visualization-add"]').exists()).toBe(false);
		await wrapper.get('[data-testid="agent-visualization-node-instructions"]').trigger('click');
		expect(wrapper.emitted('edit')).toEqual([['instructions'], ['instructions']]);
		wrapper.unmount();
	});
	it('fits the graph as independent nested branches open and close', async () => {
		const wrapper = render();
		await wrapper.setProps({
			root: {
				...root,
				children: [
					{
						id: 'knowledge',
						label: 'Knowledge',
						icon: 'database',
						children: [
							{
								id: 'skills',
								label: 'Skills',
								icon: 'book-open',
								children: Array.from({ length: 6 }, (_, index) => ({
									id: `skill-${index}`,
									label: `Skill ${index}`,
									icon: 'book-open' as const,
								})),
							},
						],
					},
					{
						id: 'tools',
						label: 'Tools',
						icon: 'wrench',
						children: [{ id: 'search', label: 'Search', icon: 'search' }],
					},
				],
			},
		});
		const initialScale = Number(
			wrapper.get('[data-testid="agent-visualization-scene"]').attributes('data-scale'),
		);
		await wrapper.get('[data-testid="agent-visualization-node-knowledge"]').trigger('click');
		const appearing = wrapper.get('[data-node-id="skills"]');
		expect(appearing.attributes('data-x')).toBe(
			wrapper.get('[data-node-id="knowledge"]').attributes('data-x'),
		);
		await wrapper.get('[data-testid="agent-visualization-node-skills"]').trigger('click');
		await wrapper.get('[data-testid="agent-visualization-node-tools"]').trigger('click');
		expect(wrapper.find('[data-node-id="skill-5"]').exists()).toBe(true);
		expect(wrapper.find('[data-node-id="search"]').exists()).toBe(true);
		expect(
			Number(wrapper.get('[data-testid="agent-visualization-scene"]').attributes('data-scale')),
		).toBeLessThan(initialScale);
		await advanceMotion(40);
		await wrapper.get('[data-testid="agent-visualization-node-knowledge"]').trigger('click');
		expect(wrapper.get('[data-node-id="skill-5"]').attributes('data-closing')).toBe('true');
		await advanceMotion();
		expect(wrapper.find('[data-node-id="skill-5"]').exists()).toBe(false);
		expect(wrapper.find('[data-node-id="search"]').exists()).toBe(true);
		wrapper.unmount();
	});
	it('draws a closing branch back into its parent before removing nodes and links', async () => {
		const wrapper = render();
		const parentButton = wrapper.get('[data-testid="agent-visualization-node-knowledge"]');
		await parentButton.trigger('click');
		await advanceMotion(40);
		expect(wrapper.find('[data-testid="agent-visualization-back"]').exists()).toBe(false);
		const node = wrapper.get('[data-node-id="guide"]');
		const parent = wrapper.get('[data-node-id="knowledge"]');
		const distance = () =>
			Math.hypot(
				Number(node.attributes('data-x')) - Number(parent.attributes('data-x')),
				Number(node.attributes('data-y')) - Number(parent.attributes('data-y')),
			);
		const initialDistance = distance();
		const initialLink = wrapper
			.get('[data-testid="agent-visualization-link-guide"]')
			.attributes('d');
		const initialScale = wrapper
			.get('[data-testid="agent-visualization-scene"]')
			.attributes('data-scale');
		await parentButton.trigger('click');
		expect(node.attributes('data-closing')).toBe('true');
		expect(node.attributes('inert')).toBeDefined();
		expect(wrapper.get('[data-testid="agent-visualization-scene"]').attributes('data-scale')).toBe(
			initialScale,
		);
		await advanceMotion(5);
		expect(distance()).toBeLessThan(initialDistance / 2);
		expect(wrapper.get('[data-testid="agent-visualization-link-guide"]').attributes('d')).not.toBe(
			initialLink,
		);
		await advanceMotion();
		expect(wrapper.find('[data-node-id="guide"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-visualization-link-guide"]').exists()).toBe(false);
		wrapper.unmount();
	});
	it('can reopen a branch during its return animation', async () => {
		const wrapper = render();
		const parent = wrapper.get('[data-testid="agent-visualization-node-knowledge"]');
		await parent.trigger('click');
		await advanceMotion(40);
		await parent.trigger('click');
		await advanceMotion(3);
		await parent.trigger('click');
		expect(wrapper.get('[data-node-id="guide"]').attributes('data-closing')).toBe('false');
		await advanceMotion(40);
		expect(wrapper.find('[data-node-id="guide"]').exists()).toBe(true);
		wrapper.unmount();
	});
	it('lays entry children to the left and sends a ripple along each entry link', async () => {
		const wrapper = render();
		await wrapper.setProps({
			root: {
				...root,
				children: [
					{
						id: 'invocation',
						label: 'Start agent',
						icon: 'messages-square',
						children: [
							{
								id: 'channels',
								label: 'Channels',
								icon: 'messages-square',
								children: [{ id: 'slack', label: 'Slack', icon: 'slack' }],
							},
						],
					},
					root.children![0],
				],
			},
		});
		for (let index = 0; index < 60; index++) frame({ delta: 32 });
		await wrapper.vm.$nextTick();
		const entryLink = wrapper.get('[data-testid="agent-visualization-link-invocation"]');
		const before = entryLink.attributes('d');
		frame({ delta: 32 });
		await wrapper.vm.$nextTick();
		const after = entryLink.attributes('d');
		expect(after).not.toBe(before);
		expect(after).toContain(' L ');
		expect(
			wrapper
				.get(`[data-testid="agent-visualization-link-${root.children![0].id}"]`)
				.attributes('d'),
		).toContain(' C ');
		await wrapper.get('[data-testid="agent-visualization-node-invocation"]').trigger('click');
		await wrapper.get('[data-testid="agent-visualization-node-channels"]').trigger('click');
		for (let index = 0; index < 40; index++) frame({ delta: 32 });
		await wrapper.vm.$nextTick();
		expect(Number(wrapper.get('[data-node-id="slack"]').attributes('data-x'))).toBeLessThan(
			Number(wrapper.get('[data-node-id="channels"]').attributes('data-x')),
		);
		expect(wrapper.get('[data-node-id="slack"]').classes()).toContain('entryNode');
		expect(
			wrapper.get('[data-testid="agent-visualization-link-slack"]').attributes('data-parent'),
		).toBe('agent/invocation/channels');
		await wrapper.setProps({ root });
		wrapper.unmount();
	});
	it('places add nodes in the graph with ordinary parent tendrils', async () => {
		const wrapper = render();
		await wrapper.setProps({
			canEdit: true,
			root: {
				...root,
				addActions: [{ id: 'tools', label: 'Tools' }],
				children: [
					{ ...root.children![0], addActions: [{ id: 'knowledge', label: 'Add files' }] },
					root.children![1],
				],
			},
		});
		for (let index = 0; index < 40; index++) frame({ delta: 32 });
		await wrapper.vm.$nextTick();
		const rootAdd = wrapper.get('[data-node-key="agent/__add__"]');
		expect(Number(rootAdd.attributes('data-x'))).toBeGreaterThan(0);
		expect(rootAdd.attributes('data-parent')).toBe('agent');
		expect(wrapper.find('[data-testid="agent-visualization-link-__add__"]').exists()).toBe(true);
		await wrapper.get('[data-testid="agent-visualization-node-knowledge"]').trigger('click');
		expect(wrapper.get('[data-node-key="agent/knowledge/__add__"]').attributes('data-parent')).toBe(
			'agent/knowledge',
		);
		await wrapper.setProps({ canEdit: false });
		expect(wrapper.find('[data-testid="agent-visualization-add"]').exists()).toBe(false);
		wrapper.unmount();
	});
});
describe('buildAgentVisualization', () => {
	it('uses the pill icon sources for node tools, registry MCP servers, and channels', () => {
		const nodeIcon = vi.fn(() => ({ type: 'file' as const, src: '/icons/gmail.svg' }));
		const config: AgentJsonConfig = {
			name: 'Mail assistant',
			model: '',
			instructions: '',
			tools: [
				{
					type: 'node',
					name: 'Find messages',
					node: { nodeType: 'n8n-nodes-base.gmail', nodeTypeVersion: 2, nodeParameters: {} },
				},
			],
			mcpServers: [
				{
					name: 'Gmail',
					authentication: 'none',
					url: 'https://example.test/mcp',
					transport: 'streamableHttp',
					metadata: { nodeTypeName: '@n8n/mcp-registry.gmail' },
				},
			],
			integrations: [{ type: 'slack', credentialId: 'slack', settings: {} }],
		};
		const graph = buildAgentVisualization(config, null, [], [], (key) => key, {
			node: nodeIcon,
			channels: [{ type: 'slack', label: 'Slack', icon: 'slack', credentialTypes: [] }],
		});
		expect(graph.children?.find((node) => node.id === 'tools')?.children?.[0].iconSource).toEqual({
			type: 'file',
			src: '/icons/gmail.svg',
		});
		expect(graph.children?.find((node) => node.id === 'mcp')?.children?.[0].iconSource).toEqual({
			type: 'file',
			src: '/icons/gmail.svg',
		});
		expect(
			graph.children
				?.find((node) => node.id === 'invocation')
				?.children?.find((node) => node.id === 'channels')?.children?.[0],
		).toMatchObject({
			label: 'Slack',
			editSection: 'channel:slack',
			iconSource: { type: 'icon', name: 'slack' },
		});
		expect(nodeIcon).toHaveBeenCalledWith('n8n-nodes-base.gmail', 2);
		expect(nodeIcon).toHaveBeenCalledWith('@n8n/mcp-registry.gmail');
	});

	it('includes files and skill references and separates workflows from tools without changing the draft', () => {
		const config: AgentJsonConfig = {
			name: 'Research assistant',
			model: '',
			instructions: 'Research',
			tools: [
				{ type: 'workflow', workflow: 'Look up records' },
				{
					type: 'node',
					name: 'Search',
					node: { nodeType: 'test', nodeTypeVersion: 1, nodeParameters: { query: 'hello' } },
				},
			],
			skills: [{ type: 'skill', id: 'research' }],
		};
		const before = JSON.stringify(config);
		const graph = buildAgentVisualization(
			config,
			null,
			[
				{
					id: 'file',
					agentId: 'agent',
					fileName: 'Guide.pdf',
					mimeType: 'application/pdf',
					fileSizeBytes: 100,
					createdAt: '2026-11-11',
				},
			],
			[
				{
					id: 'research',
					skill: {
						name: 'Research',
						description: 'Find sources',
						instructions: 'Cite sources',
						references: [{ path: 'reference.md', content: 'Reference content' }],
					},
				},
			],
			(key) => key,
		);
		expect(
			graph.children?.find((node) => node.id === 'tools')?.children?.map((node) => node.label),
		).toEqual(['Search']);
		expect(
			graph.children?.find((node) => node.id === 'workflows')?.children?.map((node) => node.label),
		).toEqual(['Look up records']);
		expect(
			graph.children?.find((node) => node.id === 'knowledge')?.children?.map((node) => node.label),
		).toEqual(['Guide.pdf', 'agents.builder.visualization.skills']);
		expect(
			graph.children
				?.find((node) => node.id === 'knowledge')
				?.children?.find((node) => node.id === 'skills')?.children?.[0].children?.[0],
		).toMatchObject({ content: 'Reference content', editSection: 'skill:research' });
		expect(JSON.stringify(config)).toBe(before);
	});
	it('only shows configured categories and keeps missing categories in the add menu', () => {
		const graph = buildAgentVisualization(
			{ name: 'Empty', model: '', instructions: '' },
			null,
			[],
			[],
			(key) => key,
		);
		expect(graph.children?.map((node) => node.id)).toEqual(['invocation']);
		expect(graph.addActions?.map((item) => item.id)).toEqual(
			expect.arrayContaining(['instructions', 'tools', 'knowledge', 'skills', 'memory', 'mcp']),
		);
		expect(graph.addActions?.map((item) => item.id)).not.toContain('settings');
	});
	it('uses available schedule, channel, tool, and sub-agent descriptions', () => {
		const graph = buildAgentVisualization(
			{
				name: 'Assistant',
				model: '',
				instructions: '',
				tools: [{ type: 'workflow', workflow: 'Summarise', description: 'Summarise a report' }],
				tasks: [{ type: 'task', id: 'weekly', enabled: true }],
				integrations: [
					{
						type: 'slack',
						credentialId: 'slack',
						settings: { messagingExperience: 'agent', onlyRespondWhenMentioned: true },
					},
				],
				subAgents: { agents: [{ agentId: 'research' }] },
			},
			null,
			[],
			[],
			(key) => key,
			{
				tasks: [
					{
						id: 'weekly',
						name: 'Weekly report',
						objective: 'Prepare the report',
						cronExpression: '0 9 * * 1',
						timezone: 'Europe/London',
						createdAt: '',
						updatedAt: '',
					},
				],
				agentNames: new Map([['research', 'Research assistant']]),
			},
		);
		const invocation = graph.children?.find((node) => node.id === 'invocation');
		expect(
			invocation?.children?.find((node) => node.id === 'schedules')?.children?.[0],
		).toMatchObject({
			label: 'Weekly report',
			editSection: 'task:weekly',
			description: expect.stringContaining('Monday'),
			content: 'Prepare the report',
		});
		expect(
			invocation?.children?.find((node) => node.id === 'channels')?.children?.[0].description,
		).toBe('agents.builder.visualization.onMention');
		expect(graph.children?.find((node) => node.id === 'workflows')?.children?.[0].description).toBe(
			'Summarise a report',
		);
		expect(graph.children?.find((node) => node.id === 'sub-agents')?.children?.[0]).toMatchObject({
			label: 'Research assistant',
			editSection: 'sub-agent:research',
		});
	});
});
