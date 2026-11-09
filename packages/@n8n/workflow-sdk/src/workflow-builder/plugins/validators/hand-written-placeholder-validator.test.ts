import { workflow } from '../../../workflow-builder';
import { node, placeholder, trigger } from '../../node-builders/node-builder';
import { isHandWrittenPlaceholder } from './hand-written-placeholder-validator';

describe('isHandWrittenPlaceholder', () => {
	it.each([
		'PLACEHOLDER_CALENDAR_ID',
		'your-sheet-id',
		'REPLACE_ME',
		'insert_api_key',
		'<your calendar id>',
		'[YOUR_SHEET]',
		'{insert value}',
	])('flags %s', (value) => {
		expect(isHandWrittenPlaceholder(value)).toBe(true);
	});

	it.each([
		'primary',
		'your',
		'Your order has shipped',
		'={{ $json.your_id }}',
		'replacement',
		'replace_content',
	])('does not flag %s', (value) => {
		expect(isHandWrittenPlaceholder(value)).toBe(false);
	});
});

describe('handWrittenPlaceholderValidator', () => {
	const issuesFor = (parameters: Record<string, unknown>, disabled = false) =>
		workflow('wf-1', 'Placeholders')
			.add(
				trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } }).to(
					node({
						type: 'n8n-nodes-base.googleCalendar',
						version: 1.3,
						config: { name: 'Create Event', parameters, disabled },
					}),
				),
			)
			.validate()
			.warnings.filter((issue) => issue.code === 'HAND_WRITTEN_PLACEHOLDER');

	it('reports a literal placeholder with its parameter path', () => {
		const [issue] = issuesFor({
			calendar: { __rl: true, mode: 'id', value: 'PLACEHOLDER_CALENDAR_ID' },
		});

		expect(issue).toMatchObject({
			severity: 'warning',
			nodeName: 'Create Event',
			parameterPath: 'calendar.value',
		});
	});

	it('accepts placeholder() values and hint text', () => {
		expect(
			issuesFor({
				calendar: { __rl: true, mode: 'id', value: placeholder('Calendar ID') },
				options: { placeholder: 'your-calendar-id', notice: 'REPLACE_ME' },
			}),
		).toEqual([]);
	});

	it('checks description, which some nodes use as a real input', () => {
		expect(issuesFor({ description: 'REPLACE_ME' })).toHaveLength(1);
	});

	it('skips a disabled node', () => {
		expect(issuesFor({ calendar: 'PLACEHOLDER_CALENDAR_ID' }, true)).toEqual([]);
	});
});
