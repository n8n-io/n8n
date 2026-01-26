import type { INodeParameters } from 'n8n-workflow';

import { containsExpression, nodeParametersContainExpression } from './expressions';

describe('containsExpression', () => {
	it('should return false for non-expression values', () => {
		expect(containsExpression('simple text')).toBe(false);
		expect(containsExpression('https://api.example.com')).toBe(false);
		expect(containsExpression(123)).toBe(false);
		expect(containsExpression(true)).toBe(false);
		expect(containsExpression(null)).toBe(false);
		expect(containsExpression(undefined)).toBe(false);
	});

	it('should return true for expressions with $(...) pattern', () => {
		expect(containsExpression("={{ $('Node1').first().json }}")).toBe(true);
		expect(containsExpression('={{ $("Previous Node").item.json.data }}')).toBe(true);
	});

	it('should return true for expressions with $variable pattern', () => {
		expect(containsExpression('={{ $json.customerId }}')).toBe(true);
		expect(containsExpression('={{ $input.all() }}')).toBe(true);
		expect(containsExpression('={{ $now }}')).toBe(true);
	});

	it('should return false for expressions without references', () => {
		expect(containsExpression('={{ 1 + 1 }}')).toBe(false);
		expect(containsExpression('={{ "static value" }}')).toBe(false);
	});
});

describe('nodeParametersContainExpression', () => {
	it('should return false for parameters without expressions', () => {
		const params: INodeParameters = {
			toolDescription: 'Specialized agent for gathering comprehensive research information',
			text: 'You are a Research Agent specialized in gathering information',
			options: {},
		};

		expect(nodeParametersContainExpression(params)).toBe(false);
	});

	it('should return false for parameters with only static values', () => {
		const params: INodeParameters = {
			url: 'https://api.duckduckgo.com/',
			options: {},
		};

		expect(nodeParametersContainExpression(params)).toBe(false);
	});

	it('should return true when top-level parameter contains expression', () => {
		const params: INodeParameters = {
			url: '={{ $("Workflow Configuration").first().json.apiUrl }}',
			options: {},
		};

		expect(nodeParametersContainExpression(params)).toBe(true);
	});

	it('should return true when nested object parameter contains expression', () => {
		const params: INodeParameters = {
			method: 'POST',
			url: 'https://api.example.com',
			options: {
				timeout: 30000,
				customBody: '={{ $json.customerId }}',
			},
		};

		expect(nodeParametersContainExpression(params)).toBe(true);
	});

	it('should return true when array parameter contains expression', () => {
		const params: INodeParameters = {
			method: 'POST',
			headerParameters: {
				parameters: [
					{
						name: 'Content-Type',
						value: 'application/json',
					},
					{
						name: 'Authorization',
						value: '={{ $json.token }}',
					},
				],
			},
		};

		expect(nodeParametersContainExpression(params)).toBe(true);
	});

	it('should return false for deeply nested structure without expressions', () => {
		const params: INodeParameters = {
			method: 'POST',
			url: 'https://api.example.com',
			headerParameters: {
				parameters: [
					{
						name: 'Content-Type',
						value: 'application/json',
					},
					{
						name: 'Authorization',
						value: 'Bearer STATIC_TOKEN',
					},
				],
			},
			options: {
				nested: {
					deeply: {
						value: 'static',
					},
				},
			},
		};

		expect(nodeParametersContainExpression(params)).toBe(false);
	});

	it('should handle empty parameters', () => {
		expect(nodeParametersContainExpression({})).toBe(false);
	});

	it('should handle parameters with empty arrays', () => {
		const params: INodeParameters = {
			items: [],
			options: {},
		};

		expect(nodeParametersContainExpression(params)).toBe(false);
	});

	it('should detect expressions in array of primitive values', () => {
		const params: INodeParameters = {
			values: ['static1', '={{ $json.value }}', 'static2'],
		};

		expect(nodeParametersContainExpression(params)).toBe(true);
	});
});
