import { sprintf } from 'sprintf-js';

/**
 * @returns {String} the string with all zeroes contained in a <span>
 */
export function spanAllZeroes(s: string): string {
  return s.replace(/(0+)/g, '<span class="zero">$1</span>');
}

/**
 * @returns {String} the string with each character contained in a <span>
 */
export function spanAll(s: string, offset: number = 0): string {
  const letters = s.split('');

  return letters
    .map(
      (n, i) =>
        sprintf(
          '<span class="digit value-%s position-%d">%s</span>',
          n,
          i + offset,
          spanAllZeroes(n)
        ) // XXX Use #base-2 .value-0 instead?
    )
    .join('');
}

function spanLeadingZeroesSimple(group: string): string {
  return group.replace(/^(0+)/, '<span class="zero">$1</span>');
}

/**
 * @returns {String} the string with leading zeroes contained in a <span>
 */
export function spanLeadingZeroes(address: string): string {
  const groups = address.split(':');

  return groups.map((g) => spanLeadingZeroesSimple(g)).join(':');
}

/**
 * Groups an address
 * @returns {String} a grouped address
 */
export function simpleGroup(addressString: string, offset: number = 0): string[] {
  const groups = addressString.split(':');

  return groups.map((g, i) => {
    if (/group-v4/.test(g)) {
      return g;
    }

    return sprintf(
      '<span class="hover-group group-%d">%s</span>',
      i + offset,
      spanLeadingZeroesSimple(g)
    );
  });
}
