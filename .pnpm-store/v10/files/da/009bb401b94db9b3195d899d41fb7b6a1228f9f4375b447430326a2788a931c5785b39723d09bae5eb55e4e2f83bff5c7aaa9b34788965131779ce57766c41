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
      (n, i) => `<span class="digit value-${n} position-${i + offset}">${spanAllZeroes(n)}</span>`,
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

    return `<span class="hover-group group-${i + offset}">${spanLeadingZeroesSimple(g)}</span>`;
  });
}
