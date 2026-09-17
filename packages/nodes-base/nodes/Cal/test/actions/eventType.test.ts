import { NodeOperationError } from 'n8n-workflow';

import * as get from '../../actions/eventType/get.operation';
import * as getMany from '../../actions/eventType/getMany.operation';
import { calApiRequestV2Versioned } from '../../GenericFunctions';
import { mockExecuteCtx } from '../shared';

vi.mock('../../GenericFunctions', async (importActual) => ({
	...(await importActual()),
	calApiRequestV2Versioned: vi.fn(),
}));

const apiRequest = vi.mocked(calApiRequestV2Versioned);

function eventTypes(count: number) {
	return Array.from({ length: count }, (_, i) => ({ id: i + 1, title: `Event ${i + 1}` }));
}

describe('Cal.com eventType operations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('get', () => {
		it('pins the event type API version and unwraps the envelope', async () => {
			apiRequest.mockResolvedValue({ data: { id: 7, title: 'Intro call' } });
			const ctx = mockExecuteCtx({ eventType: { mode: 'id', value: '7' } });

			const result = await get.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith('GET', '/event-types/7', '2024-06-14');
			expect(result).toEqual({ id: 7, title: 'Intro call' });
		});

		it('rejects a fractional ID before it reaches the API', async () => {
			const ctx = mockExecuteCtx({ eventType: { mode: 'id', value: '1.5' } });

			await expect(get.execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			expect(apiRequest).not.toHaveBeenCalled();
		});
	});

	describe('getMany', () => {
		it('cuts the result down to the limit', async () => {
			apiRequest.mockResolvedValue({ data: eventTypes(5) });
			const ctx = mockExecuteCtx({ returnAll: false, limit: 2 });

			const result = await getMany.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith('GET', '/event-types', '2024-06-14', {}, {});
			expect(result).toHaveLength(2);
		});

		it('keeps every event type when Return All is on', async () => {
			apiRequest.mockResolvedValue({ data: eventTypes(5) });
			const ctx = mockExecuteCtx({ returnAll: true });

			const result = await getMany.execute.call(ctx, 0);

			expect(result).toHaveLength(5);
		});

		it('passes the filters on and drops the empty ones', async () => {
			apiRequest.mockResolvedValue({ data: [] });
			const ctx = mockExecuteCtx({
				returnAll: true,
				filters: { username: 'jane', eventSlug: '' },
			});

			await getMany.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/event-types',
				'2024-06-14',
				{},
				{ username: 'jane' },
			);
		});

		it('answers with an empty list when the API sends no data', async () => {
			apiRequest.mockResolvedValue({ data: undefined });
			const ctx = mockExecuteCtx({ returnAll: true });

			expect(await getMany.execute.call(ctx, 0)).toEqual([]);
		});

		it('reports that a slug alone cannot be resolved', async () => {
			const ctx = mockExecuteCtx({ returnAll: true, filters: { eventSlug: 'intro-call' } });

			await expect(getMany.execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('accepts a slug together with a username', async () => {
			apiRequest.mockResolvedValue({ data: [] });
			const ctx = mockExecuteCtx({
				returnAll: true,
				filters: { eventSlug: 'intro-call', username: 'jane' },
			});

			await getMany.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith(
				'GET',
				'/event-types',
				'2024-06-14',
				{},
				{ eventSlug: 'intro-call', username: 'jane' },
			);
		});
	});
});
