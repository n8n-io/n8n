/**
 * Equality, using non-distributive conditional type
 */
export type AreNonDistributiveEqual<First, Second> = [First] extends [Second]
  ? [Second] extends [First]
    ? true
    : false
  : false;
