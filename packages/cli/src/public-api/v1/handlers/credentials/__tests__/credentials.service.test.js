'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const credentials_service_1 = require('../credentials.service');
describe('CredentialsService', () => {
	describe('toJsonSchema', () => {
		it('should add "false" displayOptions.show dependant value as allof condition', () => {
			const properties = [
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
							field2: [false],
						},
					},
				},
			];
			const schema = (0, credentials_service_1.toJsonSchema)(properties);
			const props = schema.properties;
			expect(props).toBeDefined();
			expect(props.field1).toEqual({ type: 'string' });
			expect(props.field2).toEqual({
				type: 'string',
				enum: ['opt1', 'opt2'],
			});
			expect(props.field3).toEqual({ type: 'string' });
			expect(schema.required).toEqual(expect.arrayContaining(['field1', 'field2']));
			expect(schema.required).not.toContain('field3');
			const allOf = schema.allOf;
			expect(Array.isArray(allOf)).toBe(true);
			expect(allOf?.length).toBeGreaterThan(0);
			const condition = allOf?.find((cond) => cond.if?.properties?.field2);
			expect(condition).toBeDefined();
			expect((condition.if?.properties).field2).toEqual({
				enum: [false],
			});
			expect(condition.then?.allOf.some((req) => req.required?.includes('field3'))).toBe(true);
			expect(condition.else?.allOf.some((notReq) => notReq.not?.required?.includes('field3'))).toBe(
				true,
			);
		});
	});
});
//# sourceMappingURL=credentials.service.test.js.map
