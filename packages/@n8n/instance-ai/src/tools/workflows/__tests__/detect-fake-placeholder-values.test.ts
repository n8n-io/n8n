import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { IDataObject } from 'n8n-workflow';

import {
	detectFakePlaceholderValues,
	FAKE_PLACEHOLDER_VALUE_CODE,
} from '../detect-fake-placeholder-values';

function workflow(parameters: IDataObject): WorkflowJSON {
	return {
		id: 'wf-test',
		name: 'Test',
		nodes: [
			{
				id: '1',
				name: 'Book Call',
				type: 'n8n-nodes-base.googleCalendar',
				typeVersion: 1.3,
				position: [0, 0],
				parameters,
			},
		],
		connections: {},
	};
}

describe('detectFakePlaceholderValues', () => {
	it.each([
		'PLACEHOLDER_CALENDAR_ID',
		'placeholder_calendar_id',
		'your-sheet-id',
		'REPLACE_ME',
		'<your calendar id>',
		'[YOUR_SHEET]',
	])('flags %s as a blocking issue', (value) => {
		const warnings = detectFakePlaceholderValues(
			workflow({ calendar: { __rl: true, mode: 'id', value } }),
		);

		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toMatchObject({
			code: FAKE_PLACEHOLDER_VALUE_CODE,
			nodeName: 'Book Call',
			parameterPath: 'calendar.value',
			severity: 'error',
		});
	});

	it.each([
		'<__PLACEHOLDER_VALUE__Calendar ID__>',
		'primary',
		'Your order is ready',
		'=PLACEHOLDER_{{ $json.x }}',
		'<b>Hello</b>',
		'your',
	])('does not flag %s', (value) => {
		expect(detectFakePlaceholderValues(workflow({ text: value }))).toEqual([]);
	});

	it('ignores hint text such as a form field placeholder', () => {
		const warnings = detectFakePlaceholderValues(
			workflow({ formFields: { values: [{ fieldLabel: 'Email', placeholder: '<your email>' }] } }),
		);

		expect(warnings).toEqual([]);
	});
});
