import type {
	PromotionDirection,
	PromotionResource,
	PromotionResourceDetail,
} from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';

import { billingPreview, billingResources, resource } from '../../__tests__/preview.fixtures';
import { buildSelectionGraph } from '../../promotionPreview.selection';
import PromotionChangeCard from './PromotionChangeCard.vue';

const renderComponent = createComponentRenderer(PromotionChangeCard);

type Case = {
	name: string;
	direction: PromotionDirection;
	resource: PromotionResource;
	detail?: PromotionResourceDetail;
	/** The files changed after the preview loaded, so the revisions differ. */
	stale?: boolean;
	shows: string[];
};

const revision = { before: 'b', after: 'a' };
const readOnly = (checked: boolean) => ({ checked, indeterminate: false, disabled: true });

const cases: Case[] = [
	{
		name: 'a renamed project with its old and new name',
		direction: 'promote',
		resource: resource({ key: 'project:p1', name: 'Billing', change: 'modified' }),
		detail: {
			key: 'project:p1',
			type: 'project',
			before: { id: 'p1', name: 'Invoicing' },
			after: { id: 'p1', name: 'Billing' },
			revision,
		},
		shows: ['Before', 'Invoicing', 'After', 'Billing'],
	},
	{
		name: 'only the move of a folder, which stops Apply',
		direction: 'apply',
		resource: resource({
			key: 'folder:f3',
			name: 'Archive',
			parentKey: 'folder:f2',
			previousParentKey: 'folder:f1',
			change: 'modified',
		}),
		detail: {
			key: 'folder:f3',
			type: 'folder',
			before: { id: 'f3', name: 'Archive', parentFolderId: 'f1' },
			after: { id: 'f3', name: 'Old invoices', parentFolderId: 'f2' },
			revision,
		},
		shows: [
			'Location',
			'Payments',
			'Reports',
			"Apply can't move a folder that already exists on this instance",
		],
	},
	{
		name: 'that Apply renames a tag in other projects too',
		direction: 'apply',
		resource: resource({
			key: 'tag:g1',
			name: 'finance',
			previousName: 'fin',
			change: 'modified',
		}),
		detail: {
			key: 'tag:g1',
			type: 'tag',
			before: { id: 'g1', name: 'fin' },
			after: { id: 'g1', name: 'finance' },
			revision,
		},
		shows: [
			'Renamed',
			'fin',
			'finance',
			'All projects on this instance share tags, so Apply also renames this tag in other projects.',
		],
	},
	{
		name: 'that Apply links a local tag with the same name to the branch tag',
		direction: 'apply',
		resource: resource({ key: 'tag:g1', name: 'finance', previousId: 'local', change: 'modified' }),
		detail: {
			key: 'tag:g1',
			type: 'tag',
			before: { id: 'local', name: 'finance' },
			after: { id: 'g1', name: 'finance' },
			revision,
		},
		shows: ['Linked', 'Apply links it to the tag on the branch. The name stays the same.'],
	},
	{
		name: 'the exported expressions of a new credential',
		direction: 'promote',
		resource: resource({ key: 'credential:c3', name: 'Slack', change: 'added' }),
		detail: {
			key: 'credential:c3',
			type: 'credential',
			before: null,
			after: { id: 'c3', name: 'Slack', type: 'slackApi', data: { token: '={{ $env.SLACK }}' } },
			revision: { before: null, after: 'a' },
		},
		shows: ['Not on the branch', 'Exported expressions', '$env.SLACK', 'slackApi'],
	},
	{
		name: 'that variable values are hidden from the user',
		direction: 'promote',
		resource: billingResources.apiUrl,
		detail: {
			key: 'variable:global:API_URL',
			type: 'variable',
			before: null,
			after: { name: 'API_URL', type: 'string' },
			revision: { before: null, after: 'a' },
			valueHidden: true,
		},
		shows: ['Global', "You don't have permission to see variable values."],
	},
	{
		name: 'the column changes of a data table',
		direction: 'apply',
		resource: billingResources.invoicesTable,
		detail: {
			key: 'dataTable:t1',
			type: 'dataTable',
			before: null,
			after: null,
			revision,
			dataTableChanges: [
				{ kind: 'remove-column', column: 'notes', type: 'string', destructive: true },
				{ kind: 'rename-column', from: 'amount', to: 'total', destructive: false },
			],
		},
		shows: ['Removes column notes and its values', 'Renames column amount to total'],
	},
	{
		name: 'that a file in an unknown format cannot be shown',
		direction: 'apply',
		resource: resource({ key: 'tag:g2', name: 'ops', change: 'added' }),
		detail: {
			key: 'tag:g2',
			type: 'tag',
			before: null,
			after: null,
			revision: { before: null, after: 'invalid' },
		},
		shows: ['The file in the Git branch has an unexpected format.'],
	},
	{
		name: 'that an unchanged dependency stays as it is',
		direction: 'apply',
		resource: billingResources.stripe,
		shows: ['No changes. The operation keeps this resource as it is.'],
	},
	{
		name: 'that the content changed after the preview loaded',
		direction: 'promote',
		resource: resource({ key: 'tag:g1', name: 'finance', change: 'modified' }),
		detail: {
			key: 'tag:g1',
			type: 'tag',
			before: { id: 'g1', name: 'fin' },
			after: { id: 'g1', name: 'finance' },
			revision,
		},
		stale: true,
		shows: ['This resource changed after the preview loaded.'],
	},
];

describe('PromotionChangeCard', () => {
	it.each(cases)('should show $name', ({ direction, resource: card, detail, stale, shows }) => {
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia(),
			props: {
				resource: detail && !stale ? { ...card, revision: detail.revision } : card,
				graph: buildSelectionGraph(billingPreview(), 'promote'),
				direction,
				entry: detail ? { status: 'loaded', detail } : undefined,
				selection: readOnly(false),
				inspected: false,
			},
		});

		for (const text of shows) {
			expect(getByTestId('promotion-preview-card')).toHaveTextContent(text);
		}
	});

	it('should describe a column removal on Promote without a loss of values', () => {
		const { getAllByTestId } = renderComponent({
			pinia: createTestingPinia(),
			props: {
				resource: { ...billingResources.invoicesTable, revision },
				graph: buildSelectionGraph(billingPreview(), 'promote'),
				direction: 'promote',
				entry: {
					status: 'loaded',
					detail: {
						key: 'dataTable:t1',
						type: 'dataTable',
						before: null,
						after: null,
						revision,
						dataTableChanges: [
							{ kind: 'remove-column', column: 'notes', type: 'string', destructive: true },
						],
					},
				},
				selection: readOnly(false),
				inspected: false,
			},
		});

		// Promote changes the branch only. The values go only when the branch is applied.
		expect(getAllByTestId('promotion-preview-data-table-change')[0]).toHaveTextContent(
			/^Removes column notes$/,
		);
	});

	it('should collapse a card from its header and open it again when the tree inspects it', async () => {
		const { getByTestId, findByText, rerender } = renderComponent({
			pinia: createTestingPinia(),
			props: {
				resource: billingResources.stripe,
				graph: buildSelectionGraph(billingPreview(), 'promote'),
				direction: 'apply',
				selection: readOnly(false),
				inspected: false,
			},
		});
		const toggle = getByTestId('promotion-preview-card-toggle');

		await userEvent.click(toggle);
		expect(toggle).toHaveAttribute('aria-expanded', 'false');

		await rerender({ inspected: true });
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(await findByText(/No changes\./)).toBeInTheDocument();
	});

	it('should show in the header whether the operation includes a dependency, and which workflows use it', () => {
		const props = {
			resource: billingResources.stripe,
			graph: buildSelectionGraph(billingPreview(), 'promote'),
			direction: 'promote' as const,
			selection: readOnly(false),
			inspected: false,
		};
		const included = renderComponent({
			pinia: createTestingPinia(),
			props: { ...props, selection: readOnly(true) },
		});
		const checkbox = included.getByTestId('promotion-preview-card-checkbox');
		expect(checkbox).toBeChecked();
		expect(checkbox).toBeDisabled();
		expect(included.getByTestId('promotion-preview-card-inclusion')).toHaveTextContent(
			'Used by Invoice reconciliation',
		);

		included.unmount();
		const notIncluded = renderComponent({ pinia: createTestingPinia(), props });
		expect(notIncluded.getByTestId('promotion-preview-card-checkbox')).not.toBeChecked();
	});

	it('should say that Apply needs a credential that this instance does not have, instead of creating it', () => {
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia(),
			props: {
				resource: { ...billingResources.stripe, change: 'added' },
				graph: buildSelectionGraph(billingPreview(), 'apply'),
				direction: 'apply',
				selection: readOnly(false),
				inspected: false,
				blockers: [
					{ kind: 'missing', resourceKey: 'credential:c1', workflowKeys: ['workflow:w1'] },
				],
			},
		});

		expect(getByTestId('promotion-preview-card-toggle')).toHaveTextContent('Not on this instance');
		const blocker = getByTestId('promotion-preview-card-blocker');
		expect(blocker).not.toHaveTextContent('Blocker');
		expect(blocker).toHaveAttribute(
			'aria-label',
			expect.stringContaining(
				"This credential isn't on this instance, and 1 workflow depends on it.",
			),
		);
	});
});
