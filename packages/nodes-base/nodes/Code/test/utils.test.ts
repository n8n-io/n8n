import { mock } from 'jest-mock-extended';
import { UserError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import { addPostExecutionWarning, checkPythonCodeImports } from '../utils';

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

describe('checkPythonCodeImports', () => {
	it('should throw on static "import os"', () => {
		const code = 'import os';
		expect(() => checkPythonCodeImports(code)).toThrowError(
			new UserError('Forbidden import detected: os'),
		);
	});

	it('should throw on static "import os, math"', () => {
		const code = 'import os, math';
		expect(() => checkPythonCodeImports(code)).toThrowError(
			new UserError('Forbidden import detected: os'),
		);
	});

	it('should throw on "from os import path"', () => {
		const code = 'from os import path';
		expect(() => checkPythonCodeImports(code)).toThrowError(
			new UserError('Forbidden import detected: os'),
		);
	});

	it('should throw on dynamic import "__import__(\'os\')"', () => {
		const code = "__import__('os')";
		expect(() => checkPythonCodeImports(code)).toThrowError(
			new UserError('Forbidden import detected: os'),
		);
	});

	it('should not throw for allowed import (e.g., math)', () => {
		const code = 'import math';
		expect(() => checkPythonCodeImports(code)).not.toThrow();
	});
});
