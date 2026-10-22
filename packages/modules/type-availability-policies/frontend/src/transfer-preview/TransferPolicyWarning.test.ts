import type { PolicyViolation } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import TransferPolicyWarning from './TransferPolicyWarning.vue';
import type { TransferPreview } from './useTransferPreview';

const restrictedTypesDialogStub = {
	props: ['open', 'violations', 'projectName'],
	template:
		'<div v-if="open" data-test-id="restricted-types-dialog" :data-project="projectName">{{ violations.length }} violations<slot name="icon" :violation="violations[0]" /></div>',
};

function violation(subjectType: string, subject: string): PolicyViolation {
	return {
		kind: `${subjectType}-unavailable`,
		checkId: `${subjectType}-availability`,
		message: `"${subject}" is blocked`,
		subject,
		subjectType,
		scope: 'project',
	};
}

const slack = violation('nodeType', 'n8n-nodes-base.slack');
const github = violation('credentialType', 'githubApi');

const EMPTY: TransferPreview = {
	restricted: [],
	unpublishReasons: [],
	workflowsToUnpublish: [],
	checkFailed: false,
};

function previewOf(overrides: Partial<TransferPreview>): TransferPreview {
	return { ...EMPTY, ...overrides };
}

const renderComponent = createComponentRenderer(TransferPolicyWarning, {
	props: {
		preview: EMPTY,
		resourceType: 'workflow',
		projectName: 'Marketing',
		labelOf: () => undefined,
	},
	global: { stubs: { RestrictedTypesDialog: restrictedTypesDialogStub } },
});

const WARNING = 'transfer-policy-warning';
const VIEW_RESTRICTED = 'transfer-policy-warning-view-restricted';

describe('TransferPolicyWarning', () => {
	it('renders nothing when the move restricts and unpublishes nothing', () => {
		const { queryByTestId } = renderComponent();

		expect(queryByTestId(WARNING)).not.toBeInTheDocument();
	});

	describe.each([
		[
			'workflow',
			"You can move this workflow, but some of its nodes and credentials aren't allowed in Marketing and will be restricted after the move.",
		],
		[
			'folder',
			"You can move this folder, but some nodes and credentials in its workflows aren't allowed in Marketing and will be restricted after the move.",
		],
	] as const)('when a %s has restricted types', (resourceType, sentence) => {
		it('names the project and offers the list of restricted items', () => {
			const { getByTestId } = renderComponent({
				props: { resourceType, preview: previewOf({ restricted: [slack] }) },
			});

			expect(getByTestId(WARNING)).toHaveTextContent(sentence);
			expect(getByTestId(VIEW_RESTRICTED)).toHaveTextContent('View restricted items');
		});

		it('keeps the dialog closed until the link is clicked, then lists every restricted type', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: { resourceType, preview: previewOf({ restricted: [slack, github] }) },
			});
			expect(queryByTestId('restricted-types-dialog')).not.toBeInTheDocument();

			await userEvent.click(getByTestId(VIEW_RESTRICTED));

			const dialog = getByTestId('restricted-types-dialog');
			expect(dialog).toHaveTextContent('2 violations');
			expect(dialog).toHaveAttribute('data-project', 'Marketing');
		});
	});

	describe('when a credential has restricted types', () => {
		const renderCredential = (
			restricted: PolicyViolation[],
			labelOf: (violation: PolicyViolation) => string | undefined = () => undefined,
		) =>
			renderComponent({
				props: {
					resourceType: 'credential',
					preview: previewOf({ restricted }),
					labelOf,
				},
			});

		it('names the credential type by the host label and offers no list', () => {
			const { getByTestId, queryByTestId } = renderCredential([github], () => 'GitHub API');

			expect(getByTestId(WARNING)).toHaveTextContent(
				"You can move this credential, but GitHub API credentials aren't allowed in Marketing, so it will be restricted after the move.",
			);
			expect(queryByTestId(VIEW_RESTRICTED)).not.toBeInTheDocument();
		});

		it('falls back to the subject when the host has no label', () => {
			const { getByTestId } = renderCredential([github]);

			expect(getByTestId(WARNING)).toHaveTextContent('but githubApi credentials');
		});

		it('falls back to the message when there is no subject either', () => {
			const { getByTestId } = renderCredential([{ ...github, subject: undefined }]);

			expect(getByTestId(WARNING)).toHaveTextContent('but "githubApi" is blocked credentials');
		});
	});

	describe('when the move would unpublish a workflow', () => {
		it('says so when it only unpublishes', () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: { preview: previewOf({ unpublishReasons: [slack] }) },
			});

			expect(getByTestId(WARNING)).toHaveTextContent(
				"You can move this workflow, but its published version isn't allowed in Marketing, so the move will unpublish it.",
			);
			expect(queryByTestId(VIEW_RESTRICTED)).not.toBeInTheDocument();
		});

		it('adds an also sentence after the restricted sentence', () => {
			const { getByTestId } = renderComponent({
				props: { preview: previewOf({ restricted: [slack], unpublishReasons: [slack] }) },
			});

			expect(getByTestId(WARNING)).toHaveTextContent(
				/restricted after the move\. The move will also unpublish it\./,
			);
		});

		it('ignores the folder workflow list', () => {
			const { queryByTestId } = renderComponent({
				props: { preview: previewOf({ workflowsToUnpublish: [{ id: 'wf-1', name: 'Daily' }] }) },
			});

			expect(queryByTestId(WARNING)).not.toBeInTheDocument();
		});
	});

	describe('when the move would unpublish workflows in a folder', () => {
		const workflows = (count: number) =>
			Array.from({ length: count }, (_, index) => ({
				id: `wf-${index}`,
				name: `Workflow ${index}`,
			}));

		it('uses the singular copy for one workflow', () => {
			const { getByTestId } = renderComponent({
				props: {
					resourceType: 'folder',
					preview: previewOf({ workflowsToUnpublish: workflows(1) }),
				},
			});

			expect(getByTestId(WARNING)).toHaveTextContent(
				"You can move this folder, but Marketing doesn't allow 1 of its published workflows, so the move will unpublish it.",
			);
		});

		it('uses the plural copy with the count for several workflows', () => {
			const { getByTestId } = renderComponent({
				props: {
					resourceType: 'folder',
					preview: previewOf({ workflowsToUnpublish: workflows(3) }),
				},
			});

			expect(getByTestId(WARNING)).toHaveTextContent(
				"You can move this folder, but Marketing doesn't allow 3 of its published workflows, so the move will unpublish them.",
			);
		});

		it.each([
			[1, 'The move will also unpublish 1 published workflow.'],
			[3, 'The move will also unpublish 3 published workflows.'],
		])('adds the also sentence for %i workflows after the restricted sentence', (count, also) => {
			const { getByTestId } = renderComponent({
				props: {
					resourceType: 'folder',
					preview: previewOf({ restricted: [slack], workflowsToUnpublish: workflows(count) }),
				},
			});

			expect(getByTestId(WARNING)).toHaveTextContent(also);
		});

		it('ignores the workflow unpublish reasons', () => {
			const { queryByTestId } = renderComponent({
				props: { resourceType: 'folder', preview: previewOf({ unpublishReasons: [slack] }) },
			});

			expect(queryByTestId(WARNING)).not.toBeInTheDocument();
		});
	});

	it('never mentions unpublishing for a credential', () => {
		const { queryByTestId } = renderComponent({
			props: {
				resourceType: 'credential',
				preview: previewOf({
					unpublishReasons: [slack],
					workflowsToUnpublish: [{ id: 'a', name: 'A' }],
				}),
			},
		});

		expect(queryByTestId(WARNING)).not.toBeInTheDocument();
	});

	describe('when a policy check failed', () => {
		it.each([
			['workflow', 'this workflow'],
			['folder', 'this folder'],
			['credential', 'this credential'],
		] as const)('says so alone for a %s', (resourceType, subject) => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: { resourceType, preview: previewOf({ checkFailed: true }) },
			});

			expect(getByTestId(WARNING)).toHaveTextContent(
				`You can move ${subject}, but n8n couldn't check every policy of Marketing. Some items may be restricted after the move.`,
			);
			expect(queryByTestId(VIEW_RESTRICTED)).not.toBeInTheDocument();
		});

		it('appends a note after the restricted sentence', () => {
			const { getByTestId } = renderComponent({
				props: { preview: previewOf({ restricted: [slack], checkFailed: true }) },
			});

			expect(getByTestId(WARNING)).toHaveTextContent(
				/restricted after the move\. Some policy checks failed, so other items may also be restricted\./,
			);
			expect(getByTestId(WARNING)).not.toHaveTextContent("couldn't check every policy");
		});

		it('appends the note after the unpublish sentence', () => {
			const { getByTestId } = renderComponent({
				props: { preview: previewOf({ unpublishReasons: [slack], checkFailed: true }) },
			});

			expect(getByTestId(WARNING)).toHaveTextContent(
				/will unpublish it\. Some policy checks failed, so other items may also be restricted\./,
			);
		});

		it('puts the unpublish sentence before the note when all three apply', () => {
			const { getByTestId } = renderComponent({
				props: {
					preview: previewOf({ restricted: [slack], unpublishReasons: [slack], checkFailed: true }),
				},
			});

			expect(getByTestId(WARNING)).toHaveTextContent(
				/The move will also unpublish it\. Some policy checks failed/,
			);
		});
	});

	it('passes the icon slot through to the dialog', async () => {
		const { getByTestId, getByText } = renderComponent({
			props: { preview: previewOf({ restricted: [slack] }) },
			slots: { icon: '<b>row icon for {{ violation.subject }}</b>' },
		});

		await userEvent.click(getByTestId(VIEW_RESTRICTED));

		expect(getByText('row icon for n8n-nodes-base.slack')).toBeInTheDocument();
	});
});
