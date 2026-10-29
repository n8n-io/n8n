import type { PolicyViolation } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import TransferPolicyWarning from './TransferPolicyWarning.vue';
import type { TransferPreview } from './useTransferPreview';

const restrictedTypesDialogStub = {
	props: ['open', 'violations', 'projectId', 'projectName'],
	template:
		'<div v-if="open" data-test-id="restricted-types-dialog" :data-project="projectName" :data-project-id="projectId">{{ violations.length }} violations<slot name="icon" :violation="violations[0]" /></div>',
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
		projectId: 'project-dest',
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

	const TITLE = 'transfer-policy-warning-title';
	const workflows = (count: number) =>
		Array.from({ length: count }, (_, index) => ({ id: `wf-${index}`, name: `Workflow ${index}` }));

	describe.each([
		[
			'workflow',
			"Marketing doesn't allow 1 node and 1 credential it uses, so it can't run or be published there.",
		],
		[
			'folder',
			"Marketing doesn't allow 1 node and 1 credential its workflows use, so they can't run or be published there.",
		],
	] as const)('when a %s has restricted types', (resourceType, sentence) => {
		it('counts the blocked types, offers the list, and shows no title', () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: { resourceType, preview: previewOf({ restricted: [slack, github] }) },
			});

			expect(getByTestId(WARNING)).toHaveTextContent(sentence);
			expect(getByTestId(VIEW_RESTRICTED)).toHaveTextContent('View restricted items');
			expect(queryByTestId(TITLE)).not.toBeInTheDocument();
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
			expect(dialog).toHaveAttribute('data-project-id', 'project-dest');
		});
	});

	it.each([
		['one node', [slack], '1 node it uses'],
		['several nodes', [slack, violation('nodeType', 'n8n-nodes-base.gmail')], '2 nodes it uses'],
		['credentials only', [github], '1 credential it uses'],
		['a type repeated across workflows once', [slack, slack], '1 node it uses'],
		['unknown subject types as items', [violation('somethingElse', 'thing')], '1 item it uses'],
	])('counts %s', (_name, restricted, text) => {
		const { getByTestId } = renderComponent({ props: { preview: previewOf({ restricted }) } });

		expect(getByTestId(WARNING)).toHaveTextContent(text);
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
				"Marketing doesn't allow GitHub API credentials, so this credential can't be used there.",
			);
			expect(queryByTestId(VIEW_RESTRICTED)).not.toBeInTheDocument();
		});

		it.each([
			['the subject when the host has no label', github, 'allow githubApi credentials'],
			['the message without a subject', { ...github, subject: undefined }, 'allow "githubApi" is'],
		])('falls back to %s', (_name, restricted, text) => {
			const { getByTestId } = renderCredential([restricted]);

			expect(getByTestId(WARNING)).toHaveTextContent(text);
		});
	});

	describe('when the move would unpublish a workflow', () => {
		it('titles the unpublish and counts the restricted types', () => {
			const { getByTestId } = renderComponent({
				props: { preview: previewOf({ restricted: [slack, github], unpublishReasons: [slack] }) },
			});

			expect(getByTestId(TITLE)).toHaveTextContent('Moving will unpublish this workflow');
			expect(getByTestId(WARNING)).toHaveTextContent(
				"Marketing doesn't allow 1 node and 1 credential it uses, so it can't run or be published there.",
			);
			expect(getByTestId(VIEW_RESTRICTED)).toBeInTheDocument();
		});

		it('counts the published version types when only that version is blocked', () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: { preview: previewOf({ unpublishReasons: [slack] }) },
			});

			expect(getByTestId(TITLE)).toHaveTextContent('Moving will unpublish this workflow');
			expect(getByTestId(WARNING)).toHaveTextContent(
				"Marketing doesn't allow 1 node its published version uses.",
			);
			expect(queryByTestId(VIEW_RESTRICTED)).not.toBeInTheDocument();
		});
	});

	describe('when the move would unpublish workflows in a folder', () => {
		it.each([
			[1, 'Moving will unpublish 1 workflow'],
			[3, 'Moving will unpublish 3 workflows'],
		])('titles %i workflows', (count, title) => {
			const { getByTestId } = renderComponent({
				props: {
					resourceType: 'folder',
					preview: previewOf({ workflowsToUnpublish: workflows(count) }),
				},
			});

			expect(getByTestId(TITLE)).toHaveTextContent(title);
			expect(getByTestId(WARNING)).toHaveTextContent(
				"Marketing doesn't allow some nodes or credentials their published versions use.",
			);
		});

		it('keeps the restricted sentence as the body when types are restricted too', () => {
			const { getByTestId } = renderComponent({
				props: {
					resourceType: 'folder',
					preview: previewOf({ restricted: [slack], workflowsToUnpublish: workflows(2) }),
				},
			});

			expect(getByTestId(TITLE)).toHaveTextContent('Moving will unpublish 2 workflows');
			expect(getByTestId(WARNING)).toHaveTextContent('1 node its workflows use');
		});
	});

	it.each([
		['workflow', previewOf({ workflowsToUnpublish: [{ id: 'wf-1', name: 'Daily' }] })],
		['folder', previewOf({ unpublishReasons: [slack] })],
		[
			'credential',
			previewOf({ unpublishReasons: [slack], workflowsToUnpublish: [{ id: 'a', name: 'A' }] }),
		],
	] as const)('ignores the unpublish fields that do not apply to a %s', (resourceType, preview) => {
		const { queryByTestId } = renderComponent({ props: { resourceType, preview } });

		expect(queryByTestId(WARNING)).not.toBeInTheDocument();
	});

	describe('when a policy check failed', () => {
		it.each(['workflow', 'folder', 'credential'] as const)(
			'says so alone for a %s',
			(resourceType) => {
				const { getByTestId, queryByTestId } = renderComponent({
					props: { resourceType, preview: previewOf({ checkFailed: true }) },
				});

				expect(getByTestId(WARNING)).toHaveTextContent(
					"n8n couldn't check every policy of Marketing, so some items may be restricted after the move.",
				);
				expect(queryByTestId(VIEW_RESTRICTED)).not.toBeInTheDocument();
			},
		);

		it('appends a note after the body instead of the lone sentence', () => {
			const { getByTestId } = renderComponent({
				props: {
					preview: previewOf({ restricted: [slack], unpublishReasons: [slack], checkFailed: true }),
				},
			});

			expect(getByTestId(WARNING)).toHaveTextContent(
				/be published there\. Some policy checks failed, so other items may also be restricted\./,
			);
			expect(getByTestId(WARNING)).not.toHaveTextContent("couldn't check every policy");
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
