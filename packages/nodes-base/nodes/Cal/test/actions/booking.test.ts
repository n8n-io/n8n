/* eslint-disable n8n-nodes-base/node-param-display-name-miscased -- `name` here is API payload data, not a node parameter */
import { NodeOperationError } from 'n8n-workflow';

import * as cancel from '../../actions/booking/cancel.operation';
import * as create from '../../actions/booking/create.operation';
import * as get from '../../actions/booking/get.operation';
import * as getMany from '../../actions/booking/getMany.operation';
import * as reschedule from '../../actions/booking/reschedule.operation';
import { calApiRequestV2AllItems, calApiRequestV2Versioned } from '../../GenericFunctions';
import { mockExecuteCtx } from '../shared';

vi.mock('../../GenericFunctions', async (importActual) => ({
	...(await importActual()),
	calApiRequestV2Versioned: vi.fn(),
	calApiRequestV2AllItems: vi.fn(),
}));

const apiRequest = vi.mocked(calApiRequestV2Versioned);
const apiRequestAllItems = vi.mocked(calApiRequestV2AllItems);

describe('Cal.com booking operations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('create', () => {
		const baseParams = {
			eventType: { mode: 'list', value: '1234' },
			start: '2033-09-05T10:00:00Z',
			attendeeName: 'Jane Doe',
			attendeeEmail: 'jane@example.com',
			attendeeTimeZone: 'Europe/Berlin',
		};

		it('nests the attendee and pins the write API version', async () => {
			apiRequest.mockResolvedValue({ data: { uid: 'bkg_1' } });
			const ctx = mockExecuteCtx(baseParams);

			const result = await create.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith('POST', '/bookings', '2026-02-25', {
				eventTypeId: 1234,
				start: '2033-09-05T10:00:00Z',
				attendee: {
					name: 'Jane Doe',
					timeZone: 'Europe/Berlin',
					email: 'jane@example.com',
				},
			});
			expect(result).toEqual({ uid: 'bkg_1' });
		});

		it('moves phone number and language into the attendee', async () => {
			apiRequest.mockResolvedValue({ data: {} });
			const ctx = mockExecuteCtx({
				...baseParams,
				additionalFields: { phoneNumber: '+4915112345678', language: 'de' },
			});

			await create.execute.call(ctx, 0);

			const [, , , body] = apiRequest.mock.calls[0];
			expect(body).toMatchObject({
				attendee: {
					name: 'Jane Doe',
					timeZone: 'Europe/Berlin',
					email: 'jane@example.com',
					phoneNumber: '+4915112345678',
					language: 'de',
				},
			});
		});

		it('splits the guest list and maps the key-value collections', async () => {
			apiRequest.mockResolvedValue({ data: {} });
			const ctx = mockExecuteCtx({
				...baseParams,
				additionalFields: {
					guests: 'john@example.com, kim@example.com , ',
					lengthInMinutes: 45,
					recurrenceCount: 3,
					instant: true,
					metadata: { metadata: [{ name: 'source', value: 'n8n' }] },
					bookingFieldsResponses: { response: [{ name: 'company', value: 'Acme Corp' }] },
				},
			});

			await create.execute.call(ctx, 0);

			const [, , , body] = apiRequest.mock.calls[0];
			expect(body).toMatchObject({
				guests: ['john@example.com', 'kim@example.com'],
				lengthInMinutes: 45,
				recurrenceCount: 3,
				instant: true,
				metadata: { source: 'n8n' },
				bookingFieldsResponses: { company: 'Acme Corp' },
			});
		});

		it('drops a metadata key that would pollute the prototype', async () => {
			apiRequest.mockResolvedValue({ data: {} });
			const ctx = mockExecuteCtx({
				...baseParams,
				additionalFields: {
					metadata: {
						metadata: [
							{ name: '__proto__', value: 'polluted' },
							{ name: 'source', value: 'n8n' },
						],
					},
				},
			});

			await create.execute.call(ctx, 0);

			const [, , , body] = apiRequest.mock.calls[0];
			expect(body).toMatchObject({ metadata: { source: 'n8n' } });
			expect(({} as Record<string, unknown>).polluted).toBeUndefined();
		});

		it('reports the empty required field instead of calling the API', async () => {
			const ctx = mockExecuteCtx({ ...baseParams, start: '' });

			await expect(create.execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('rejects an event type ID that is not a number', async () => {
			const ctx = mockExecuteCtx({
				...baseParams,
				eventType: { mode: 'id', value: 'intro-call' },
			});

			await expect(create.execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			expect(apiRequest).not.toHaveBeenCalled();
		});
	});

	describe('get', () => {
		it('encodes the UID into the path', async () => {
			apiRequest.mockResolvedValue({ data: { uid: 'bkg/1' } });
			const ctx = mockExecuteCtx({ bookingUid: 'bkg/1' });

			const result = await get.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith('GET', '/bookings/bkg%2F1', '2026-02-25');
			expect(result).toEqual({ uid: 'bkg/1' });
		});
	});

	describe('getMany', () => {
		it('pins the list API version and passes the filters through', async () => {
			apiRequestAllItems.mockResolvedValue([{ uid: 'bkg_1' }]);
			const ctx = mockExecuteCtx({
				returnAll: false,
				limit: 25,
				filters: { status: 'upcoming', attendeeEmail: 'jane@example.com', teamId: '' },
			});

			const result = await getMany.execute.call(ctx, 0);

			expect(apiRequestAllItems).toHaveBeenCalledWith(
				'/bookings',
				'2026-05-01',
				{ status: 'upcoming', attendeeEmail: 'jane@example.com' },
				25,
			);
			expect(result).toEqual([{ uid: 'bkg_1' }]);
		});

		it('asks for every record when Return All is on', async () => {
			apiRequestAllItems.mockResolvedValue([]);
			const ctx = mockExecuteCtx({ returnAll: true });

			await getMany.execute.call(ctx, 0);

			expect(apiRequestAllItems).toHaveBeenCalledWith('/bookings', '2026-05-01', {}, Infinity);
		});

		it('rejects a limit that is not a positive number', async () => {
			const ctx = mockExecuteCtx({ returnAll: false, limit: 0 });

			await expect(getMany.execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			expect(apiRequestAllItems).not.toHaveBeenCalled();
		});

		it('drops a filter key that would pollute the prototype', async () => {
			apiRequestAllItems.mockResolvedValue([]);
			// JSON.parse keeps `__proto__` as an own key, the way an expression hands it over.
			const filters: unknown = JSON.parse('{"__proto__":{"polluted":true},"status":"past"}');
			const ctx = mockExecuteCtx({ returnAll: true, filters });

			await getMany.execute.call(ctx, 0);

			const [, , query] = apiRequestAllItems.mock.calls[0];
			expect(query).toEqual({ status: 'past' });
			// A plain assignment would swap the prototype of the query instead of adding a field.
			expect(Object.getPrototypeOf(query)).toBe(Object.prototype);
		});
	});

	describe('cancel', () => {
		it('sends only the options that are set', async () => {
			apiRequest.mockResolvedValue({ data: { status: 'cancelled' } });
			const ctx = mockExecuteCtx({
				bookingUid: 'bkg_1',
				options: { cancellationReason: 'Sick', cancelSubsequentBookings: true, seatUid: '' },
			});

			const result = await cancel.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith('POST', '/bookings/bkg_1/cancel', '2026-02-25', {
				cancellationReason: 'Sick',
				cancelSubsequentBookings: true,
			});
			expect(result).toEqual({ status: 'cancelled' });
		});

		it('forwards the seat UID of a seated booking', async () => {
			apiRequest.mockResolvedValue({ data: {} });
			const ctx = mockExecuteCtx({ bookingUid: 'bkg_1', options: { seatUid: 'seat_9' } });

			await cancel.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith('POST', '/bookings/bkg_1/cancel', '2026-02-25', {
				seatUid: 'seat_9',
			});
		});
	});

	describe('reschedule', () => {
		it('sends the new start with the options', async () => {
			apiRequest.mockResolvedValue({ data: { uid: 'bkg_2' } });
			const ctx = mockExecuteCtx({
				bookingUid: 'bkg_1',
				start: '2033-09-06T10:00:00Z',
				options: { reschedulingReason: 'Conflict', rescheduleWithSameHost: true },
			});

			const result = await reschedule.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith('POST', '/bookings/bkg_1/reschedule', '2026-02-25', {
				start: '2033-09-06T10:00:00Z',
				reschedulingReason: 'Conflict',
				rescheduleWithSameHost: true,
			});
			expect(result).toEqual({ uid: 'bkg_2' });
		});
	});
});
