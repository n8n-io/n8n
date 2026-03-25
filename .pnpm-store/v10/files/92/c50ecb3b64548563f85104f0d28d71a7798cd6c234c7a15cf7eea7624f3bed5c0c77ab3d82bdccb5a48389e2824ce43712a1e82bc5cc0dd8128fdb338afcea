declare function curriedMixWith2(otherColor: string): string;
declare function curriedMixWith1(color: string): typeof curriedMixWith2;
declare function curriedMixWith1(color: string, otherColor: string): string;
declare function curriedMix(weight: number | string): typeof curriedMixWith1;
declare function curriedMix(
  weight: number | string,
  color: string,
): typeof curriedMixWith2;
declare function curriedMix(
  weight: number | string,
  color: string,
  otherColor: string,
): string;

export default curriedMix;
