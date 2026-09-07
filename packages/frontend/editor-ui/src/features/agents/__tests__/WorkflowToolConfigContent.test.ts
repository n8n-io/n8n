import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { fireEvent, waitFor } from '@testing-library/vue';
import { SUPPORTED_WORKFLOW_TOOL_TRIGGERS } from '@n8n/api-types';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import WorkflowToolConfigContent from '../components/WorkflowToolConfigContent.vue';
import type { WorkflowToolRef } from '../types';

vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		useRouter: () => ({
			resolve: ({ params }: { params: { workflowId: string } }) => ({
				href: `/workflow/${params.workflowId}`,
			}),
		}),
	};
});

vi.mock('@n8n/i18n', () => {
	const i18n = {
		baseText: (key: string) => key,
	};
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

// Element Plus' select is unusable in jsdom, so only the select/option pair is
// swapped for click-driven stubs; every other design-system export stays real.
vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	const { defineComponent, inject, provide } = await import('vue');

	return {
		...actual,
		N8nSelect: defineComponent({
			props: { modelValue: { type: String, default: '' } },
			emits: ['update:modelValue'],
			setup(_props, { emit }) {
				provide('selectOption', (value: string) => emit('update:modelValue', value));
			},
			template: '<div><slot /></div>',
		}),
		N8nOption: defineComponent({
			props: {
				value: { type: String, required: true },
				label: { type: String, required: true },
			},
			setup() {
				return { selectOption: inject<(value: string) => void>('selectOption') };
			},
			template:
				'<button type="button" :data-test-id="`workflow-option-${value}`" @click="selectOption?.(value)"><slot>{{ label }}</slot></button>',
		}),
	};
});

const TRIGGER_TYPE: string = SUPPORTED_WORKFLOW_TOOL_TRIGGERS[0];

function workflow(
	name: string,
	overrides: {
		id?: string;
		isArchived?: boolean;
		activeVersionId?: string | null;
		updatedAt?: string;
		description?: string;
	} = {},
) {
	return {
		id: overrides.id ?? name,
		name,
		description: overrides.description ?? '',
		isArchived: overrides.isArchived ?? false,
		activeVersionId: overrides.activeVersionId === undefined ? 'v-1' : overrides.activeVersionId,
		updatedAt: overrides.updatedAt ?? '2026-07-01T12:00:00.000Z',
		nodes: [{ type: TRIGGER_TYPE }] as Array<{
			type: string;
			parameters?: Record<string, unknown>;
		}>,
	};
}

const renderComponent = createComponentRenderer(WorkflowToolConfigContent);

function createRef(overrides: Partial<WorkflowToolRef> = {}): WorkflowToolRef {
	return {
		type: 'workflow',
		workflow: 'Notify Sales',
		name: 'Notify Sales',
		description: 'Does something useful',
		...overrides,
	} as WorkflowToolRef;
}

function setProjectWorkflows(workflows: Array<ReturnType<typeof workflow>>) {
	mockedStore(useWorkflowsListStore).searchWorkflows = vi.fn().mockResolvedValue(workflows);
}

function lastEmit(emitted: (event: string) => unknown[] | undefined, event: string) {
	return (emitted(event) as unknown[][] | undefined)?.at(-1)?.[0];
}

describe('WorkflowToolConfigContent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		setProjectWorkflows([workflow('Notify Sales'), workflow('Invoice Sender')]);
	});

	it('emits valid=true when target, name and description are set', () => {
		const { emitted } = renderComponent({ props: { initialRef: createRef() } });

		expect(lastEmit(emitted, 'update:valid')).toBe(true);
	});

	it('emits valid=false when the description is empty', () => {
		const { emitted } = renderComponent({
			props: { initialRef: createRef({ description: '' }) },
		});

		expect(lastEmit(emitted, 'update:valid')).toBe(false);
	});

	it('emits valid=false for a whitespace-only description', () => {
		const { emitted } = renderComponent({
			props: { initialRef: createRef({ description: '   ' }) },
		});

		expect(lastEmit(emitted, 'update:valid')).toBe(false);
	});

	it('emits valid=false when the name is empty', () => {
		const { emitted } = renderComponent({
			props: { initialRef: createRef({ name: '', workflow: '' }) },
		});

		expect(lastEmit(emitted, 'update:valid')).toBe(false);
	});

	it('emits valid=false when the target workflow is empty', () => {
		const { emitted } = renderComponent({
			props: { initialRef: createRef({ workflow: '', name: 'Notify Sales' }) },
		});

		expect(lastEmit(emitted, 'update:valid')).toBe(false);
	});

	it('emits valid=true once an empty description is filled in', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: { initialRef: createRef({ description: '' }) },
		});

		await fireEvent.update(getByTestId('agent-workflow-tool-description'), 'Now described');

		await waitFor(() => {
			expect(lastEmit(emitted, 'update:valid')).toBe(true);
		});
	});

	it('carries the tool name to the new target and clears the description', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: { initialRef: createRef() },
		});

		await waitFor(() => getByTestId('workflow-option-Invoice Sender'));
		await fireEvent.click(getByTestId('workflow-option-Invoice Sender'));

		await waitFor(() => {
			expect(lastEmit(emitted, 'update:node-name')).toBe('Invoice Sender');
		});
		expect((getByTestId('agent-workflow-tool-description') as HTMLTextAreaElement).value).toBe('');
		expect(lastEmit(emitted, 'update:valid')).toBe(false);
	});

	it('keeps the description when the already-selected target is picked again', async () => {
		const { emitted, getByTestId, findByTestId } = renderComponent({
			props: { initialRef: createRef() },
		});

		await fireEvent.click(await findByTestId('workflow-option-Notify Sales'));

		expect((getByTestId('agent-workflow-tool-description') as HTMLTextAreaElement).value).toBe(
			'Does something useful',
		);
		expect(lastEmit(emitted, 'update:valid')).toBe(true);
	});

	it('keeps a customized tool name when the target changes', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: { initialRef: createRef({ name: 'Ask CRM' }) },
		});

		await waitFor(() => getByTestId('workflow-option-Invoice Sender'));
		await fireEvent.click(getByTestId('workflow-option-Invoice Sender'));

		await waitFor(() => {
			expect(lastEmit(emitted, 'update:valid')).toBe(false);
		});
		expect(lastEmit(emitted, 'update:node-name')).toBe('Ask CRM');
	});

	it('warns when more than one project workflow shares the selected name', async () => {
		setProjectWorkflows([
			workflow('Notify Sales', { id: 'wf-1' }),
			workflow('Notify Sales', { id: 'wf-2' }),
		]);

		const { findByTestId } = renderComponent({ props: { initialRef: createRef() } });

		expect(await findByTestId('agent-workflow-tool-target-duplicate')).toBeTruthy();
	});

	it('shows the update time and description on every option', async () => {
		setProjectWorkflows([
			workflow('Notify Sales', {
				id: 'wf-1',
				updatedAt: '2026-07-20T12:00:00.000Z',
				description: 'Pings the sales channel',
			}),
		]);

		const { findByTestId } = renderComponent({ props: { initialRef: createRef() } });

		const option = await findByTestId('workflow-option-wf-1');

		expect(option.textContent).toContain('Notify Sales');
		expect(option.textContent).toContain('2026');
		expect(option.textContent).toContain('Pings the sales channel');
	});

	describe('By ID mode', () => {
		async function enterId(rendered: ReturnType<typeof renderComponent>, id: string) {
			await fireEvent.click(rendered.getByTestId('workflow-option-id'));
			await fireEvent.update(rendered.getByTestId('agent-workflow-tool-target-id'), id);
			await fireEvent.blur(rendered.getByTestId('agent-workflow-tool-target-id'));
		}

		it('resolves the id of a selectable workflow to its name', async () => {
			setProjectWorkflows([
				workflow('Notify Sales', { id: 'wf-1' }),
				workflow('Invoice Sender', { id: 'wf-2' }),
			]);

			const rendered = renderComponent({ props: { initialRef: createRef() } });
			await rendered.findByTestId('workflow-option-wf-2');
			await enterId(rendered, 'wf-2');

			await waitFor(() => {
				expect(lastEmit(rendered.emitted, 'update:node-name')).toBe('Invoice Sender');
			});
		});

		it('rejects the id of a workflow the agent could not call and keeps the target', async () => {
			setProjectWorkflows([
				workflow('Notify Sales', { id: 'wf-1' }),
				workflow('Archived Report', { id: 'wf-archived', isArchived: true }),
			]);

			const rendered = renderComponent({ props: { initialRef: createRef() } });
			await rendered.findByTestId('workflow-option-wf-1');
			await enterId(rendered, 'wf-archived');

			expect(
				await rendered.findByTestId('agent-workflow-tool-target-id-unresolvable'),
			).toBeTruthy();
			expect(lastEmit(rendered.emitted, 'update:node-name')).toBe('Notify Sales');
			expect(lastEmit(rendered.emitted, 'update:valid')).toBe(true);
		});
	});

	it('keeps an id-backed target resolved after its workflow is renamed', async () => {
		const open = vi.spyOn(window, 'open').mockImplementation(() => null);
		setProjectWorkflows([workflow('Renamed Sales', { id: 'wf-1' })]);

		const { findByTestId, queryByTestId } = renderComponent({
			props: {
				initialRef: createRef({
					workflowId: 'wf-1',
					workflow: 'Notify Sales',
				}),
			},
		});
		await fireEvent.click(await findByTestId('agent-workflow-tool-target-open'));

		expect(open).toHaveBeenCalledWith('/workflow/wf-1', '_blank');
		expect(queryByTestId('agent-workflow-tool-target-missing')).toBeNull();
		expect(queryByTestId('agent-workflow-tool-target-duplicate')).toBeNull();
	});

	it('offers no open link when the target does not resolve', async () => {
		setProjectWorkflows([]);

		const { findByTestId, container } = renderComponent({ props: { initialRef: createRef() } });
		await findByTestId('agent-workflow-tool-target-missing');

		expect(container.querySelector('[data-test-id="agent-workflow-tool-target-open"]')).toBeNull();
	});

	it('orders options from most recently updated to oldest', async () => {
		setProjectWorkflows([
			workflow('Older', { id: 'wf-old', updatedAt: '2026-07-01T12:00:00.000Z' }),
			workflow('Newer', { id: 'wf-new', updatedAt: '2026-07-20T12:00:00.000Z' }),
		]);

		const { container, findByTestId } = renderComponent({
			props: { initialRef: createRef({ workflow: 'Newer', name: 'Newer' }) },
		});
		await findByTestId('workflow-option-wf-new');

		const target = container.querySelector('[data-test-id="agent-workflow-tool-target"]');
		const rendered = [
			...(target?.querySelectorAll('[data-test-id^="workflow-option-"]') ?? []),
		].map((option) => option.getAttribute('data-test-id'));

		expect(rendered).toEqual(['workflow-option-wf-new', 'workflow-option-wf-old']);
	});

	it('flags a target that is absent from the project, but not while still loading', async () => {
		setProjectWorkflows([]);

		const { queryByTestId, findByTestId } = renderComponent({
			props: { initialRef: createRef() },
		});

		expect(queryByTestId('agent-workflow-tool-target-missing')).toBeNull();

		expect(await findByTestId('agent-workflow-tool-target-missing')).toBeTruthy();
		expect(queryByTestId('agent-workflow-tool-target-unusable')).toBeNull();
	});

	it('flags a target that exists but cannot be used as an agent tool', async () => {
		setProjectWorkflows([workflow('Notify Sales', { isArchived: true })]);

		const { queryByTestId, findByTestId } = renderComponent({
			props: { initialRef: createRef() },
		});

		expect(await findByTestId('agent-workflow-tool-target-unusable')).toBeTruthy();
		expect(queryByTestId('agent-workflow-tool-target-missing')).toBeNull();
	});

	it('flags a usable target whose workflow is not published', async () => {
		setProjectWorkflows([workflow('Notify Sales', { activeVersionId: null })]);

		const { queryByTestId, findByTestId } = renderComponent({
			props: { initialRef: createRef() },
		});

		expect(await findByTestId('agent-workflow-tool-target-unpublished')).toBeTruthy();
		expect(queryByTestId('agent-workflow-tool-target-unusable')).toBeNull();
	});

	describe('workflow input bindings', () => {
		function workflowWithInputs(
			name: string,
			fields: Array<{ name: string; type?: string }>,
			overrides: { id?: string } = {},
		) {
			return {
				...workflow(name, overrides),
				nodes: [
					{
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						parameters: {
							inputSource: 'workflowInputs',
							workflowInputs: { values: fields },
						},
					},
				],
			};
		}

		it('renders declared input fields for an Execute Workflow Trigger target', async () => {
			setProjectWorkflows([
				workflowWithInputs('Notify Sales', [
					{ name: 'chatId', type: 'string' },
					{ name: 'botName', type: 'string' },
				]),
			]);

			const { findByTestId } = renderComponent({ props: { initialRef: createRef() } });

			expect(await findByTestId('agent-workflow-tool-inputs')).toBeTruthy();
			expect(await findByTestId('agent-workflow-tool-input-chatId')).toBeTruthy();
			expect(await findByTestId('agent-workflow-tool-input-botName')).toBeTruthy();
		});

		it('shows a fixed value input when a binding is already fixed', async () => {
			setProjectWorkflows([
				workflowWithInputs('Notify Sales', [
					{ name: 'chatId', type: 'string' },
					{ name: 'botName', type: 'string' },
				]),
			]);

			const { findByTestId, getByTestId } = renderComponent({
				props: {
					initialRef: createRef({
						inputs: { botName: { mode: 'fixed', value: 'Jarvis' } },
					}),
				},
			});

			await findByTestId('agent-workflow-tool-input-value-botName');
			expect(
				(getByTestId('agent-workflow-tool-input-value-botName') as HTMLInputElement).value,
			).toBe('Jarvis');
		});

		it('does not render input bindings for passthrough workflows', async () => {
			setProjectWorkflows([
				{
					...workflow('Notify Sales'),
					nodes: [
						{
							type: 'n8n-nodes-base.executeWorkflowTrigger',
							parameters: { inputSource: 'passthrough' },
						},
					],
				},
			]);

			const { findByTestId, queryByTestId } = renderComponent({
				props: { initialRef: createRef() },
			});
			await findByTestId('agent-workflow-tool-target');

			expect(queryByTestId('agent-workflow-tool-inputs')).toBeNull();
		});
	});
});
