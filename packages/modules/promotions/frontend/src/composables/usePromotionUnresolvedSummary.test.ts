import type { PromotionMissingDependency } from '@n8n/api-types';
import { ref } from 'vue';

import {
	archivedWorkflow,
	otherProjectCredential,
	outsideAccessWorkflow,
	personalCredential,
	usedBy,
} from '../__tests__/missingDependencies.fixtures';
import { usePromotionUnresolvedSummary } from './usePromotionUnresolvedSummary';

const reconciliation = { id: 'w1', name: 'Invoice reconciliation' };
const kpiReport = { id: 'w3', name: 'Weekly KPI report' };

const dependency = (
	name: string,
	...workflows: Array<{ id: string; name: string }>
): PromotionMissingDependency => ({
	...otherProjectCredential,
	id: name,
	name,
	consumers: workflows.length > 0 ? usedBy(...workflows) : [],
});

describe('usePromotionUnresolvedSummary', () => {
	it('names each workflow one time, with the dependencies that it misses', () => {
		// "Invoice reconciliation" uses two of the dependencies, and "Weekly KPI report" two.
		const { lead, rows } = usePromotionUnresolvedSummary(
			[otherProjectCredential, outsideAccessWorkflow, personalCredential],
			'promote',
		);

		expect(lead.value).toBe(
			"2 workflows can't be published because their dependencies can't be promoted.",
		);
		expect(rows.value).toEqual([
			{ key: 'w1', name: 'Invoice reconciliation', detail: 'Missing CRM key, Send audit log.' },
			{ key: 'w3', name: 'Weekly KPI report', detail: 'Missing Send audit log, Personal Gmail.' },
		]);
	});

	it.each([
		[
			'promote',
			"1 workflow can't be published because its dependency can't be promoted.",
			"2 workflows can't be published because their dependencies can't be promoted.",
		],
		[
			'apply',
			"1 workflow can't be published because its dependency doesn't exist here.",
			"2 workflows can't be published because their dependencies don't exist here.",
		],
	] as const)('counts the workflows in the sentence of a %s', (direction, singular, plural) => {
		expect(
			usePromotionUnresolvedSummary([dependency('CRM key', reconciliation)], direction).lead.value,
		).toBe(singular);
		expect(
			usePromotionUnresolvedSummary([dependency('CRM key', reconciliation, kpiReport)], direction)
				.lead.value,
		).toBe(plural);
	});

	it('names two dependencies of a workflow, and counts the others', () => {
		const names = ['Billing database', 'Normalize contact data', 'Finance Stripe key', 'ERP key'];
		const { rows } = usePromotionUnresolvedSummary(
			names.map((name) => dependency(name, reconciliation)),
			'apply',
		);

		expect(rows.value).toEqual([
			{
				key: 'w1',
				name: 'Invoice reconciliation',
				detail: 'Missing Billing database, Normalize contact data and 2 more.',
			},
		]);
	});

	it('names a dependency one time for a workflow, also when the dependency has two entries', () => {
		const { rows } = usePromotionUnresolvedSummary(
			[archivedWorkflow, { ...archivedWorkflow, reason: 'caller-policy' }],
			'apply',
		);

		expect(rows.value).toEqual([
			{ key: 'w1', name: 'Invoice reconciliation', detail: 'Missing Archive invoices.' },
		]);
	});

	it.each([
		['promote', '1 dependency is not promoted.', '2 dependencies are not promoted.'],
		['apply', '1 dependency is not applied.', '2 dependencies are not applied.'],
	] as const)(
		'counts and names the dependencies of a %s when no workflow uses them',
		(direction, singular, plural) => {
			const one = usePromotionUnresolvedSummary([dependency('CRM key')], direction);
			expect(one.lead.value).toBe(singular);
			expect(one.rows.value).toEqual([{ key: 'credential:CRM key', name: 'CRM key' }]);

			const two = usePromotionUnresolvedSummary(
				[dependency('CRM key'), dependency('ERP key')],
				direction,
			);
			expect(two.lead.value).toBe(plural);
			expect(two.rows.value.map(({ name }) => name)).toEqual(['CRM key', 'ERP key']);
		},
	);

	it('follows a list that changes, so it names only the workflows of the current list', () => {
		const list = ref([dependency('CRM key', reconciliation, kpiReport)]);
		const { lead, rows } = usePromotionUnresolvedSummary(list, 'apply');
		expect(rows.value.map(({ name }) => name)).toEqual([
			'Invoice reconciliation',
			'Weekly KPI report',
		]);

		list.value = [dependency('CRM key', kpiReport)];

		expect(lead.value).toBe(
			"1 workflow can't be published because its dependency doesn't exist here.",
		);
		expect(rows.value.map(({ name }) => name)).toEqual(['Weekly KPI report']);
	});
});
