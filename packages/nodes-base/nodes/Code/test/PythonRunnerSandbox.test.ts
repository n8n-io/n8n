import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { PythonSandbox } from '../PythonSandbox';
import { SandboxContext } from '../Sandbox';

describe('PythonSandbox', () => {
	describe('runCodeForAlltems', () => {
		it('should not throw error if input json contains null value', async () => {
			const pythonCode = `
print(_input.all())
return _input.all()[0]
			`;
			const executeFunctions = mock<IExecuteFunctions['helpers']>();
			executeFunctions.normalizeItems.mockReturnValue([{ json: { code: 1, value: null } }]);
			const context = mock<SandboxContext>({
				$input: {
					all() {
						return [
							{
								json: {
									value: null,
									code: 1,
								},
							},
							{
								json: {
									value: null,
									code: 2,
								},
							},
						];
					},
				},
			});

			const sandbox = new PythonSandbox(context, pythonCode, executeFunctions);
			await sandbox.runCodeAllItems();

			expect(executeFunctions.normalizeItems).toBeCalledWith({ json: { code: 1, value: null } });
		});
	});
});
