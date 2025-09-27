import type { GenericValue, IDataObject, INodeProperties } from 'n8n-workflow';

import type { IDependency } from '@/public-api/types';

import { toJsonSchema } from '../credentials.service';

describe('CredentialsService', () => {
	describe('toJsonSchema', () => {
		it('should add "false" displayOptions.show dependant value as allof condition', () => {
			const properties: INodeProperties[] = [
				{ name: 'field1', type: 'string', required: true, displayName: 'Field 1', default: '' },
				{
					name: 'field2',
					type: 'options',
					required: true,
					options: [
						{ value: 'opt1', name: 'opt1' },
						{ value: 'opt2', name: 'opt2' },
					],
					displayName: 'Field 2',
					default: 'opt1',
				},
				{
					name: 'field3',
					type: 'string',
					displayName: 'Field 3',
					default: '',
					displayOptions: {
						show: {
							field2: [false], // boolean false as dependant value
						},
					},
				},
			];

			const schema = toJsonSchema(properties);

			// Cast properties as IDataObject
			const props = schema.properties as IDataObject;

			expect(props).toBeDefined();
			expect(props.field1).toEqual({ type: 'string' });
			expect(props.field2).toEqual({
				type: 'string',
				enum: ['opt1', 'opt2'],
			});
			expect(props.field3).toEqual({ type: 'string' });

			// field1 and field2 required globally, field3 required conditionally
			expect(schema.required).toEqual(expect.arrayContaining(['field1', 'field2']));
			expect(schema.required).not.toContain('field3');

			const allOf = schema.allOf as GenericValue[] | IDataObject[];
			expect(Array.isArray(allOf)).toBe(true);
			expect(allOf?.length).toBeGreaterThan(0);

			const condition = allOf?.find((cond) => (cond as any).if?.properties?.field2) as IDependency;
			expect(condition).toBeDefined();
			expect((condition.if?.properties as any).field2).toEqual({
				enum: [false], // boolean false as dependant value
			});

			// then block requires field3 when field2 === false
			expect(condition.then?.allOf.some((req: any) => req.required?.includes('field3'))).toBe(true);
			// else block forbids field3 when field2 !== false
			expect(
				condition.else?.allOf.some((notReq: any) => notReq.not?.required?.includes('field3')),
			).toBe(true);
		});

		it('should handle multiple properties with different displayOptions.show values for the same dependent field', () => {
			// This test case replicates the Grist API credentials scenario
			const properties: INodeProperties[] = [
				{ name: 'apiKey', type: 'string', required: true, displayName: 'API Key', default: '' },
				{
					name: 'planType',
					type: 'options',
					required: false,
					options: [
						{ value: 'free', name: 'Free' },
						{ value: 'paid', name: 'Paid' },
						{ value: 'selfHosted', name: 'Self-Hosted' },
					],
					displayName: 'Plan Type',
					default: 'free',
				},
				{
					name: 'customSubdomain',
					type: 'string',
					displayName: 'Custom Subdomain',
					default: '',
					required: true,
					displayOptions: {
						show: {
							planType: ['paid'],
						},
					},
				},
				{
					name: 'selfHostedUrl',
					type: 'string',
					displayName: 'Self-Hosted URL',
					default: '',
					required: true,
					displayOptions: {
						show: {
							planType: ['selfHosted'],
						},
					},
				},
			];

			const schema = toJsonSchema(properties);

			// Cast properties as IDataObject
			const props = schema.properties as IDataObject;

			expect(props).toBeDefined();
			expect(props.apiKey).toEqual({ type: 'string' });
			expect(props.planType).toEqual({
				type: 'string',
				enum: ['free', 'paid', 'selfHosted'],
			});
			expect(props.customSubdomain).toEqual({ type: 'string' });
			expect(props.selfHostedUrl).toEqual({ type: 'string' });

			// Only apiKey should be globally required
			expect(schema.required).toEqual(['apiKey']);

			const allOf = schema.allOf as GenericValue[] | IDataObject[];
			expect(Array.isArray(allOf)).toBe(true);
			expect(allOf?.length).toBe(2); // Two separate conditions

			// Find the condition for planType === 'paid'
			const paidCondition = allOf?.find((cond) => {
				const condition = cond as any;
				return condition.if?.properties?.planType?.enum?.[0] === 'paid';
			}) as IDependency;
			expect(paidCondition).toBeDefined();
			expect(paidCondition.then?.allOf).toEqual([{ required: ['customSubdomain'] }]);
			expect(paidCondition.else?.allOf).toEqual([{ not: { required: ['customSubdomain'] } }]);

			// Find the condition for planType === 'selfHosted'
			const selfHostedCondition = allOf?.find((cond) => {
				const condition = cond as any;
				return condition.if?.properties?.planType?.enum?.[0] === 'selfHosted';
			}) as IDependency;
			expect(selfHostedCondition).toBeDefined();
			expect(selfHostedCondition.then?.allOf).toEqual([{ required: ['selfHostedUrl'] }]);
			expect(selfHostedCondition.else?.allOf).toEqual([{ not: { required: ['selfHostedUrl'] } }]);
		});
	});
});
