import type { MaybeRef } from 'vue'
import { computed, unref } from 'vue'

/**
 * Provides locale-aware string filtering functions.
 * Uses `Intl.Collator` for comparison to ensure proper Unicode handling.
 *
 * @param options - Optional collator options to customize comparison behavior.
 *   See [Intl.CollatorOptions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator/Collator#options) for details.
 * @returns An object with methods to check if a string starts with, ends with, or contains a substring.
 *
 * @example
 * const { startsWith, endsWith, contains } = useFilter();
 *
 * startsWith('hello', 'he'); // true
 * endsWith('hello', 'lo'); // true
 * contains('hello', 'ell'); // true
 */
export function useFilter(options?: MaybeRef<Intl.CollatorOptions>) {
  const computedOptions = computed(() => unref(options))
  const collator = computed(() => new Intl.Collator('en', { usage: 'search', ...computedOptions.value }))

  const startsWith = (string: string, substring: string) => {
    if (substring.length === 0)
      return true

    string = string.normalize('NFC')
    substring = substring.normalize('NFC')
    return collator.value.compare(string.slice(0, substring.length), substring) === 0
  }

  const endsWith = (string: string, substring: string) => {
    if (substring.length === 0)
      return true

    string = string.normalize('NFC')
    substring = substring.normalize('NFC')
    return collator.value.compare(string.slice(-substring.length), substring) === 0
  }

  const contains = (string: string, substring: string) => {
    if (substring.length === 0)
      return true

    string = string.normalize('NFC')
    substring = substring.normalize('NFC')

    let scan = 0
    const sliceLen = substring.length
    for (; scan + sliceLen <= string.length; scan++) {
      const slice = string.slice(scan, scan + sliceLen)
      if (collator.value.compare(substring, slice) === 0)
        return true
    }

    return false
  }

  return {
    startsWith,
    endsWith,
    contains,
  }
}
