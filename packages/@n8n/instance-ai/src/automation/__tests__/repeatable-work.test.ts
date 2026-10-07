import type { RepeatableWorkAssessment, WorkSignal } from '../repeatable-work';
import {
	assessRepeatableWork,
	isRepeatableEnough,
	REPEATABLE_WORK_THRESHOLD,
} from '../repeatable-work';

const SLACK_POST = 'nodes:execute:n8n-nodes-base.slack:message:post';
const SHEETS_APPEND = 'nodes:execute:n8n-nodes-base.googleSheets:sheet:append';

const say = (text: string): WorkSignal => ({ kind: 'user-message', text });
const call = (signature: string, ok = true): WorkSignal => ({ kind: 'tool-call', signature, ok });
const oneOff = (workflowId = 'wf-1'): WorkSignal => ({ kind: 'one-off-success', workflowId });

describe('assessRepeatableWork', () => {
	it('gives score 0 and no reasons when there are no signals', () => {
		const assessment = assessRepeatableWork([]);

		expect(assessment).toStrictEqual({ score: 0, reasons: [], repeatedSignatures: [] });
		expect(isRepeatableEnough(assessment)).toBe(false);
	});

	it('gives 0.6 for a schedule phrase alone, which is repeatable', () => {
		const assessment = assessRepeatableWork([say('Send me this summary every weekday at 8')]);

		expect(assessment.score).toBe(0.6);
		expect(assessment.reasons).toEqual(['schedule-phrase']);
		expect(assessment.suggestedTrigger).toEqual({
			trigger: { mode: 'weekdays', hour: 8, minute: 0 },
			description: 'Every weekday at 08:00',
			matchedText: 'every weekday at 8',
		});
		expect(isRepeatableEnough(assessment)).toBe(true);
	});

	it('gives 0.4 for two identical successful tool calls, which is not repeatable alone', () => {
		const assessment = assessRepeatableWork([call(SLACK_POST), call(SLACK_POST)]);

		expect(assessment.score).toBe(0.4);
		expect(assessment.reasons).toEqual(['repeated-tool-call']);
		expect(assessment.repeatedSignatures).toEqual([SLACK_POST]);
		expect(assessment.suggestedTrigger).toBeUndefined();
		expect(isRepeatableEnough(assessment)).toBe(false);
	});

	it('gives 0 for two identical tool calls when one of them failed', () => {
		const assessment = assessRepeatableWork([call(SLACK_POST), call(SLACK_POST, false)]);

		expect(assessment).toStrictEqual({ score: 0, reasons: [], repeatedSignatures: [] });
	});

	it('does not count failed calls, however many there are', () => {
		const failed = Array.from({ length: 5 }, () => call(SLACK_POST, false));

		expect(assessRepeatableWork(failed).score).toBe(0);
	});

	it('does not count different signatures that each succeed once', () => {
		const assessment = assessRepeatableWork([call(SLACK_POST), call(SHEETS_APPEND)]);

		expect(assessment.reasons).toEqual([]);
		expect(assessment.repeatedSignatures).toEqual([]);
	});

	it('does not count blank signatures as a repeat', () => {
		const assessment = assessRepeatableWork([call(''), call(''), call('  '), call('  ')]);

		expect(assessment.score).toBe(0);
		expect(assessment.repeatedSignatures).toEqual([]);
	});

	it('lists each repeated signature once, sorted', () => {
		const assessment = assessRepeatableWork([
			call(SLACK_POST),
			call(SHEETS_APPEND),
			call('single'),
			call(SLACK_POST),
			call(SHEETS_APPEND),
			call(SLACK_POST),
		]);

		expect(assessment.repeatedSignatures).toEqual([SHEETS_APPEND, SLACK_POST]);
		expect(assessment.reasons).toEqual(['repeated-tool-call']);
		expect(assessment.score).toBe(0.4);
	});

	it('gives 0.5 for an intent phrase and a one-off success', () => {
		const assessment = assessRepeatableWork([say('Can you automate this for me?'), oneOff()]);

		expect(assessment.score).toBe(0.5);
		expect(assessment.reasons).toEqual(['intent-phrase', 'one-off-success']);
		expect(isRepeatableEnough(assessment)).toBe(false);
	});

	it('gives 0.2 for one-off successes alone, and counts the reason once', () => {
		const assessment = assessRepeatableWork([oneOff('wf-1'), oneOff('wf-2'), oneOff('wf-1')]);

		expect(assessment.score).toBe(0.2);
		expect(assessment.reasons).toEqual(['one-off-success']);
	});

	it('caps the score at 1 when every reason is present', () => {
		const assessment = assessRepeatableWork([
			say('From now on, post the report every Monday at 9'),
			call(SLACK_POST),
			call(SLACK_POST),
			oneOff(),
		]);

		expect(assessment.score).toBe(1);
		expect(assessment.reasons).toEqual([
			'schedule-phrase',
			'intent-phrase',
			'repeated-tool-call',
			'one-off-success',
		]);
		expect(isRepeatableEnough(assessment)).toBe(true);
	});

	it.each<{ name: string; signals: WorkSignal[]; score: number }>([
		{ name: 'schedule and intent', signals: [say('Automate this every day at 9')], score: 0.9 },
		{
			name: 'repeated call and intent',
			signals: [say('keep doing this'), call(SLACK_POST), call(SLACK_POST)],
			score: 0.7,
		},
		{ name: 'schedule and one-off', signals: [say('do it hourly'), oneOff()], score: 0.8 },
		{
			name: 'repeated call, intent and one-off',
			signals: [say('whenever it changes'), call('x'), call('x'), oneOff()],
			score: 0.9,
		},
	])('rounds the sum to 2 decimals for $name', ({ signals, score }) => {
		expect(assessRepeatableWork(signals).score).toBe(score);
	});

	it('takes the suggested trigger from the last message that has a schedule phrase', () => {
		const assessment = assessRepeatableWork([
			say('Run it every Monday at 9'),
			call(SLACK_POST),
			say('Actually, make it every day at 7'),
			say('Thanks, that looks good'),
		]);

		expect(assessment.suggestedTrigger?.trigger).toEqual({ mode: 'everyDay', hour: 7, minute: 0 });
		expect(assessment.suggestedTrigger?.matchedText).toBe('every day at 7');
		expect(assessment.reasons).toEqual(['schedule-phrase']);
	});

	it('keeps the reasons in the documented order, whatever the order of the signals', () => {
		const assessment = assessRepeatableWork([
			oneOff(),
			call(SLACK_POST),
			call(SLACK_POST),
			say('whenever a new row arrives'),
			say('every Friday at 17:00'),
		]);

		expect(assessment.reasons).toEqual([
			'schedule-phrase',
			'intent-phrase',
			'repeated-tool-call',
			'one-off-success',
		]);
	});

	it('reads intent and schedule phrases only from user messages', () => {
		const assessment = assessRepeatableWork([
			call('automate every day at 9'),
			oneOff('whenever every Monday'),
		]);

		expect(assessment.reasons).toEqual(['one-off-success']);
		expect(assessment.suggestedTrigger).toBeUndefined();
	});

	// Thread data can carry extra fields, so each check must look at the kind of the signal.
	it('ignores text on tool calls and signatures on user messages', () => {
		const callWithText = {
			kind: 'tool-call',
			signature: SLACK_POST,
			ok: true,
			text: 'Automate this every day at 9',
		} as WorkSignal;
		const messageWithSignature = {
			kind: 'user-message',
			text: 'Here is the file',
			signature: SHEETS_APPEND,
			ok: true,
		} as WorkSignal;

		const assessment = assessRepeatableWork([
			say('Hello'),
			callWithText,
			messageWithSignature,
			say('Thanks'),
			messageWithSignature,
		]);

		expect(assessment).toStrictEqual({ score: 0, reasons: [], repeatedSignatures: [] });
	});

	it('finds an intent phrase in a message between messages without one', () => {
		const assessment = assessRepeatableWork([
			say('Hello'),
			say('Please automate this'),
			say('Thanks'),
		]);

		expect(assessment.reasons).toEqual(['intent-phrase']);
		expect(assessment.score).toBe(0.3);
	});

	it('finds no intent phrase when no user message has one', () => {
		const assessment = assessRepeatableWork([say('Hello'), call(SLACK_POST), say('Thanks')]);

		expect(assessment.reasons).toEqual([]);
		expect(assessment.score).toBe(0);
	});

	describe('intent phrases', () => {
		it.each([
			'Can you automate this?',
			'AUTOMATE the export',
			'Do this every time a lead arrives',
			'Every\ttime it fails, tell me',
			'Do this every  time a lead arrives',
			'Whenever I get an invoice, file it',
			'From now on, send it to Slack',
			'from  now  on',
			'We will do this again next week',
			'We will do this again   next week',
			'Keep doing this for each new order',
			'Keep  doing this',
			'(automate)',
		])('finds an intent phrase in "%s"', (text) => {
			expect(assessRepeatableWork([say(text)]).reasons).toContain('intent-phrase');
		});

		it.each([
			'This is an automated report',
			'The automation ran fine',
			'It automates the export',
			'Everytime is not two words',
			'I kept doing it by hand',
			'from now onwards is a different phrase',
			'réautomate is not the word',
			'automate_this is one identifier',
			'Do it once and stop',
		])('finds no intent phrase in "%s"', (text) => {
			expect(assessRepeatableWork([say(text)]).reasons).not.toContain('intent-phrase');
		});
	});
});

describe('isRepeatableEnough', () => {
	const withScore = (score: number): RepeatableWorkAssessment => ({
		score,
		reasons: [],
		repeatedSignatures: [],
	});

	it('uses a threshold of 0.6', () => {
		expect(REPEATABLE_WORK_THRESHOLD).toBe(0.6);
	});

	it.each([
		{ score: 0, expected: false },
		{ score: 0.59, expected: false },
		{ score: 0.6, expected: true },
		{ score: 1, expected: true },
	])('returns $expected for score $score', ({ score, expected }) => {
		expect(isRepeatableEnough(withScore(score))).toBe(expected);
	});
});
