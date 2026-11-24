import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GymAdmin } from '../gym-admin';
import type { McpCaller } from '../mcp-upstream';
import { PlanHydrator } from '../plan-hydrator';

class StubGymAdmin extends GymAdmin {
	readonly seeds: unknown[] = [];

	constructor(private readonly onSeed: (overlay: unknown) => unknown) {
		super('http://127.0.0.1:1');
	}

	override async seed(_tenant: string, overlay: unknown): Promise<unknown> {
		this.seeds.push(overlay);
		return this.onSeed(overlay);
	}

	override async event(): Promise<void> {}
}

describe('PlanHydrator', () => {
	beforeEach(() => {
		Container.set(Logger, mock<Logger>());
	});

	it('records an accepted overlay before retrying on an ignored-field warning', async () => {
		let seedCall = 0;
		const admin = new StubGymAdmin(() => {
			seedCall++;
			return seedCall === 1
				? {
						report: {
							warnings: [{ path: 'native.linear.issues[0].bogus', message: 'unknown field' }],
						},
					}
				: { report: { warnings: [] } };
		});
		const llm = vi
			.fn()
			.mockResolvedValueOnce(
				JSON.stringify({
					reads: [],
					overlay: {
						world_version: 1,
						native: {
							linear: {
								issues: [
									{
										id: '33333333-3333-4333-8333-333333333333',
										ref: 'issue:1',
										title: 'Bug',
										bogus: 1,
									},
								],
							},
						},
					},
					events: [],
				}),
			)
			.mockResolvedValueOnce(
				JSON.stringify({
					reads: [],
					overlay: {
						world_version: 1,
						native: {
							linear: {
								issues: [
									{ id: '33333333-3333-4333-8333-333333333333', ref: 'issue:1', title: 'Bug' },
								],
							},
						},
					},
					events: [],
				}),
			);
		const gym: McpCaller = {
			listTools: async () => [{ name: 'get_issue', inputSchema: { type: 'object' } }],
			callTool: async () => ({
				content: [{ type: 'text', text: JSON.stringify({ id: 'FIN-412', title: 'Bug' }) }],
			}),
		};
		const upstream: McpCaller = {
			listTools: async () => [],
			callTool: async () => ({ content: [{ type: 'text', text: '{}' }] }),
		};

		const hydrator = new PlanHydrator({
			admin,
			tenant: 'tenant-1',
			upstream,
			gym,
			readTools: new Set(['get_issue']),
			instructions: 'test',
			llm,
		});

		await hydrator.hydrate(
			'get_issue',
			{ id: 'FIN-412' },
			{
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							id: '33333333-3333-4333-8333-333333333333',
							key: 'FIN-412',
							title: 'Bug',
						}),
					},
				],
			},
		);

		// The first seed succeeded with a warning; the repair pass deduped the already-recorded issue
		// so the gym was not asked to seed the same id a second time.
		expect(llm).toHaveBeenCalledTimes(2);
		expect(admin.seeds).toHaveLength(1);
	});

	it('does not treat issue-key prefixes as shown in list results', async () => {
		const admin = new StubGymAdmin(() => ({ report: { warnings: [] } }));
		const llm = vi.fn().mockResolvedValue(JSON.stringify({ reads: [], events: [] }));
		const gym: McpCaller = {
			listTools: async () => [{ name: 'list_issues', inputSchema: { type: 'object' } }],
			callTool: async () => ({
				content: [{ type: 'text', text: JSON.stringify({ items: [{ key: 'FIN-999' }] }) }],
			}),
		};
		const upstream: McpCaller = {
			listTools: async () => [],
			callTool: async () => ({ content: [{ type: 'text', text: '{}' }] }),
		};

		const hydrator = new PlanHydrator({
			admin,
			tenant: 'tenant-1',
			upstream,
			gym,
			readTools: new Set(['list_issues']),
			instructions: 'test',
			llm,
		});

		await hydrator.hydrate(
			'list_issues',
			{ query: 'FIN-412' },
			{
				content: [{ type: 'text', text: JSON.stringify({ items: [{ key: 'FIN-4120' }] }) }],
			},
		);

		// Real result only contains FIN-4120, not FIN-412, so FIN-412 is not required in the gym answer
		// and no repair turn is triggered.
		expect(llm).toHaveBeenCalledTimes(1);
	});
});
