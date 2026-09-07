/**
 * The `icon` parameter type is drawn by `@n8n/frontend-module-parameter-input-icon`, not by a
 * branch in `ParameterInput.vue`. That puts three seams between a node parameter and its
 * picker — the registry lookup, an async component boundary, and a debounced
 * `update:modelValue` — and none of them existed while the branch was inline.
 *
 * These cases drive the real module through the real shell, so a break in any of the
 * three fails here. The module's own suite covers the adapter in isolation; what is
 * guarded here is the wiring, plus the two fallbacks the shell keeps for a type it does
 * not own: the expression editor, and a built-in input for a type no module claims.
 */

// The suite-wide `reka-ui` stub in `src/__tests__/setup.ts` toggles the popover from a
// capture-phase handler. `N8nIconPicker` toggles its own `v-model:open` from a
// `@click.stop` on the trigger, which cannot stop a capture-phase listener, so the two
// toggles cancel and the popup never opens under the stub. The real Reka trigger toggles
// on bubble, where `.stop` does reach it. Opening the picker is the point of half these
// cases, so this file runs against the real popover.
vi.unmock('reka-ui');

import { ParameterInputIconModule } from '@n8n/frontend-module-parameter-input-icon';
import { parameterInputRegistry } from '@n8n/frontend-module-sdk';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import type { INodeProperties } from 'n8n-workflow';
import { computed, defineComponent, h } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import ParameterInput from './ParameterInput.vue';

const ndvState = {
	hasInputData: true,
	activeNode: {
		id: 'node-id',
		name: 'When chat message received',
		parameters: {},
		position: [0, 0] as [number, number],
		type: '@n8n/n8n-nodes-langchain.chatTrigger',
		typeVersion: 1.2,
	},
	isInputPanelEmpty: false,
	isOutputPanelEmpty: false,
	ndvInputDataWithPinnedData: [],
	getHoveringItem: undefined,
	expressionOutputItemIndex: 0,
	isTableHoverOnboarded: false,
	setHighlightDraggables: vi.fn(),
	setNDVPanelDataIsEmpty: vi.fn(),
	setNDVBranchIndex: vi.fn(),
};

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	useNDVStore: vi.fn(() => ndvState),
	injectNDVStore: vi.fn(() => ({ value: ndvState })),
	injectNDVStoreIfProvided: vi.fn(() => ({ value: ndvState })),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		allNodeTypes: [],
		getNodeType: vi.fn().mockReturnValue(null),
		getAllNodeTypes: vi.fn().mockReturnValue({
			nodeTypes: {},
			init: async () => {},
			getByNameAndVersion: () => undefined,
		}),
	})),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn(), resolve: vi.fn().mockReturnValue({ href: '/' }) }),
	useRoute: () => ({}),
	RouterLink: vi.fn(),
}));

vi.mock('@/features/ai/assistant/builder.store', () => ({
	useBuilderStore: vi.fn(() => ({
		trackWorkflowBuilderJourney: vi.fn(),
		isAIBuilderEnabled: false,
	})),
}));

/** The `agentIcon` field of `ChatTrigger.node.ts` — one of the two shipped `icon` fields. */
const agentIconParameter: INodeProperties = {
	displayName: 'Agent Icon',
	name: 'agentIcon',
	type: 'icon',
	default: { type: 'icon', value: 'bot' },
	noDataExpression: true,
	description: 'The icon of the agent on n8n Chat',
};

/**
 * The `icon` field inside the `Prompts` collection of `ChatTrigger.node.ts` — the other
 * one, and the only shipped `icon` parameter that the shell draws with `hideLabel`.
 */
const promptsIconParameter: INodeProperties = {
	displayName: 'Icon',
	name: 'icon',
	type: 'icon',
	noDataExpression: true,
	default: { type: 'icon', value: 'comment' },
};

/**
 * An `icon` parameter that permits an expression. No node ships one — both shipped fields
 * set `noDataExpression`, which makes `isValueExpression` return false whatever the value
 * is. The type still has to keep the expression path, because the module claims the
 * render branch only, so this fixture is what exercises it.
 */
const expressionableIconParameter: INodeProperties = {
	displayName: 'Agent Icon',
	name: 'agentIcon',
	type: 'icon',
	default: { type: 'icon', value: 'bot' },
};

const renderComponent = createComponentRenderer(ParameterInput, {
	pinia: createTestingPinia(),
	global: {
		provide: {
			[WorkflowIdKey as unknown as string]: computed(() => 'test-workflow-id'),
		},
	},
});

function registerIconModule() {
	const contribution = ParameterInputIconModule.parameterInputs?.[0];
	if (!contribution) throw new Error('ParameterInputIconModule contributes no parameter input');
	parameterInputRegistry.register(contribution);
}

/**
 * Mounts the field and waits for the module's chunk. The first `import()` of the SFC
 * settles over an unknown number of microtask turns, so the wait is an auto-waiting query
 * rather than a fixed number of `flushPromises` rounds.
 */
async function renderIconField(props: Record<string, unknown> = {}) {
	const rendered = renderComponent({
		props: {
			path: 'parameters.agentIcon',
			parameter: agentIconParameter,
			modelValue: { type: 'icon', value: 'bot' },
			...props,
		},
	});
	await rendered.findByTestId('icon-picker-button');
	return rendered;
}

/** Mounts the field without assuming a picker ever appears. */
async function renderField(props: Record<string, unknown>) {
	const rendered = renderComponent({ props });
	await flushPromises();
	return rendered;
}

/** The last `update` the shell emitted for the field. */
function lastUpdate(emitted: Record<string, unknown[]>) {
	const updates = emitted.update as Array<[{ name: string; value: unknown }]> | undefined;
	if (!updates?.length) throw new Error('the shell emitted no update');
	return updates[updates.length - 1][0];
}

describe('ParameterInput.vue — the icon parameter module', () => {
	afterEach(() => {
		parameterInputRegistry.clear();
	});

	describe('the picker the module contributes', () => {
		beforeEach(registerIconModule);

		it('draws the field with the module picker and no built-in input', async () => {
			const { getByTestId, container } = await renderIconField();

			expect(getByTestId('icon-picker-button')).toBeInTheDocument();
			expect(container.querySelector('input')).not.toBeInTheDocument();
		});

		it('opens the picker on the trigger', async () => {
			const { getByTestId, findAllByTestId } = await renderIconField();

			await userEvent.click(getByTestId('icon-picker-button'));

			expect(getByTestId('icon-picker-popup')).toBeVisible();
			expect(getByTestId('icon-picker-tabs')).toBeVisible();
			expect((await findAllByTestId('icon-picker-icon')).length).toBeGreaterThan(0);
		});

		it('sends a picked icon to the shell as the parameter value', async () => {
			const { getByTestId, findAllByTestId, emitted } = await renderIconField();

			await userEvent.click(getByTestId('icon-picker-button'));
			const icons = await findAllByTestId('icon-picker-icon');
			const pickedLabel = icons[0].getAttribute('aria-label');

			await userEvent.click(icons[0]);

			// The shell debounces the update by 100 ms.
			await waitFor(() => expect(emitted().update).toBeTruthy());
			const update = lastUpdate(emitted());
			expect(update.name).toBe('parameters.agentIcon');
			expect(update.value).toEqual({ type: 'icon', value: expect.any(String) });
			expect(pickedLabel).toBeTruthy();
		});

		/**
		 * The emoji grid is not reachable here: `N8nIconPicker` filters every emoji through
		 * `is-emoji-supported`, which measures a glyph on a canvas that jsdom does not have, so
		 * the grid comes up empty. That package is not a dependency of editor-ui either, so
		 * `vi.mock` cannot resolve it from this file. Emoji selection is guarded in
		 * `IconPicker.test.ts` ("is able to select an emoji"), and the emoji shape of the value
		 * is guarded in the module's own suite. What stays here is that an emoji value the shell
		 * holds reaches the trigger.
		 */
		it('shows an emoji value the shell holds', async () => {
			const { getByTestId } = await renderIconField({
				modelValue: { type: 'emoji', value: '\u{1F436}' },
			});

			expect(getByTestId('icon-picker-button')).toHaveTextContent('\u{1F436}');
		});

		/**
		 * The built-in branch updated the value with no debounce. The contributed slot goes
		 * through `valueChangedDebounced`, so the module holds the picked value until the
		 * shell's own value returns. Without that hold the trigger shows the previous icon for
		 * 100 ms.
		 */
		it('shows the picked value at once, with no flash of the previous one', async () => {
			const { getByTestId, findAllByTestId } = await renderIconField({
				modelValue: { type: 'icon', value: 'bot' },
			});

			expect(getByTestId('icon-picker-button').innerHTML).toContain('data-icon="bot"');

			await userEvent.click(getByTestId('icon-picker-button'));
			const icons = await findAllByTestId('icon-picker-icon');
			const picked = icons.find((i) => i.getAttribute('aria-label') !== 'Bot') as HTMLElement;

			await userEvent.click(picked);

			// `modelValue` still holds `bot` here: the shell has not sent a new value back, and
			// the trigger must already have stopped drawing it.
			expect(getByTestId('icon-picker-button').innerHTML).not.toContain('data-icon="bot"');
		});

		it('yields to the shell once the new value arrives', async () => {
			const { getByTestId, rerender } = await renderIconField({
				modelValue: { type: 'icon', value: 'bot' },
			});

			await rerender({
				path: 'parameters.agentIcon',
				parameter: agentIconParameter,
				modelValue: { type: 'emoji', value: '\u{1F436}' },
			});

			expect(getByTestId('icon-picker-button')).toHaveTextContent('\u{1F436}');
		});

		it('holds the read-only state and opens no picker', async () => {
			const { getByTestId, queryByTestId } = await renderIconField({ isReadOnly: true });

			expect(getByTestId('icon-picker-button')).toBeDisabled();

			await userEvent.click(getByTestId('icon-picker-button'));

			expect(queryByTestId('icon-picker-popup')).not.toBeInTheDocument();
		});

		// `hideLabel` reached the built-in branch directly. It reaches the module as a prop,
		// so the size rule breaks silently if the shell stops passing it.
		it.each([
			['large', false],
			['small', true],
		])('sizes the trigger %s for hideLabel=%s', async (size, hideLabel) => {
			const { getByTestId } = await renderIconField({
				path: 'parameters.prompts[0].icon',
				parameter: promptsIconParameter,
				modelValue: { type: 'icon', value: 'comment' },
				hideLabel,
			});

			expect(getByTestId('icon-picker-button').className).toContain(size);
		});

		/**
		 * The module declares no `ownsExpressionRendering`, so the shell keeps the expression
		 * editor for `icon` — the rule the `!isModelValueExpression && !forceShowExpression`
		 * guard on the built-in branch had.
		 */
		it('keeps the expression editor for an icon parameter holding an expression', async () => {
			const { queryByTestId, container } = await renderField({
				path: 'parameters.agentIcon',
				parameter: expressionableIconParameter,
				modelValue: '={{ $json.icon }}',
			});

			await waitFor(() => expect(container.querySelector('.cm-editor')).toBeInTheDocument());
			expect(queryByTestId('icon-picker-button')).not.toBeInTheDocument();
		});

		it('keeps the expression editor when the shell forces it', async () => {
			const { queryByTestId, container } = await renderField({
				path: 'parameters.agentIcon',
				parameter: agentIconParameter,
				modelValue: { type: 'icon', value: 'bot' },
				forceShowExpression: true,
			});

			await waitFor(() => expect(container.querySelector('.cm-editor')).toBeInTheDocument());
			expect(queryByTestId('icon-picker-button')).not.toBeInTheDocument();
		});
	});

	describe('the fallbacks the shell keeps', () => {
		it('draws the built-in input for a type no module claims', async () => {
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

			const { container, queryByTestId } = await renderField({
				path: 'parameters.custom',
				parameter: { displayName: 'Custom', name: 'custom', type: 'string', default: '' },
				modelValue: 'plain',
			});

			expect(queryByTestId('icon-picker-button')).not.toBeInTheDocument();
			expect(container.querySelector('input')).toBeInTheDocument();
			expect(consoleError).not.toHaveBeenCalled();

			consoleError.mockRestore();
		});

		it('keeps the field row when the contributed chunk fails to load', async () => {
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
			const rejections: unknown[] = [];
			const onRejection = (event: PromiseRejectionEvent) => rejections.push(event.reason);
			window.addEventListener('unhandledrejection', onRejection);

			parameterInputRegistry.register({
				type: 'icon',
				component: async () => {
					throw new Error('chunk 404');
				},
			});

			const { findByTestId } = await renderField({
				path: 'parameters.agentIcon',
				parameter: agentIconParameter,
				modelValue: { type: 'icon', value: 'bot' },
			});

			// One retry, then the error state. Both attempts have to settle first.
			const row = await findByTestId('parameter-input-load-error');
			expect(row).toHaveAttribute('role', 'alert');
			expect(consoleError).toHaveBeenCalledWith(
				'Failed to load a contributed parameter input',
				expect.any(Error),
			);

			window.removeEventListener('unhandledrejection', onRejection);
			consoleError.mockRestore();
			expect(rejections).toEqual([]);
		});

		it('reserves the field row while the contributed chunk is still loading', async () => {
			vi.useFakeTimers();
			let release: (component: unknown) => void = () => {};
			const LateInput = defineComponent({
				setup: () => () => h('span', { 'data-test-id': 'late-input' }),
			});

			parameterInputRegistry.register({
				type: 'icon',
				component: async () =>
					await new Promise((resolve) => {
						release = resolve;
					}),
			});

			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					path: 'parameters.agentIcon',
					parameter: agentIconParameter,
					modelValue: { type: 'icon', value: 'bot' },
				},
			});

			// `defineAsyncComponent` holds the placeholder back for its default 200 ms delay,
			// so a chunk that arrives quickly never flashes one.
			await flushPromises();
			expect(queryByTestId('parameter-input-loading')).not.toBeInTheDocument();

			await vi.advanceTimersByTimeAsync(200);
			expect(getByTestId('parameter-input-loading')).toBeInTheDocument();

			release(LateInput);
			await flushPromises();

			expect(queryByTestId('parameter-input-loading')).not.toBeInTheDocument();
			expect(getByTestId('late-input')).toBeInTheDocument();
			vi.useRealTimers();
		});
	});
});
