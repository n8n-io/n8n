/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

let formatterCache = new Map<string, Intl.DateTimeFormat>();

interface DateRangeFormatPart extends Intl.DateTimeFormatPart {
  source: 'startRange' | 'endRange' | 'shared'
}

/** A wrapper around Intl.DateTimeFormat that fixes various browser bugs, and polyfills new features. */
export class DateFormatter implements Intl.DateTimeFormat {
  private formatter: Intl.DateTimeFormat;
  private options: Intl.DateTimeFormatOptions;
  private resolvedHourCycle: Intl.DateTimeFormatOptions['hourCycle'];

  constructor(locale: string, options: Intl.DateTimeFormatOptions = {}) {
    this.formatter = getCachedDateFormatter(locale, options);
    this.options = options;
  }

  /** Formats a date as a string according to the locale and format options passed to the constructor. */
  format(value: Date): string {
    return this.formatter.format(value);
  }

  /** Formats a date to an array of parts such as separators, numbers, punctuation, and more. */
  formatToParts(value: Date): Intl.DateTimeFormatPart[] {
    return this.formatter.formatToParts(value);
  }

  /** Formats a date range as a string. */
  formatRange(start: Date, end: Date): string {
    // @ts-ignore
    if (typeof this.formatter.formatRange === 'function') {
      // @ts-ignore
      return this.formatter.formatRange(start, end);
    }

    if (end < start) {
      throw new RangeError('End date must be >= start date');
    }

    // Very basic fallback for old browsers.
    return `${this.formatter.format(start)} – ${this.formatter.format(end)}`;
  }

  /** Formats a date range as an array of parts. */
  formatRangeToParts(start: Date, end: Date): DateRangeFormatPart[] {
    // @ts-ignore
    if (typeof this.formatter.formatRangeToParts === 'function') {
      // @ts-ignore
      return this.formatter.formatRangeToParts(start, end);
    }

    if (end < start) {
      throw new RangeError('End date must be >= start date');
    }

    let startParts = this.formatter.formatToParts(start);
    let endParts = this.formatter.formatToParts(end);
    return [
      ...startParts.map(p => ({...p, source: 'startRange'} as DateRangeFormatPart)),
      {type: 'literal', value: ' – ', source: 'shared'},
      ...endParts.map(p => ({...p, source: 'endRange'} as DateRangeFormatPart))
    ];
  }

  /** Returns the resolved formatting options based on the values passed to the constructor. */
  resolvedOptions(): Intl.ResolvedDateTimeFormatOptions {
    let resolvedOptions = this.formatter.resolvedOptions();
    if (hasBuggyResolvedHourCycle()) {
      if (!this.resolvedHourCycle) {
        this.resolvedHourCycle = getResolvedHourCycle(resolvedOptions.locale, this.options);
      }
      resolvedOptions.hourCycle = this.resolvedHourCycle;
      resolvedOptions.hour12 = this.resolvedHourCycle === 'h11' || this.resolvedHourCycle === 'h12';
    }

    // Safari uses a different name for the Ethiopic (Amete Alem) calendar.
    // https://bugs.webkit.org/show_bug.cgi?id=241564
    if (resolvedOptions.calendar === 'ethiopic-amete-alem') {
      resolvedOptions.calendar = 'ethioaa';
    }

    return resolvedOptions;
  }
}

// There are multiple bugs involving the hour12 and hourCycle options in various browser engines.
//   - Chrome [1] (and the ECMA 402 spec [2]) resolve hour12: false in English and other locales to h24 (24:00 - 23:59)
//     rather than h23 (00:00 - 23:59). Same can happen with hour12: true in French, which Chrome resolves to h11 (00:00 - 11:59)
//     rather than h12 (12:00 - 11:59).
//   - WebKit returns an incorrect hourCycle resolved option in the French locale due to incorrect parsing of 'h' literal
//     in the resolved pattern. It also formats incorrectly when specifying the hourCycle option for the same reason. [3]
// [1] https://bugs.chromium.org/p/chromium/issues/detail?id=1045791
// [2] https://github.com/tc39/ecma402/issues/402
// [3] https://bugs.webkit.org/show_bug.cgi?id=229313

// https://github.com/unicode-org/cldr/blob/018b55eff7ceb389c7e3fc44e2f657eae3b10b38/common/supplemental/supplementalData.xml#L4774-L4802
const hour12Preferences = {
  true: {
    // Only Japanese uses the h11 style for 12 hour time. All others use h12.
    ja: 'h11'
  },
  false: {
    // All locales use h23 for 24 hour time. None use h24.
  }
};

function getCachedDateFormatter(locale: string, options: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormat {
  // Work around buggy hour12 behavior in Chrome / ECMA 402 spec by using hourCycle instead.
  // Only apply the workaround if the issue is detected, because the hourCycle option is buggy in Safari.
  if (typeof options.hour12 === 'boolean' && hasBuggyHour12Behavior()) {
    options = {...options};
    let pref = hour12Preferences[String(options.hour12)][locale.split('-')[0]];
    let defaultHourCycle = options.hour12 ? 'h12' : 'h23';
    options.hourCycle = pref ?? defaultHourCycle;
    delete options.hour12;
  }

  let cacheKey = locale + (options ? Object.entries(options).sort((a, b) => a[0] < b[0] ? -1 : 1).join() : '');
  if (formatterCache.has(cacheKey)) {
    return formatterCache.get(cacheKey)!;
  }

  let numberFormatter = new Intl.DateTimeFormat(locale, options);
  formatterCache.set(cacheKey, numberFormatter);
  return numberFormatter;
}

let _hasBuggyHour12Behavior: boolean | null = null;
function hasBuggyHour12Behavior() {
  if (_hasBuggyHour12Behavior == null) {
    _hasBuggyHour12Behavior = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false
    }).format(new Date(2020, 2, 3, 0)) === '24';
  }

  return _hasBuggyHour12Behavior;
}

let _hasBuggyResolvedHourCycle: boolean | null = null;
function hasBuggyResolvedHourCycle() {
  if (_hasBuggyResolvedHourCycle == null) {
    _hasBuggyResolvedHourCycle = new Intl.DateTimeFormat('fr', {
      hour: 'numeric',
      hour12: false
    }).resolvedOptions().hourCycle === 'h12';
  }

  return _hasBuggyResolvedHourCycle;
}

function getResolvedHourCycle(locale: string, options: Intl.DateTimeFormatOptions) {
  if (!options.timeStyle && !options.hour) {
    return undefined;
  }

  // Work around buggy results in resolved hourCycle and hour12 options in WebKit.
  // Format the minimum possible hour and maximum possible hour in a day and parse the results.
  locale = locale.replace(/(-u-)?-nu-[a-zA-Z0-9]+/, '');
  locale += (locale.includes('-u-') ? '' : '-u') + '-nu-latn';
  let formatter = getCachedDateFormatter(locale, {
    ...options,
    timeZone: undefined // use local timezone
  });

  let min = parseInt(formatter.formatToParts(new Date(2020, 2, 3, 0)).find(p => p.type === 'hour')!.value, 10);
  let max = parseInt(formatter.formatToParts(new Date(2020, 2, 3, 23)).find(p => p.type === 'hour')!.value, 10);

  if (min === 0 && max === 23) {
    return 'h23';
  }

  if (min === 24 && max === 23) {
    return 'h24';
  }

  if (min === 0 && max === 11) {
    return 'h11';
  }

  if (min === 12 && max === 11) {
    return 'h12';
  }

  throw new Error('Unexpected hour cycle result');
}
