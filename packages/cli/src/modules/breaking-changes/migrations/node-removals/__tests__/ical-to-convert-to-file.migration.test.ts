import { createNode } from '../../../__tests__/test-helpers';
import { icalToConvertToFile } from '../ical-to-convert-to-file.migration';

describe('icalToConvertToFile migration', () => {
	it('is keyed by the iCalendar rule id', () => {
		expect(icalToConvertToFile.ruleId).toBe('i-calendar-removed-v3');
	});

	it('keeps every parameter and switches the operation', () => {
		const parameters = {
			operation: 'createEventFile',
			title: 'Standup',
			start: '2026-01-01T09:00:00',
			end: '2026-01-01T09:15:00',
			allDay: false,
			binaryPropertyName: 'invite',
			additionalFields: { location: 'Room 1', attendeesUi: { attendees: [{ name: 'A' }] } },
		};

		const result = icalToConvertToFile.migrate(
			createNode('iCal', 'n8n-nodes-base.iCal', parameters),
		);

		expect(result.node).toEqual({
			type: 'n8n-nodes-base.convertToFile',
			typeVersion: 1.1,
			parameters: { ...parameters, operation: 'iCal' },
		});
	});

	it('sets the operation when the saved workflow omits it', () => {
		const { node } = icalToConvertToFile.migrate(
			createNode('iCal', 'n8n-nodes-base.iCal', { title: 'x' }),
		);

		expect(node.parameters).toEqual({ title: 'x', operation: 'iCal' });
	});
});
