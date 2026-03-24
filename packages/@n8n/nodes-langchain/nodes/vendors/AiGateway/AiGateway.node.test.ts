/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { AiGateway } from './AiGateway.node';

describe('AiGateway (app node)', () => {
	let node: AiGateway;

	beforeEach(() => {
		node = new AiGateway();
	});

	it('should not declare any credentials', () => {
		expect(node.description.credentials).toBeUndefined();
	});

	it('should use the model selector with dependency on resource and operation', () => {
		const modelProps = node.description.properties.filter(
			(p) => p?.typeOptions && 'isModelSelector' in (p.typeOptions ?? {}),
		);
		expect(modelProps.length).toBeGreaterThan(0);
		for (const prop of modelProps) {
			expect(prop?.typeOptions).toEqual(
				expect.objectContaining({
					isModelSelector: true,
					loadOptionsMethod: 'getModels',
					loadOptionsDependsOn: ['resource', 'operation'],
				}),
			);
		}
	});

	it('should expose loadOptions.getModels', () => {
		expect(node.methods.loadOptions).toEqual(
			expect.objectContaining({
				getModels: expect.any(Function),
			}),
		);
	});
});
