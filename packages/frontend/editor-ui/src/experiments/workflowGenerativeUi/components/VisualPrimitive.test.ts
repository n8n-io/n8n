import { fireEvent } from '@testing-library/vue';
import { StateProvider } from '@json-render/vue';
import { defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import {
	GenerativeUiLookOnlyKey,
	GenerativeUiNodesKey,
	GenerativeUiOpenNodeKey,
} from '../nodeLookup';
import Beat from './Beat.vue';
import Cluster from './Cluster.vue';
import VisualPrimitive from './VisualPrimitive.vue';

function classTokens(el: Element): string {
	return Array.from(el.classList).join(' ');
}

const renderPrimitive = createComponentRenderer(VisualPrimitive, {
	props: {},
});

describe('VisualPrimitive', () => {
	beforeEach(() => {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			configurable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});
	});

	it('applies semantic classes for expression props', () => {
		const { container } = renderPrimitive({
			props: {
				emphasis: 'hero',
				density: 'compact',
				tone: 'attention',
				orientation: 'horizontal',
				disclosure: 'expandable',
				variant: 'recovery',
			},
		});
		const root = container.firstElementChild;
		expect(root).toBeTruthy();
		const classes = classTokens(root!);
		expect(classes).toMatch(/emphasisHero|emphasis-hero/);
		expect(classes).toMatch(/densityCompact|density-compact/);
		expect(classes).toMatch(/toneAttention|tone-attention/);
		expect(classes).toMatch(/orientationHorizontal|orientation-horizontal/);
		expect(classes).toMatch(/disclosureExpandable|disclosure-expandable/);
		expect(classes).toMatch(/variantRecovery|variant-recovery/);
	});

	it('maps approved tokens via visualStyle CSS variables', () => {
		const { container } = renderPrimitive({
			props: {
				accent: '--color--primary',
				surface: '--color--background--light-2',
				radius: '--radius--md',
				pad: '--spacing--lg',
			},
		});
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue('--generative-accent')).toBe('var(--color--primary)');
		expect(root.style.getPropertyValue('--generative-surface')).toBe(
			'var(--color--background--light-2)',
		);
		expect(root.style.getPropertyValue('--generative-radius')).toBe('var(--radius--md)');
		expect(root.style.getPropertyValue('--generative-pad')).toBe('var(--spacing--lg)');
	});

	it('applies motion classes for pulse, flow, transfer, and progress', () => {
		for (const motion of ['pulse', 'flow', 'transfer', 'progress'] as const) {
			const { container, unmount } = renderPrimitive({ props: { motion } });
			const classes = classTokens(container.firstElementChild!);
			expect(classes).toContain(motion);
			unmount();
		}
	});

	it('does not apply motion classes when prefers-reduced-motion is set', () => {
		vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
			matches: query.includes('prefers-reduced-motion'),
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));

		const { container } = renderPrimitive({ props: { motion: 'pulse' } });
		const classes = classTokens(container.firstElementChild!);
		expect(classes.split(/\s+/)).not.toContain('pulse');
		expect(classes).not.toMatch(/(?:^|\s)pulse(?:\s|$)/);
	});
});

describe('Beat and Cluster disclosure', () => {
	beforeEach(() => {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			configurable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});
	});

	it('toggles expandable Beat details through json-render state', async () => {
		const Harness = defineComponent({
			setup() {
				return () =>
					h(
						StateProvider,
						{ initialState: {} },
						{
							default: () =>
								h(
									Beat,
									{
										title: 'Restart service',
										caption: 'Optional detail',
										disclosure: 'expandable',
									},
									{ default: () => h('p', { 'data-test-id': 'beat-body' }, 'body') },
								),
						},
					);
			},
		});

		const renderHarness = createComponentRenderer(Harness);
		const { getByRole, queryByTestId } = renderHarness();

		expect(queryByTestId('beat-body')).not.toBeInTheDocument();

		await fireEvent.click(getByRole('button', { name: /restart service/i }));
		expect(queryByTestId('beat-body')).toBeInTheDocument();

		await fireEvent.click(getByRole('button', { name: /restart service/i }));
		expect(queryByTestId('beat-body')).not.toBeInTheDocument();
	});

	it('toggles expandable Cluster details and renders NodeBrand for nodeIds', async () => {
		const nodes = [
			{
				id: 'n1',
				name: 'HTTP',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'n2',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		];

		const Harness = defineComponent({
			setup() {
				return () =>
					h(
						StateProvider,
						{ initialState: {} },
						{
							default: () =>
								h(
									Cluster,
									{
										title: 'Notify ops',
										summary: 'Alert the on-call channel',
										nodeIds: ['n1', 'n2', 'missing'],
										disclosure: 'expandable',
									},
									{ default: () => h('p', { 'data-test-id': 'cluster-body' }, 'body') },
								),
						},
					);
			},
		});

		const renderHarness = createComponentRenderer(Harness, {
			global: {
				provide: {
					[GenerativeUiNodesKey]: ref(nodes),
				},
				stubs: {
					NodeBrand: {
						props: ['nodeId'],
						template: '<span data-test-id="node-brand" :data-node-id="nodeId" />',
					},
				},
			},
		});

		const { getByRole, queryByTestId, getAllByTestId } = renderHarness();

		expect(queryByTestId('cluster-body')).not.toBeInTheDocument();
		const brands = getAllByTestId('node-brand');
		expect(brands).toHaveLength(2);
		expect(brands[0]).toHaveAttribute('data-node-id', 'n1');
		expect(brands[1]).toHaveAttribute('data-node-id', 'n2');

		await fireEvent.click(getByRole('button', { name: /notify ops/i }));
		expect(queryByTestId('cluster-body')).toBeInTheDocument();
	});

	it('opens each clustered node without toggling disclosure', async () => {
		const nodes = [
			{
				id: 'n1',
				name: 'HTTP',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'n2',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		];
		const openNode = vi.fn();
		const Harness = defineComponent({
			setup() {
				return () =>
					h(
						StateProvider,
						{ initialState: {} },
						{
							default: () =>
								h(
									Cluster,
									{
										title: 'Notify ops',
										summary: 'Alert the on-call channel',
										nodeIds: ['n1', 'n2'],
										disclosure: 'expandable',
									},
									{ default: () => h('p', { 'data-test-id': 'cluster-body' }, 'body') },
								),
						},
					);
			},
		});
		const renderHarness = createComponentRenderer(Harness, {
			global: {
				provide: {
					[GenerativeUiNodesKey]: ref(nodes),
					[GenerativeUiOpenNodeKey]: openNode,
				},
				stubs: {
					NodeBrand: {
						props: ['nodeId'],
						template: '<span :data-node-id="nodeId" />',
					},
				},
			},
		});
		const { getByRole, queryByTestId } = renderHarness();

		await fireEvent.click(getByRole('button', { name: 'Open HTTP' }));
		await fireEvent.click(getByRole('button', { name: 'Open Slack' }));

		expect(openNode).toHaveBeenNthCalledWith(1, 'n1');
		expect(openNode).toHaveBeenNthCalledWith(2, 'n2');
		expect(queryByTestId('cluster-body')).not.toBeInTheDocument();
	});

	it('keeps clustered node brands non-interactive in look-only mode', () => {
		const nodes = [
			{
				id: 'n1',
				name: 'HTTP',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		];
		const Harness = defineComponent({
			setup() {
				return () =>
					h(
						StateProvider,
						{ initialState: {} },
						{
							default: () =>
								h(Cluster, {
									title: 'Notify ops',
									summary: 'Alert the on-call channel',
									nodeIds: ['n1'],
								}),
						},
					);
			},
		});
		const renderHarness = createComponentRenderer(Harness, {
			global: {
				provide: {
					[GenerativeUiNodesKey]: ref(nodes),
					[GenerativeUiLookOnlyKey]: ref(true),
					[GenerativeUiOpenNodeKey]: vi.fn(),
				},
				stubs: {
					NodeBrand: {
						props: ['nodeId'],
						template: '<span :data-node-id="nodeId" />',
					},
				},
			},
		});
		const { queryByRole } = renderHarness();

		expect(queryByRole('button', { name: 'Open HTTP' })).not.toBeInTheDocument();
	});

	it('keeps sibling Beats with the same title independent when captions differ', async () => {
		const Harness = defineComponent({
			setup() {
				return () =>
					h(
						StateProvider,
						{ initialState: {} },
						{
							default: () => [
								h(
									Beat,
									{ title: 'Notify', caption: 'via Slack', disclosure: 'expandable' },
									{ default: () => h('p', { 'data-test-id': 'beat-body-a' }, 'a') },
								),
								h(
									Beat,
									{ title: 'Notify', caption: 'via Email', disclosure: 'expandable' },
									{ default: () => h('p', { 'data-test-id': 'beat-body-b' }, 'b') },
								),
							],
						},
					);
			},
		});

		const renderHarness = createComponentRenderer(Harness);
		const { getAllByRole, queryByTestId } = renderHarness();

		const buttons = getAllByRole('button', { name: /notify/i });
		expect(buttons).toHaveLength(2);

		await fireEvent.click(buttons[0]);
		expect(queryByTestId('beat-body-a')).toBeInTheDocument();
		expect(queryByTestId('beat-body-b')).not.toBeInTheDocument();
	});

	it('keeps sibling Clusters with the same title independent when nodeIds differ', async () => {
		const nodes = [
			{
				id: 'n1',
				name: 'HTTP',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'n2',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		];

		const Harness = defineComponent({
			setup() {
				return () =>
					h(
						StateProvider,
						{ initialState: {} },
						{
							default: () => [
								h(
									Cluster,
									{ title: 'Notify', summary: 'first', nodeIds: ['n1'], disclosure: 'expandable' },
									{ default: () => h('p', { 'data-test-id': 'cluster-body-a' }, 'a') },
								),
								h(
									Cluster,
									{ title: 'Notify', summary: 'second', nodeIds: ['n2'], disclosure: 'expandable' },
									{ default: () => h('p', { 'data-test-id': 'cluster-body-b' }, 'b') },
								),
							],
						},
					);
			},
		});

		const renderHarness = createComponentRenderer(Harness, {
			global: {
				provide: {
					[GenerativeUiNodesKey]: ref(nodes),
				},
				stubs: {
					NodeBrand: {
						props: ['nodeId'],
						template: '<span data-test-id="node-brand" :data-node-id="nodeId" />',
					},
				},
			},
		});

		const { getAllByRole, queryByTestId } = renderHarness();

		const buttons = getAllByRole('button', { name: /notify/i });
		expect(buttons).toHaveLength(2);

		await fireEvent.click(buttons[0]);
		expect(queryByTestId('cluster-body-a')).toBeInTheDocument();
		expect(queryByTestId('cluster-body-b')).not.toBeInTheDocument();
	});
});
