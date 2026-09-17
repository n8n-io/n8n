import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { INodeType, IPollFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { Databricks } from '../Databricks.node';
import { DatabricksTrigger } from '../DatabricksTrigger.node';

const authenticationProperty = (node: INodeType) =>
	node.description.properties.find((property) => property.name === 'authentication');

describe('DatabricksTrigger', () => {
	const trigger = new DatabricksTrigger();
	const action = new Databricks();

	it('should ship hidden as a polling trigger', () => {
		expect(trigger.description).toMatchObject({
			displayName: 'Databricks Trigger',
			name: 'databricksTrigger',
			group: ['trigger'],
			version: 1,
			hidden: true,
			polling: true,
			inputs: [],
			outputs: ['main'],
		});
	});

	it('should gate each credential on its authentication option', () => {
		expect(trigger.description.credentials).toEqual([
			{
				name: 'databricksApi',
				required: true,
				displayOptions: { show: { authentication: ['accessToken'] } },
			},
			{
				name: 'databricksOAuth2Api',
				required: true,
				displayOptions: { show: { authentication: ['oAuth2'] } },
			},
		]);
		expect(authenticationProperty(trigger)).toMatchObject({
			type: 'options',
			default: 'accessToken',
			options: [{ value: 'accessToken' }, { value: 'oAuth2' }],
		});
	});

	it('should share the authentication selector and credentials with the action node', () => {
		expect(trigger.description.credentials).toBe(action.description.credentials);
		expect(authenticationProperty(trigger)).toBe(authenticationProperty(action));
	});

	it('should ship both icon files next to the node', () => {
		expect(trigger.description.icon).toEqual({
			light: 'file:databricks.svg',
			dark: 'file:databricks.dark.svg',
		});
		for (const file of ['databricks.svg', 'databricks.dark.svg']) {
			expect(existsSync(resolve(__dirname, '..', file))).toBe(true);
		}
	});

	it('should be registered in the package manifest', () => {
		const manifest = JSON.parse(
			readFileSync(resolve(__dirname, '../../../package.json'), 'utf8'),
		) as { n8n: { nodes: string[] } };

		expect(manifest.n8n.nodes).toContain('dist/nodes/Databricks/DatabricksTrigger.node.js');
	});

	it('should emit nothing when polled', async () => {
		await expect(trigger.poll.call(mockDeep<IPollFunctions>())).resolves.toBeNull();
	});
});
