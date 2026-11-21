import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject } from 'n8n-workflow';
import type { Mock } from 'vitest';

import * as GenericFunctions from '../GenericFunctions';
import type * as _importType0 from '../GenericFunctions';
import { ERPNext } from '../ERPNext.node';

vi.mock('../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../GenericFunctions')),
	erpNextApiRequest: vi.fn(),
	erpNextApiRequestAllItems: vi.fn(),
}));

const erpNextApiRequestMock = GenericFunctions.erpNextApiRequest as Mock;

type ParamMap = Record<string, unknown>;

/** Builds a mocked IExecuteFunctions for the Document resource, given operation and per-item params. */
function createMockExecuteFunctions(operation: string, items: ParamMap[]) {
	return {
		getInputData: vi.fn().mockReturnValue(items.map((json) => ({ json }))),
		getNodeParameter: vi
			.fn()
			.mockImplementation((name: string, itemIndex: number, fallback?: unknown) => {
				if (name === 'resource') return 'document';
				if (name === 'operation') return operation;
				const value = items[itemIndex]?.[name];
				return value === undefined ? fallback : value;
			}),
		getNode: vi.fn().mockReturnValue({ name: 'ERPNext' }),
		helpers: {
			returnJsonArray: vi
				.fn()
				.mockImplementation((data: IDataObject | IDataObject[]) =>
					(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
				),
			constructExecutionMetaData: vi.fn().mockImplementation((data: unknown[]) => data),
		},
	} as any;
}

describe('ERPNext Node', () => {
	beforeEach(() => {
		erpNextApiRequestMock.mockReset();
	});

	describe.each([
		{
			operation: 'create',
			method: 'POST',
			message: 'Please enter at least one property for the document to create.',
		},
		{
			operation: 'update',
			method: 'PUT',
			message: 'Please enter at least one property for the document to update.',
		},
	])('Document: $operation operation', ({ operation, method, message }) => {
		it('throws a NodeOperationError, not a raw TypeError, when Properties was never touched', async () => {
			// The Properties fixedCollection's own default (DocumentDescription.ts) is {},
			// not { customProperty: [] }, whenever the user never adds a row — the same
			// default-shape trap as the Filters field on Get Many.
			const mockThis = createMockExecuteFunctions(operation, [
				{ properties: {}, docType: 'Customer', documentName: 'CUST-0001' },
			]);

			await expect(new ERPNext().execute.call(mockThis)).rejects.toBeInstanceOf(NodeOperationError);
			expect(erpNextApiRequestMock).not.toHaveBeenCalled();
		});

		it('still throws the same friendly error when customProperty is explicitly an empty array', async () => {
			// Locks in the pre-existing, intended behaviour: the guard must keep working
			// for the case it was originally written for.
			const mockThis = createMockExecuteFunctions(operation, [
				{ properties: { customProperty: [] }, docType: 'Customer', documentName: 'CUST-0001' },
			]);

			let caught: unknown;
			try {
				await new ERPNext().execute.call(mockThis);
			} catch (e) {
				caught = e;
			}

			expect(caught).toBeInstanceOf(NodeOperationError);
			expect((caught as NodeOperationError).message).toContain(message);
			expect(erpNextApiRequestMock).not.toHaveBeenCalled();
		});

		it('proceeds normally and sends the property values when a row is present', async () => {
			erpNextApiRequestMock.mockResolvedValue({
				data: { name: 'CUST-0001', customer_name: 'Acme' },
			});

			const mockThis = createMockExecuteFunctions(operation, [
				{
					properties: { customProperty: [{ field: 'customer_name', value: 'Acme' }] },
					docType: 'Customer',
					documentName: 'CUST-0001',
				},
			]);

			const result = await new ERPNext().execute.call(mockThis);

			expect(result[0]).toHaveLength(1);
			expect(erpNextApiRequestMock).toHaveBeenCalledTimes(1);

			const [calledMethod, calledResource, calledBody] = erpNextApiRequestMock.mock.calls[0];
			expect(calledMethod).toBe(method);
			expect(calledResource).toBe(
				operation === 'create' ? '/api/resource/Customer' : '/api/resource/Customer/CUST-0001',
			);
			expect(calledBody).toEqual({ customer_name: 'Acme' });
		});
	});
});
