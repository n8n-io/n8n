import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import type { Mock } from 'vitest';

import { ERPNext } from '../ERPNext.node';
import * as GenericFunctions from '../GenericFunctions';

vi.mock('../GenericFunctions', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../GenericFunctions')>();
	return { ...actual, erpNextApiRequest: vi.fn() };
});

describe('ERPNext, document create/update with empty Properties', () => {
	const oneItem: INodeExecutionData[] = [{ json: {} }];

	const setup = (operation: 'create' | 'update', propertiesValue: unknown) => {
		const ctx = mock<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue(oneItem);
		ctx.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'resource') return 'document';
			if (name === 'operation') return operation;
			if (name === 'properties') return propertiesValue;
			if (name === 'docType') return 'Customer';
			if (name === 'documentName') return 'CUST-0001';
			throw new Error(`unexpected getNodeParameter(${name})`);
		});
		return ctx;
	};

	// Regression for https://github.com/n8n-io/n8n/issues/36220: the Properties fixedCollection
	// defaults to `{}` (not `{ customProperty: [] }`) when the user never adds a row, so the
	// node's own "please enter at least one property" guard used to crash with a raw
	// "Cannot read properties of undefined (reading 'length')" before it could ever throw its
	// intended NodeOperationError.
	it('throws the intended NodeOperationError, not a raw TypeError, on create with untouched Properties', async () => {
		const ctx = setup('create', {});

		await expect(new ERPNext().execute.call(ctx)).rejects.toThrow(NodeOperationError);
		await expect(new ERPNext().execute.call(ctx)).rejects.toThrow(
			'Please enter at least one property for the document to create.',
		);
	});

	it('throws the intended NodeOperationError, not a raw TypeError, on update with untouched Properties', async () => {
		const ctx = setup('update', {});

		await expect(new ERPNext().execute.call(ctx)).rejects.toThrow(NodeOperationError);
		await expect(new ERPNext().execute.call(ctx)).rejects.toThrow(
			'Please enter at least one property for the document to update.',
		);
	});

	it('still creates the document normally when Properties has rows', async () => {
		const ctx = setup('create', {
			customProperty: [{ field: 'customer_name', value: 'Acme' }],
		});
		(GenericFunctions.erpNextApiRequest as Mock).mockResolvedValue({
			data: { name: 'CUST-0002' },
		});

		await new ERPNext().execute.call(ctx);

		expect(GenericFunctions.erpNextApiRequest).toHaveBeenCalledWith(
			'POST',
			'/api/resource/Customer',
			{ customer_name: 'Acme' },
		);
	});
});
