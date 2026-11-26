import { resolveNodeAnnotations } from 'n8n-workflow';
import type { INodeParameters, NodeOperationAnnotations } from 'n8n-workflow';

import { Agent } from '../Agent.node';

const DEFAULT_ANNOTATIONS: NodeOperationAnnotations = {
	effect: 'write',
	destructive: true,
	idempotent: false,
};

describe('Agent, annotations', () => {
	const agent = new Agent();

	describe.each([1, 1.1, 1.2, 1.3, 1.4, 1.5])('v%s', (typeVersion) => {
		const { description } = agent.getNodeType(typeVersion);

		it.each<INodeParameters>([
			{},
			{ agent: 'conversationalAgent' },
			{ agent: 'conversationalAgent', promptType: 'auto' },
			{ agent: 'conversationalAgent', promptType: 'guardrails' },
			{ agent: 'conversationalAgent', promptType: 'define' },
			{ agent: 'openAiFunctionsAgent' },
			{ agent: 'planAndExecuteAgent' },
			{ agent: 'reActAgent' },
			{ agent: 'sqlAgent' },
			{ agent: 'sqlAgent', dataSource: 'mysql' },
			{ agent: 'sqlAgent', dataSource: 'postgres' },
			{ agent: 'sqlAgent', dataSource: 'sqlite' },
			{ agent: 'sqlAgent', dataSource: 'postgres', promptType: 'define' },
		])('should keep the restrictive default for %j', (parameters) => {
			expect(resolveNodeAnnotations(description, { parameters, typeVersion })).toEqual(
				DEFAULT_ANNOTATIONS,
			);
		});
	});

	describe.each([1.6, 1.7])('v%s', (typeVersion) => {
		const { description } = agent.getNodeType(typeVersion);

		it.each<INodeParameters>([
			{},
			{ agent: 'toolsAgent' },
			{ agent: 'toolsAgent', promptType: 'auto' },
			{ agent: 'toolsAgent', promptType: 'guardrails' },
			{ agent: 'toolsAgent', promptType: 'define' },
			{ agent: 'conversationalAgent' },
			{ agent: 'openAiFunctionsAgent' },
			{ agent: 'planAndExecuteAgent' },
			{ agent: 'reActAgent' },
			{ agent: 'sqlAgent' },
			{ agent: 'sqlAgent', dataSource: 'mysql' },
			{ agent: 'sqlAgent', dataSource: 'postgres' },
			{ agent: 'sqlAgent', dataSource: 'sqlite' },
			{ agent: 'sqlAgent', dataSource: 'postgres', promptType: 'define' },
		])('should keep the restrictive default for %j', (parameters) => {
			expect(resolveNodeAnnotations(description, { parameters, typeVersion })).toEqual(
				DEFAULT_ANNOTATIONS,
			);
		});
	});

	describe.each([1.8, 1.9])('v%s', (typeVersion) => {
		const { description } = agent.getNodeType(typeVersion);

		it.each<INodeParameters>([
			{},
			{ promptType: 'auto' },
			{ promptType: 'guardrails' },
			{ promptType: 'define' },
		])('should keep the restrictive default for %j', (parameters) => {
			expect(resolveNodeAnnotations(description, { parameters, typeVersion })).toEqual(
				DEFAULT_ANNOTATIONS,
			);
		});
	});

	describe.each([2, 2.1, 2.2, 2.3])('v%s', (typeVersion) => {
		const { description } = agent.getNodeType(typeVersion);

		it.each<INodeParameters>([
			{},
			{ promptType: 'auto' },
			{ promptType: 'guardrails' },
			{ promptType: 'define' },
		])('should keep the restrictive default for %j', (parameters) => {
			expect(resolveNodeAnnotations(description, { parameters, typeVersion })).toEqual(
				DEFAULT_ANNOTATIONS,
			);
		});
	});

	describe('v3', () => {
		const { description } = agent.getNodeType(3);

		it.each<INodeParameters>([
			{},
			{ promptType: 'auto' },
			{ promptType: 'guardrails' },
			{ promptType: 'define' },
		])('should keep the restrictive default for %j', (parameters) => {
			expect(resolveNodeAnnotations(description, { parameters, typeVersion: 3 })).toEqual(
				DEFAULT_ANNOTATIONS,
			);
		});
	});

	describe('v3.1', () => {
		const { description } = agent.getNodeType(3.1);

		it.each<INodeParameters>([{}, { promptType: 'auto' }, { promptType: 'define' }])(
			'should keep the restrictive default for %j',
			(parameters) => {
				expect(resolveNodeAnnotations(description, { parameters, typeVersion: 3.1 })).toEqual(
					DEFAULT_ANNOTATIONS,
				);
			},
		);
	});
});
