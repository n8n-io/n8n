declare module 'Fraction';

export interface NumeratorDenominator {
  n: number;
  d: number;
}

type FractionConstructor = {
  (fraction: Fraction): Fraction;
  (num: number | string): Fraction;
  (numerator: number, denominator: number): Fraction;
  (numbers: [number | string, number | string]): Fraction;
  (fraction: NumeratorDenominator): Fraction;
  (firstValue: Fraction | number | string | [number | string, number | string] | NumeratorDenominator, secondValue?: number): Fraction;
};

export default class Fraction {
  constructor (fraction: Fraction);
  constructor (num: number | string);
  constructor (numerator: number, denominator: number);
  constructor (numbers: [number | string, number | string]);
  constructor (fraction: NumeratorDenominator);
  constructor (firstValue: Fraction | number | string | [number | string, number | string] | NumeratorDenominator, secondValue?: number);

  s: number;
  n: number;
  d: number;

  abs(): Fraction;
  neg(): Fraction;

  add: FractionConstructor;
  sub: FractionConstructor;
  mul: FractionConstructor;
  div: FractionConstructor;
  pow: FractionConstructor;
  gcd: FractionConstructor;
  lcm: FractionConstructor;
  
  mod(n?: number | string | Fraction): Fraction;

  ceil(places?: number): Fraction;
  floor(places?: number): Fraction;
  round(places?: number): Fraction;

  inverse(): Fraction;
  
  simplify(eps?: number): Fraction;
  
  equals(n: number | string | Fraction): boolean;
  compare(n: number | string | Fraction): number;
  divisible(n: number | string | Fraction): boolean;
  
  valueOf(): number;
  toString(decimalPlaces?: number): string;
  toLatex(excludeWhole?: boolean): string;
  toFraction(excludeWhole?: boolean): string;
  toContinued(): number[];
  clone(): Fraction;
}
