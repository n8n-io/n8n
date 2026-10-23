import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

const ruleId = '@n8n/community-nodes/operation-name-repeats-resource';
const linter = new Linter();

function createNodeCode(resources: string[], name: string): string {
	return `
export class TestNode extends Node {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['transform'],
		version: 1,
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: ${JSON.stringify(resources.map((resource) => ({ name: resource, value: resource })))},
				default: ${JSON.stringify(resources[0])},
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: { show: { resource: ${JSON.stringify(resources)} } },
				options: [{ name: ${JSON.stringify(name)}, value: 'testOperation' }],
				default: 'testOperation',
			},
		],
	};
}`;
}

describe.each(['recommended', 'recommendedWithoutN8nCloudSupport'] as const)(
	'%s operation names',
	(config) => {
		function lintNode(code: string) {
			const messages = linter.verify(code, [{ ...configs[config], files: ['**/*.node.ts'] }], {
				filename: 'src/rules/TestNode.node.ts',
			});

			expect(messages.filter(({ fatal }) => fatal)).toEqual([]);
			return messages.filter((message) => message.ruleId === ruleId);
		}

		// CE-3603: The editor shows the resource above the operation selector.
		it.each([
			{ resource: 'contact', name: 'Create Contact', verb: 'Create' },
			{ resource: 'contact', name: 'Delete a Contact', verb: 'Delete' },
			{ resource: 'contact', name: 'GET THE CONTACTS', verb: 'GET' },
			{ resource: 'status', name: 'Get Statuses', verb: 'Get' },
			{ resource: 'statuses', name: 'Get Status', verb: 'Get' },
			{ resource: 'box', name: 'Get Boxes', verb: 'Get' },
			{ resource: 'boxes', name: 'Get Box', verb: 'Get' },
			{ resource: 'case', name: 'Get Cases', verb: 'Get' },
			{ resource: 'cases', name: 'Get Case', verb: 'Get' },
			{ resource: 'contact', name: 'Create New Contact', verb: 'Create New' },
			{ resource: 'contact', name: 'Get All Contacts', verb: 'Get All' },
			{ resource: 'status', name: 'Get All the Statuses', verb: 'Get All' },
			{ resource: 'deliveryStatus', name: 'Get All Delivery Statuses', verb: 'Get All' },
			{ resource: 'directoryContext', name: 'Get Directory Context', verb: 'Get' },
			{ resource: 'httpRequest', name: 'Send HTTP Request', verb: 'Send' },
			{ resource: 'contact', name: 'Create Contact (Legacy)', verb: 'Create' },
			{ resource: 'contact', name: 'Create Contact [Legacy]', verb: 'Create' },
		])('reports "$name" under $resource', ({ resource, name, verb }) => {
			expect(lintNode(createNodeCode([resource], name))).toEqual([
				expect.objectContaining({
					ruleId,
					severity: 2,
					message:
						`The operation name "${name}" repeats the resource "${resource}", which the editor shows above it. ` +
						`Name only the action (for example "${verb}"). ` +
						'Name an object only when it is not the resource (for example "Get Columns" for a table).',
				}),
			]);
		});

		it.each([
			{ resource: 'contact', name: 'Contact' },
			{ resource: 'status', name: 'Statuses' },
		])('reports "$name" named only after $resource', ({ resource, name }) => {
			expect(lintNode(createNodeCode([resource], name))).toEqual([
				expect.objectContaining({ ruleId, severity: 2 }),
			]);
		});

		it.each([
			{ resources: ['contact'], name: 'Create' },
			{ resources: ['table'], name: 'Get Columns' },
			{ resources: ['payment'], name: 'Create Payment Link' },
			{ resources: ['contact'], name: 'Get Contact Status' },
			{ resources: ['status'], name: 'Get All Status Reports' },
			{ resources: ['box'], name: 'Get Inboxes' },
			{ resources: ['directoryContext'], name: 'Get Context' },
			{ resources: ['contact', 'company'], name: 'Create Contact' },
		])('accepts "$name" under $resources', ({ resources, name }) => {
			expect(lintNode(createNodeCode(resources, name))).toEqual([]);
		});

		it('does not inspect classes that are not nodes', () => {
			const code = createNodeCode(['contact'], 'Create Contact').replace('extends Node', '');

			expect(lintNode(code)).toEqual([]);
		});
	},
);
