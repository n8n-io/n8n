export const RANGE_EMPTY = 2
export const RANGE_LB_INC = 4
export const RANGE_UB_INC = 8
export const RANGE_LB_INF = 16
export const RANGE_UB_INF = 32

export class Range<T> {
  constructor(lower: T | null, upper: T | null, mask: number);
  lower: T | null;
  upper: T | null;
  hasMask (flag: number): boolean;
  isEmpty (): boolean;
  isBounded (): boolean;
  isLowerBoundClosed (): boolean;
  isUpperBoundClosed (): boolean;
  hasLowerBound (): boolean;
  hasUpperBound (): boolean;

  containsPoint (point: T): boolean;
  containsRange (range: Range<T>): boolean;

  toPostgres (prepareValue: (value: any) => string): string;
}

export function parse(input: string): Range<string>;
export function parse<T>(source: string, transform: (value: string) => T): Range<T>;
export function serialize<T>(range: Range<T>): string;
export function serialize<T>(range: Range<T>, format: (value: T) => string): string;
