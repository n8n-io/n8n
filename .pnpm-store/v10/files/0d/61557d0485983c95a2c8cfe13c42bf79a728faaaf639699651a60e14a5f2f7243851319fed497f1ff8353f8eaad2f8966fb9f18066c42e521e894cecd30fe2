/**
 * Checks to see if a value is not only a `Date` object,
 * but a *valid* `Date` object that can be converted to a
 * number. For example, `new Date('blah')` is indeed an
 * `instanceof Date`, however it cannot be converted to a
 * number.
 */
export function isValidDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value as any);
}
