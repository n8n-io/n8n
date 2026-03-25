export const FingerprintTraitSymbol: unique symbol;
export function fingerprint(a: Fingerprintable): string;
/**
 * When implementing this trait, it is recommended to write some sort of "magic number" first to
 * ensure that different types of objects don't have the same fingerprint.
 *
 * The recommended pracice is to generate a random u32 number as your magic number. e.g. using
 * `console.log(random.uint32().toString(16))`
 */
export type Fingerprintable = {
    [FingerprintTraitSymbol]: () => string;
} | import("../encoding.js").AnyEncodable;
//# sourceMappingURL=fingerprint.d.ts.map