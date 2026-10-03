import * as getMany from '../../actions/slot/getMany.operation';
import { calApiRequestV2Versioned } from '../../GenericFunctions';
import { mockExecuteCtx } from '../shared';

vi.mock('../../GenericFunctions', async (importActual) => ({
	...(await importActual()),
	calApiRequestV2Versioned: vi.fn(),
}));

const apiRequest = vi.mocked(calApiRequestV2Versioned);

const slotsByDate = {
	'2033-09-05': [
		{ start: '2033-09-05T10:00:00+02:00', end: '2033-09-05T10:30:00+02:00' },
		{ start: '2033-09-05T11:00:00+02:00', end: '2033-09-05T11:30:00+02:00' },
	],
	'2033-09-06': [{ start: '2033-09-06T09:00:00+02:00', end: '2033-09-06T09:30:00+02:00' }],
};

const baseParams = {
	eventType: { mode: 'list', value: '1234' },
	start: '2033-09-05',
	end: '2033-09-07',
};

describe('Cal.com slot:getMany operation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('pins the slots API version and sends the range as a query', async () => {
		apiRequest.mockResolvedValue({ data: {} });
		const ctx = mockExecuteCtx(baseParams);

		await getMany.execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/slots',
			'2024-09-04',
			{},
			{ eventTypeId: 1234, start: '2033-09-05', end: '2033-09-07' },
		);
	});

	it('folds the date into one item for each slot', async () => {
		apiRequest.mockResolvedValue({ data: slotsByDate });
		const ctx = mockExecuteCtx({ ...baseParams, simple: true });

		const result = await getMany.execute.call(ctx, 0);

		expect(result).toEqual([
			{
				date: '2033-09-05',
				start: '2033-09-05T10:00:00+02:00',
				end: '2033-09-05T10:30:00+02:00',
			},
			{
				date: '2033-09-05',
				start: '2033-09-05T11:00:00+02:00',
				end: '2033-09-05T11:30:00+02:00',
			},
			{
				date: '2033-09-06',
				start: '2033-09-06T09:00:00+02:00',
				end: '2033-09-06T09:30:00+02:00',
			},
		]);
	});

	it('keeps the date map when Simplify is off', async () => {
		apiRequest.mockResolvedValue({ data: slotsByDate });
		const ctx = mockExecuteCtx({ ...baseParams, simple: false });

		expect(await getMany.execute.call(ctx, 0)).toEqual(slotsByDate);
	});

	it('answers with an empty list when no slot is free', async () => {
		apiRequest.mockResolvedValue({ data: {} });
		const ctx = mockExecuteCtx({ ...baseParams, simple: true });

		expect(await getMany.execute.call(ctx, 0)).toEqual([]);
	});

	it('adds the options to the query', async () => {
		apiRequest.mockResolvedValue({ data: {} });
		const ctx = mockExecuteCtx({
			...baseParams,
			options: { timeZone: 'Europe/Berlin', duration: 15, bookingUidToReschedule: 'bkg_1' },
		});

		await getMany.execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/slots',
			'2024-09-04',
			{},
			{
				eventTypeId: 1234,
				start: '2033-09-05',
				end: '2033-09-07',
				timeZone: 'Europe/Berlin',
				duration: 15,
				bookingUidToReschedule: 'bkg_1',
			},
		);
	});
});
