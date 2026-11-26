import { mock } from 'vitest-mock-extended';
import type { IDataObject, INodeExecutionData, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import {
	collectAllowedBinaryDataIds,
	collectBinaryDataIds,
	filterBinaryDataIds,
} from '../collect-binary-data-ids';

describe('collectBinaryDataIds', () => {
	it('collects IDs from standard binary fields', () => {
		const items: INodeExecutionData[] = [
			{
				json: {},
				binary: {
					input: { data: '', mimeType: 'text/plain', id: 'filesystem:first' },
					output: { data: '', mimeType: 'image/png', id: 's3:second' },
				},
			},
		];

		expect(collectBinaryDataIds(items)).toEqual(['filesystem:first', 's3:second']);
	});

	it('collects nested binary IDs from JSON only when requested', () => {
		const items: INodeExecutionData[] = [
			{
				json: {
					response: [{ attachment: { mimeType: 'application/pdf', id: 's3:nested' } }],
				},
			},
		];

		expect(collectBinaryDataIds(items)).toEqual([]);
		expect(collectBinaryDataIds(items, true)).toEqual(['s3:nested']);
	});

	it('deduplicates IDs and handles cycles and binary values without IDs', () => {
		const cyclicJson: Record<string, unknown> = {
			duplicate: { mimeType: 'text/plain', id: 'filesystem:shared' },
			withoutId: { data: '', mimeType: 'text/plain' },
		};
		cyclicJson.self = cyclicJson;
		const items: INodeExecutionData[] = [
			{
				json: cyclicJson as IDataObject,
				binary: {
					data: { data: '', mimeType: 'text/plain', id: 'filesystem:shared' },
				},
			},
		];

		expect(collectBinaryDataIds(items, true)).toEqual(['filesystem:shared']);
	});

	it('ignores binary values with non-string IDs', () => {
		const items: INodeExecutionData[] = [
			{
				json: { attachment: { mimeType: 'text/plain', id: 42 } },
			},
		];

		expect(collectBinaryDataIds(items, true)).toEqual([]);
	});

	it('collects IDs from deeply nested JSON', () => {
		const json: Record<string, unknown> = {};
		let current = json;
		for (let depth = 0; depth < 20_000; depth++) {
			const child: Record<string, unknown> = {};
			current.child = child;
			current = child;
		}
		current.attachment = { mimeType: 'text/plain', id: 'filesystem:deep' };

		const items: INodeExecutionData[] = [{ json: json as IDataObject }];

		expect(collectBinaryDataIds(items, true)).toEqual(['filesystem:deep']);
	});
});

describe('filterBinaryDataIds', () => {
	const items: INodeExecutionData[] = [
		{
			json: { attachment: { mimeType: 'application/pdf', id: 's3:nested' } },
			binary: {
				readable: { data: '', mimeType: 'text/plain', id: 'filesystem:readable' },
				hidden: { data: '', mimeType: 'text/plain', id: 'filesystem:hidden' },
			},
		},
	];

	it('keeps only the IDs that the callback accepts', async () => {
		const canRead = vi.fn(async (id: string) => id !== 'filesystem:hidden');

		await expect(filterBinaryDataIds(items, false, canRead)).resolves.toEqual([
			'filesystem:readable',
		]);
		expect(canRead).toHaveBeenCalledTimes(2);
	});

	it('checks IDs in JSON when requested', async () => {
		const canRead = vi.fn(async () => true);

		await expect(filterBinaryDataIds(items, true, canRead)).resolves.toEqual([
			'filesystem:readable',
			'filesystem:hidden',
			's3:nested',
		]);
	});

	it('does not call the callback for items without binary data', async () => {
		const canRead = vi.fn(async () => true);

		await expect(filterBinaryDataIds([{ json: {} }], true, canRead)).resolves.toEqual([]);
		expect(canRead).not.toHaveBeenCalled();
	});
});

describe('collectAllowedBinaryDataIds', () => {
	it('keeps only binary IDs that the workflow may read', async () => {
		const binaryDataAccess =
			mock<NonNullable<IWorkflowExecuteAdditionalData['binaryDataAccess']>>();
		binaryDataAccess.isAllowed.mockImplementation(async (id) => id === 'created-id');
		const items = [
			{
				json: {},
				binary: {
					created: { data: '', mimeType: 'text/plain', id: 'created-id' },
					unavailable: { data: '', mimeType: 'text/plain', id: 'unavailable-id' },
				},
			},
		];

		await expect(
			collectAllowedBinaryDataIds(items, binaryDataAccess, { id: 'workflow-id' }, ['inherited-id']),
		).resolves.toEqual(['created-id']);
		expect(binaryDataAccess.isAllowed).toHaveBeenCalledWith('unavailable-id', 'workflow-id', [
			'inherited-id',
		]);
	});

	it('checks binary IDs in JSON only in combined binary mode', async () => {
		const binaryDataAccess =
			mock<NonNullable<IWorkflowExecuteAdditionalData['binaryDataAccess']>>();
		binaryDataAccess.isAllowed.mockResolvedValue(true);
		const items = [
			{ json: { file: { data: '', mimeType: 'text/plain', id: 'json-id' } }, binary: {} },
		];

		await expect(
			collectAllowedBinaryDataIds(items, binaryDataAccess, { id: 'workflow-id' }),
		).resolves.toEqual([]);
		await expect(
			collectAllowedBinaryDataIds(items, binaryDataAccess, {
				id: 'workflow-id',
				settings: { binaryMode: 'combined' },
			}),
		).resolves.toEqual(['json-id']);
	});

	it('returns no IDs without binary data access', async () => {
		const items = [
			{ json: {}, binary: { file: { data: '', mimeType: 'text/plain', id: 'file-id' } } },
		];

		await expect(
			collectAllowedBinaryDataIds(items, undefined, { id: 'workflow-id' }),
		).resolves.toEqual([]);
	});
});
