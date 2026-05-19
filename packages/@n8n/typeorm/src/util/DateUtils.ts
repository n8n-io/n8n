import { ColumnMetadata } from '../metadata/ColumnMetadata';
import dayjs from 'dayjs';

/**
 * Provides utilities to transform hydrated and persisted data.
 */
export class DateUtils {
	// -------------------------------------------------------------------------
	// Public Static Methods
	// -------------------------------------------------------------------------

	/**
	 * Normalizes date object hydrated from the database.
	 */
	static normalizeHydratedDate(mixedDate: Date | string | undefined): Date | string | undefined {
		if (!mixedDate) return mixedDate;

		return typeof mixedDate === 'string' ? new Date(mixedDate) : (mixedDate as Date);
	}

	/**
	 * Converts given value into date string in a "YYYY-MM-DD" format.
	 */
	static mixedDateToDateString(value: string | Date): string {
		if (value instanceof Date) {
			return (
				this.formatZerolessValue(value.getFullYear(), 4) +
				'-' +
				this.formatZerolessValue(value.getMonth() + 1) +
				'-' +
				this.formatZerolessValue(value.getDate())
			);
		}

		return value;
	}

	/**
	 * Converts given value into date object.
	 */
	static mixedDateToDate(
		mixedDate: Date | string,
		toUtc: boolean = false,
		useMilliseconds = true,
	): Date {
		/**
		 * new Date(ISOString) is not a reliable parser to date strings.
		 * It's better to use 'date-fns' parser to parser string in ISO Format.
		 *
		 * The problem here is with wrong timezone.
		 *
		 * For example:
		 *
		 * ``new Date('2021-04-28')`` will generate `2021-04-28T00:00:00.000Z`
		 * in my timezone, which is not true for my timezone (GMT-0300). It should
		 * be `2021-04-28T03:00:00.000Z` as `new Date(2021, 3, 28)` generates.
		 *
		 * https://stackoverflow.com/a/2587398
		 */
		let date = typeof mixedDate === 'string' ? dayjs(mixedDate).toDate() : mixedDate;

		if (toUtc)
			date = new Date(
				date.getUTCFullYear(),
				date.getUTCMonth(),
				date.getUTCDate(),
				date.getUTCHours(),
				date.getUTCMinutes(),
				date.getUTCSeconds(),
				date.getUTCMilliseconds(),
			);

		if (!useMilliseconds) date.setUTCMilliseconds(0);

		return date;
	}

	/**
	 * Converts given value into time string in a "HH:mm:ss" format.
	 */
	static mixedDateToTimeString(value: Date | any, skipSeconds: boolean = false): string | any {
		if (value instanceof Date)
			return (
				this.formatZerolessValue(value.getHours()) +
				':' +
				this.formatZerolessValue(value.getMinutes()) +
				(!skipSeconds ? ':' + this.formatZerolessValue(value.getSeconds()) : '')
			);

		return value;
	}

	/**
	 * Converts given value into time string in a "HH:mm:ss" format.
	 */
	static mixedTimeToDate(value: Date | any): string | any {
		if (typeof value === 'string') {
			const [hours, minutes, seconds] = value.split(':');
			const date = new Date();
			if (hours) date.setHours(parseInt(hours));
			if (minutes) date.setMinutes(parseInt(minutes));
			if (seconds) date.setSeconds(parseInt(seconds));
			return date;
		}

		return value;
	}

	/**
	 * Converts given string value with "-" separator into a "HH:mm:ss" format.
	 */
	static mixedTimeToString(value: string | any, skipSeconds: boolean = false): string | any {
		value =
			value instanceof Date
				? value.getHours() +
					':' +
					value.getMinutes() +
					(!skipSeconds ? ':' + value.getSeconds() : '')
				: value;
		if (typeof value === 'string') {
			return value
				.split(':')
				.map((v) => (v.length === 1 ? '0' + v : v)) // append zero at beginning if we have a first-zero-less number
				.join(':');
		}

		return value;
	}

	/**
	 * Converts given value into datetime string in a "YYYY-MM-DD HH-mm-ss" format.
	 */
	static mixedDateToDatetimeString(value: Date | any, useMilliseconds?: boolean): string | any {
		if (typeof value === 'string') {
			value = new Date(value);
		}
		if (value instanceof Date) {
			let finalValue =
				this.formatZerolessValue(value.getFullYear(), 4) +
				'-' +
				this.formatZerolessValue(value.getMonth() + 1) +
				'-' +
				this.formatZerolessValue(value.getDate()) +
				' ' +
				this.formatZerolessValue(value.getHours()) +
				':' +
				this.formatZerolessValue(value.getMinutes()) +
				':' +
				this.formatZerolessValue(value.getSeconds());

			if (useMilliseconds) finalValue += `.${this.formatMilliseconds(value.getMilliseconds())}`;

			value = finalValue;
		}

		return value;
	}

	/**
	 * Converts given value into utc datetime string in a "YYYY-MM-DD HH-mm-ss.sss" format.
	 */
	static mixedDateToUtcDatetimeString(value: Date | any): string | any {
		if (typeof value === 'string') {
			value = new Date(value);
		}
		if (value instanceof Date) {
			return (
				this.formatZerolessValue(value.getUTCFullYear(), 4) +
				'-' +
				this.formatZerolessValue(value.getUTCMonth() + 1) +
				'-' +
				this.formatZerolessValue(value.getUTCDate()) +
				' ' +
				this.formatZerolessValue(value.getUTCHours()) +
				':' +
				this.formatZerolessValue(value.getUTCMinutes()) +
				':' +
				this.formatZerolessValue(value.getUTCSeconds()) +
				'.' +
				this.formatMilliseconds(value.getUTCMilliseconds())
			);
		}

		return value;
	}

	/**
	 * Converts each item in the given array to string joined by "," separator.
	 */
	static simpleArrayToString(value: any[] | any): string[] | any {
		if (Array.isArray(value)) {
			return (value as any[]).map((i) => String(i)).join(',');
		}

		return value;
	}

	/**
	 * Converts given string to simple array split by "," separator.
	 */
	static stringToSimpleArray(value: string | any): string | any {
		if (typeof value === 'string') {
			if (value.length > 0) {
				return value.split(',');
			} else {
				return [];
			}
		}

		return value;
	}

	static simpleJsonToString(value: any): string {
		return JSON.stringify(value);
	}

	static stringToSimpleJson(value: any) {
		return typeof value === 'string' ? JSON.parse(value) : value;
	}

	static simpleEnumToString(value: any) {
		return '' + value;
	}

	static stringToSimpleEnum(value: any, columnMetadata: ColumnMetadata) {
		if (columnMetadata.enum && !isNaN(value) && columnMetadata.enum.indexOf(parseInt(value)) >= 0) {
			// convert to number if that exists in poosible enum options
			value = parseInt(value);
		}

		return value;
	}

	// -------------------------------------------------------------------------
	// Private Static Methods
	// -------------------------------------------------------------------------

	/**
	 * Formats given number to "0x" format, e.g. if the totalLength = 2 and the value is 1 then it will return "01".
	 */
	private static formatZerolessValue(value: number, totalLength = 2): string {
		const pad = '0'.repeat(totalLength);

		return String(`${pad}${value}`).slice(-totalLength);
	}

	/**
	 * Formats given number to "0x" format, e.g. if it is 1 then it will return "01".
	 */
	private static formatMilliseconds(value: number): string {
		if (value < 10) {
			return '00' + value;
		} else if (value < 100) {
			return '0' + value;
		} else {
			return String(value);
		}
	}
}
