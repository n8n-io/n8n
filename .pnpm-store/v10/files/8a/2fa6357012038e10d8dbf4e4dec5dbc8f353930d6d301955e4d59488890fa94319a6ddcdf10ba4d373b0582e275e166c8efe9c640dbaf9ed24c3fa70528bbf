/**
 * Allowed arithmetic operators
 */
export type CompareOperator = '>' | '>=' | '=' | '<' | '<=' | '!=';

export const semver =
  /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;

export const validateAndParse = (version: string) => {
  if (typeof version !== 'string') {
    throw new TypeError('Invalid argument expected string');
  }
  const match = version.match(semver);
  if (!match) {
    throw new Error(
      `Invalid argument not valid semver ('${version}' received)`
    );
  }
  match.shift();
  return match;
};

const isWildcard = (s: string) => s === '*' || s === 'x' || s === 'X';

const tryParse = (v: string) => {
  const n = parseInt(v, 10);
  return isNaN(n) ? v : n;
};

const forceType = (a: string | number, b: string | number) =>
  typeof a !== typeof b ? [String(a), String(b)] : [a, b];

const compareStrings = (a: string, b: string) => {
  if (isWildcard(a) || isWildcard(b)) return 0;
  const [ap, bp] = forceType(tryParse(a), tryParse(b));
  if (ap > bp) return 1;
  if (ap < bp) return -1;
  return 0;
};

export const compareSegments = (
  a: string | string[] | RegExpMatchArray,
  b: string | string[] | RegExpMatchArray
) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const r = compareStrings(a[i] || '0', b[i] || '0');
    if (r !== 0) return r;
  }
  return 0;
};
