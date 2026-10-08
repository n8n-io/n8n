import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext, RestrictedNodeSummary } from '../../../types';
import { findRestrictedNodeBlockers } from '../restricted-node-blockers';

const gmailTrigger: RestrictedNodeSummary = {
	name: 'n8n-nodes-base.gmailTrigger',
	displayName: 'Gmail Trigger',
	scope: 'instance',
};

const node = (name: string, type: string) =>
	({ id: name, name, type, typeVersion: 1, position: [0, 0], parameters: {} }) as never;

const workflow = (...nodes: Array<ReturnType<typeof node>>): WorkflowJSON =>
	({ name: 'W', nodes, connections: {} }) as WorkflowJSON;

function contextWith(listRestricted?: () => Promise<RestrictedNodeSummary[]>) {
	return { nodeService: { listRestricted } } as unknown as InstanceAiContext;
}

describe('findRestrictedNodeBlockers', () => {
	it('flags each node whose type a policy restricts', async () => {
		const result = await findRestrictedNodeBlockers(
			contextWith(async () => await Promise.resolve([gmailTrigger])),
			workflow(
				node('Gmail Trigger', gmailTrigger.name),
				node('Slack', 'n8n-nodes-base.slack'),
				node('Second Gmail', gmailTrigger.name),
			),
			undefined,
		);

		expect(result.blocking).toEqual([
			expect.objectContaining({
				code: 'node_type_restricted',
				nodeName: 'Gmail Trigger',
				severity: 'error',
				message: 'Gmail Trigger (n8n-nodes-base.gmailTrigger) is restricted by an instance policy.',
			}),
			expect.objectContaining({ nodeName: 'Second Gmail' }),
		]);
		expect(result.restricted).toEqual([gmailTrigger]);
	});

	it("names the project when the project's policy restricts the type", async () => {
		const result = await findRestrictedNodeBlockers(
			contextWith(
				async () => await Promise.resolve([{ ...gmailTrigger, scope: 'project' as const }]),
			),
			workflow(node('Gmail Trigger', gmailTrigger.name)),
			undefined,
		);

		expect(result.blocking[0].message).toContain("this project's policy");
	});

	it('lets a type the saved workflow already has pass', async () => {
		const result = await findRestrictedNodeBlockers(
			contextWith(async () => await Promise.resolve([gmailTrigger])),
			workflow(node('Gmail Trigger', gmailTrigger.name)),
			workflow(node('Old name', gmailTrigger.name)),
		);

		expect(result).toEqual({ blocking: [], restricted: [] });
	});

	it('finds nothing when no type is restricted', async () => {
		const result = await findRestrictedNodeBlockers(
			contextWith(async () => await Promise.resolve([])),
			workflow(node('Gmail Trigger', gmailTrigger.name)),
			undefined,
		);

		expect(result).toEqual({ blocking: [], restricted: [] });
	});

	it('finds nothing when the host cannot list restrictions', async () => {
		const workflowJson = workflow(node('Gmail Trigger', gmailTrigger.name));

		expect(
			await findRestrictedNodeBlockers(contextWith(undefined), workflowJson, undefined),
		).toEqual({ blocking: [], restricted: [] });
		expect(
			await findRestrictedNodeBlockers(
				contextWith(async () => await Promise.reject(new Error('policy down'))),
				workflowJson,
				undefined,
			),
		).toEqual({ blocking: [], restricted: [] });
	});
});
