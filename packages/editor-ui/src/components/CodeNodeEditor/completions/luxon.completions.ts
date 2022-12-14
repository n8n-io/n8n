import Vue from 'vue';
import { escape } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { CodeNodeEditorMixin } from '../types';

export const luxonCompletions = (Vue as CodeNodeEditorMixin).extend({
	methods: {
		/**
		 * Complete `$today.` with luxon `DateTime` instance methods.
		 */
		todayCompletions(context: CompletionContext, matcher = '$today'): CompletionResult | null {
			const pattern = new RegExp(`${escape(matcher)}\..*`);

			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options: Completion[] = this.luxonInstanceGetters().map(([getter, description]) => {
				return {
					label: `${matcher}.${getter}`,
					type: 'function',
					info: description,
				};
			});

			options.push(
				...this.luxonInstanceMethods().map(([method, description]) => {
					return {
						label: `${matcher}.${method}()`,
						type: 'function',
						info: description,
					};
				}),
			);

			return {
				from: preCursor.from,
				options,
			};
		},

		/**
		 * Complete `$now.` with luxon `DateTime` instance methods.
		 */
		nowCompletions(context: CompletionContext, matcher = '$now'): CompletionResult | null {
			const pattern = new RegExp(`${escape(matcher)}\..*`);

			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options: Completion[] = this.luxonInstanceGetters().map(([getter, description]) => {
				return {
					label: `${matcher}.${getter}`,
					type: 'function',
					info: description,
				};
			});

			options.push(
				...this.luxonInstanceMethods().map(([method, description]) => {
					return {
						label: `${matcher}.${method}()`,
						type: 'function',
						info: description,
					};
				}),
			);

			return {
				from: preCursor.from,
				options,
			};
		},

		/**
		 * Complete `DateTime` with luxon `DateTime` static methods.
		 */
		dateTimeCompltions(context: CompletionContext, matcher = 'DateTime'): CompletionResult | null {
			const pattern = new RegExp(`${escape(matcher)}\..*`);

			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options: Completion[] = this.luxonDateTimeStaticMethods().map(
				([method, description]) => {
					return {
						label: `DateTime.${method}()`,
						type: 'function',
						info: description,
					};
				},
			);

			return {
				from: preCursor.from,
				options,
			};
		},

		luxonDateTimeStaticMethods() {
			return Object.entries({
				now: this.$locale.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.now'),
				local: this.$locale.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.local'),
				utc: this.$locale.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.utc'),
				fromJSDate: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromJSDate',
				),
				fromMillis: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromMillis',
				),
				fromSeconds: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromSeconds',
				),
				fromObject: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromObject',
				),
				fromISO: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromISO',
				),
				fromRFC2822: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromRFC2822',
				),
				fromHTTP: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromHTTP',
				),
				fromFormat: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromFormat',
				),
				fromSQL: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromSQL',
				),
				invalid: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.invalid',
				),
				isDateTime: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.isDateTime',
				),
			});
		},

		luxonInstanceGetters() {
			return Object.entries({
				isValid: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.isValid'),
				invalidReason: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.invalidReason',
				),
				invalidExplanation: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.invalidExplanation',
				),
				locale: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.locale'),
				numberingSystem: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.numberingSystem',
				),
				outputCalendar: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.outputCalendar',
				),
				zone: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.zone'),
				zoneName: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.zoneName'),
				year: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.year'),
				quarter: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.quarter'),
				month: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.month'),
				day: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.day'),
				hour: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.hour'),
				minute: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.minute'),
				second: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.second'),
				millisecond: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.millisecond',
				),
				weekYear: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.weekYear'),
				weekNumber: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.weekNumber',
				),
				weekday: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.weekday'),
				ordinal: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.ordinal'),
				monthShort: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.monthShort',
				),
				monthLong: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.monthLong',
				),
				weekdayShort: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.weekdayShort',
				),
				weekdayLong: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.weekdayLong',
				),
				offset: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.offset'),
				offsetNumber: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.offsetNumber',
				),
				offsetNameShort: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.offsetNameShort',
				),
				offsetNameLong: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.offsetNameLong',
				),
				isOffsetFixed: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.isOffsetFixed',
				),
				isInDST: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.isInDST'),
				isInLeapYear: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.isInLeapYear',
				),
				daysInMonth: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.daysInMonth',
				),
				daysInYear: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.daysInYear',
				),
				weeksInWeekYear: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.weeksInWeekYear',
				),
			});
		},

		luxonInstanceMethods() {
			return Object.entries({
				toUTC: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toUTC'),
				toLocal: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toLocal'),
				setZone: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.setZone'),
				setLocale: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.setLocale',
				),
				set: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.set'),
				plus: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.plus'),
				minus: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.minus'),
				startOf: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.startOf'),
				endOf: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.endOf'),
				toFormat: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toFormat'),
				toLocaleString: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toLocaleString',
				),
				toLocaleParts: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toLocaleParts',
				),
				toISO: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toISO'),
				toISODate: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toISODate',
				),
				toISOWeekDate: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toISOWeekDate',
				),
				toISOTime: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toISOTime',
				),
				toRFC2822: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toRFC2822',
				),
				toHTTP: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toHTTP'),
				toSQLDate: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toSQLDate',
				),
				toSQLTime: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toSQLTime',
				),
				toSQL: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toSQL'),
				toString: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toString'),
				valueOf: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.valueOf'),
				toMillis: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toMillis'),
				toSeconds: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toSeconds',
				),
				toUnixInteger: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toUnixInteger',
				),
				toJSON: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toJSON'),
				toBSON: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toBSON'),
				toObject: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toObject'),
				toJsDate: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toJsDate'),
				diff: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.diff'),
				diffNow: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.diffNow'),
				until: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.until'),
				hasSame: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.hasSame'),
				equals: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.equals'),
				toRelative: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toRelative',
				),
				toRelativeCalendar: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toRelativeCalendar',
				),
				min: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.min'),
				max: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.max'),
			});
		},
	},
});
