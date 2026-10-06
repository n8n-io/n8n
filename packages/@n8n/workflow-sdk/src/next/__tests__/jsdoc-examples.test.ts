// The `@example` blocks of the `next` JSDoc, in workflows that tsc checks. Keep both in step.
import {
	contractTool,
	fromModel,
	group,
	loop,
	manual,
	merge,
	node,
	paginate,
	pollUntil,
	recover,
	route,
	set,
	steps,
	switchOn,
	when,
	workflow,
	type Step,
	type ToolConfig,
} from '../index';

interface Customer {
	id: string;
	name: string;
	orders: Array<{ id: string }>;
}

const getTool = (config: ToolConfig<{ url: string }>) =>
	contractTool<unknown, unknown>('n8n-nodes-base.httpRequestTool', config, 4);
const httpRequest = { getTool };

describe('next JSDoc examples', () => {
	it('build', () => {
		const fetchPage = node({
			name: 'Fetch',
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			sample: [{ next: 1 as number | null }],
		});
		const getStatus = set({ name: 'Status', fields: { done: true } });
		const fetchOrders = node({
			name: 'Orders',
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			parameters: { url: 'https://example.com/orders' },
		});
		const customers: Step<unknown, unknown, Customer, 'Customers'> = node({
			name: 'Customers',
			type: 'n8n-nodes-base.noOp',
			version: 1,
			sample: [{ id: 'c1', name: 'Ada', orders: [] }],
		});
		const built = [
			workflow(
				'When',
				manual(),
				set({ name: 'Order', fields: { total: 3, kind: 'bug' } }),
				when(
					{ name: 'Paid?', if: (order) => order.total > 0 },
					{
						then: set({ name: 'Paid', fields: { paid: true } }),
						else: set({ name: 'Free', fields: { paid: false } }),
					},
				),
			),
			workflow(
				'Route',
				manual(),
				route(
					node({
						name: 'Big?',
						type: 'n8n-nodes-base.if',
						version: 2.2,
						outputs: ['true', 'false'],
					}),
					{
						true: set({ name: 'Big', fields: { big: true } }),
					},
				),
			),
			workflow(
				'Switch',
				manual(),
				set({ name: 'Ticket', fields: { kind: 'bug' } }),
				switchOn(
					{ name: 'By kind', on: 'kind' },
					{
						bug: set({ name: 'Bug', fields: { urgent: true } }),
						fallback: set({ name: 'Other', fields: { urgent: false } }),
					},
				),
			),
			workflow(
				'Loop',
				manual(),
				set({ name: 'Init', fields: { n: 0 } }),
				loop(
					{
						name: 'Count',
						maxIterations: 10,
						until: (out) => out.n >= 3,
						next: (out) => ({ n: out.n }),
					},
					set({ name: 'Add', fields: { n: (s) => s.n + 1 } }),
				),
			),
			workflow(
				'Paginate',
				manual(),
				set({ name: 'Start', fields: { cursor: 0 } }),
				paginate(
					{
						name: 'Pages',
						maxPages: 10,
						next: (page) => (page.next === null ? null : { cursor: page.next }),
					},
					fetchPage,
				),
			),
			workflow(
				'Poll',
				manual(),
				pollUntil(
					{
						name: 'Poll',
						maxAttempts: 5,
						every: { amount: 30, unit: 'seconds' },
						until: (job) => job.done,
					},
					getStatus,
				),
			),
			workflow(
				'Merge',
				manual(),
				customers,
				merge({ name: 'Join', join: { left: 'id', right: 'id' } }, [
					set({ name: 'Names', fields: { id: (c) => c.id, name: (c) => c.name } }),
					set({ name: 'Counts', fields: { id: (c) => c.id, count: (c) => c.orders.length } }),
				]),
			),
			workflow(
				'Recover',
				manual(),
				fetchOrders,
				recover(set({ name: 'Log', fields: { failed: (item) => item.error } })),
			),
			workflow(
				'Group',
				manual(),
				customers,
				group(
					{ name: 'Enrich', description: 'Looks up each lead and scores it' },
					steps(
						set({ name: 'Look up', fields: { id: (c) => c.id } }),
						set({ name: 'Score', fields: { score: 1 } }),
					),
				),
				group('Notify', set({ name: 'Mail', fields: { score: (s) => s.score } })),
			),
			workflow(
				'Tool',
				manual(),
				node({
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					version: 2,
					providers: {
						tools: [httpRequest.getTool({ name: 'Fetch', url: fromModel('The page URL') })],
					},
				}),
			),
		];
		expect(built.map((part) => part.toJSON().name)).toEqual([
			'When',
			'Route',
			'Switch',
			'Loop',
			'Paginate',
			'Poll',
			'Merge',
			'Recover',
			'Group',
			'Tool',
		]);
	});
});
