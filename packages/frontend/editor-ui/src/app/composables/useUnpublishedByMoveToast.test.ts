import { defineComponent, isVNode, type VNode } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { FolderTransferResult, PolicyViolation } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { useUnpublishedByMoveToast } from './useUnpublishedByMoveToast';

const showMessageSpy = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: showMessageSpy }),
}));

const slackViolation: PolicyViolation = {
	kind: 'node-type-unavailable',
	checkId: 'node-type-availability',
	message: 'Node type "n8n-nodes-base.slack" is blocked by an instance policy',
	subject: 'n8n-nodes-base.slack',
	subjectType: 'nodeType',
	scope: 'instance',
};

const renderComponent = createComponentRenderer(
	defineComponent<{ vnode: VNode }>({
		props: { vnode: { type: Object, required: true } },
		setup: (props) => () => props.vnode,
	}),
);

function shownMessage(): VNode {
	const [{ message }] = showMessageSpy.mock.lastCall as [{ message: unknown }];
	if (!isVNode(message)) throw new Error('Expected the toast message to be a VNode');
	return message;
}

describe('useUnpublishedByMoveToast', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
	});

	describe('showForWorkflow', () => {
		it.each([
			['no result', undefined],
			['a result with only an error', { error: { name: 'Error', message: 'boom' } }],
		])('should not show a toast for %s', (_label, result) => {
			useUnpublishedByMoveToast().showForWorkflow(result, 'My workflow', 'Team A');

			expect(showMessageSpy).not.toHaveBeenCalled();
		});

		it('should show a persistent warning toast when the move unpublished the workflow', () => {
			useUnpublishedByMoveToast().showForWorkflow(
				{ unpublishReasons: [slackViolation] },
				'My workflow',
				'Team A',
			);

			expect(showMessageSpy).toHaveBeenCalledTimes(1);
			expect(showMessageSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'warning',
					duration: 0,
					title: 'Workflow unpublished',
				}),
			);
		});

		it('should name the workflow, the project and the violations in the message', () => {
			useUnpublishedByMoveToast().showForWorkflow(
				{ unpublishReasons: [slackViolation] },
				'My workflow',
				'Team A',
			);

			const { container } = renderComponent({ props: { vnode: shownMessage() } });

			expect(container).toHaveTextContent(
				"Team A doesn't allow publishing 'My workflow', so the move unpublished it.",
			);
			expect(container.querySelectorAll('[data-test-id="policy-violation"]')).toHaveLength(1);
			expect(container).toHaveTextContent('n8n-nodes-base.slack');
		});

		it('should render the workflow name as text, not markup', () => {
			useUnpublishedByMoveToast().showForWorkflow(
				{ unpublishReasons: [slackViolation] },
				'<b>x</b>',
				'Team A',
			);

			const { container } = renderComponent({ props: { vnode: shownMessage() } });

			expect(container.querySelector('b')).toBeNull();
			expect(container).toHaveTextContent('<b>x</b>');
		});
	});

	describe('showForFolder', () => {
		const result: FolderTransferResult = {
			unpublishedWorkflows: [
				{ id: 'w1', name: 'First', unpublishReasons: [slackViolation] },
				{ id: 'w2', name: 'Second', unpublishReasons: [slackViolation] },
			],
		};

		it.each([
			['no result', undefined],
			['no unpublished workflows', { unpublishedWorkflows: [] }],
		])('should not show a toast for %s', (_label, folderResult) => {
			useUnpublishedByMoveToast().showForFolder(folderResult, 'Team A');

			expect(showMessageSpy).not.toHaveBeenCalled();
		});

		it('should show a persistent warning toast when the move unpublished workflows', () => {
			useUnpublishedByMoveToast().showForFolder(result, 'Team A');

			expect(showMessageSpy).toHaveBeenCalledTimes(1);
			expect(showMessageSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'warning',
					duration: 0,
					title: 'Workflows unpublished',
				}),
			);
		});

		it('should list every unpublished workflow name and the project in the message', () => {
			useUnpublishedByMoveToast().showForFolder(result, 'Team A');

			const { container } = renderComponent({ props: { vnode: shownMessage() } });

			expect(container).toHaveTextContent(
				"Team A doesn't allow publishing these workflows, so the move unpublished them: 'First', 'Second'.",
			);
		});

		it('should pass the message as a VNode, not an HTML string', () => {
			useUnpublishedByMoveToast().showForFolder(result, 'Team A');

			expect(isVNode(showMessageSpy.mock.lastCall?.[0].message)).toBe(true);
		});

		it('should render workflow names as text, not markup', () => {
			useUnpublishedByMoveToast().showForFolder(
				{
					unpublishedWorkflows: [
						{ id: 'w1', name: '<b>x</b>', unpublishReasons: [slackViolation] },
					],
				},
				'Team A',
			);

			const { container } = renderComponent({ props: { vnode: shownMessage() } });

			expect(container.querySelector('b')).toBeNull();
			expect(container).toHaveTextContent("'<b>x</b>'");
		});
	});
});
