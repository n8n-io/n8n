import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { makeResolverFromLegacyOptions, NodeVM } from 'vm2';

import { addPostExecutionWarning, generateScript, resolveExternalModule } from '../utils';

it('should resolve external modules outside the process working directory', async () => {
	const originalCwd = process.cwd();
	const isolatedCwd = mkdtempSync(join(tmpdir(), 'n8n-code-node-'));

	try {
		process.chdir(isolatedCwd);

		const resolver = makeResolverFromLegacyOptions({
			external: { modules: ['lodash'], transitive: false },
			builtin: [],
			resolve: resolveExternalModule,
		});
		const vm = new NodeVM({ require: resolver });

		await expect(vm.run(generateScript("return typeof require('lodash').chunk"))).resolves.toBe(
			'function',
		);
	} finally {
		process.chdir(originalCwd);
		rmSync(isolatedCwd, { recursive: true, force: true });
	}
});

describe('addPostExecutionWarning', () => {
	const context = mock<IExecuteFunctions>();
	const inputItemsLength = 2;

	beforeEach(() => jest.resetAllMocks());

	it('should add execution hints when returnData length differs from inputItemsLength', () => {
		const returnData: INodeExecutionData[] = [{ json: {}, pairedItem: 0 }];

		addPostExecutionWarning(context, returnData, inputItemsLength);

		expect(context.addExecutionHints).toHaveBeenCalledWith({
			message:
				'To make sure expressions after this node work, return the input items that produced each output item. <a target="_blank" href="https://docs.n8n.io/data/data-mapping/data-item-linking/item-linking-code-node/">More info</a>',
			location: 'outputPane',
		});
	});

	it('should add execution hints when any item has undefined pairedItem', () => {
		const returnData: INodeExecutionData[] = [{ json: {}, pairedItem: 0 }, { json: {} }];

		addPostExecutionWarning(context, returnData, inputItemsLength);

		expect(context.addExecutionHints).toHaveBeenCalledWith({
			message:
				'To make sure expressions after this node work, return the input items that produced each output item. <a target="_blank" href="https://docs.n8n.io/data/data-mapping/data-item-linking/item-linking-code-node/">More info</a>',
			location: 'outputPane',
		});
	});

	it('should not add execution hints when all items match inputItemsLength and have defined pairedItem', () => {
		const returnData: INodeExecutionData[] = [
			{ json: {}, pairedItem: 0 },
			{ json: {}, pairedItem: 1 },
		];

		addPostExecutionWarning(context, returnData, inputItemsLength);

		expect(context.addExecutionHints).not.toHaveBeenCalled();
	});
});
