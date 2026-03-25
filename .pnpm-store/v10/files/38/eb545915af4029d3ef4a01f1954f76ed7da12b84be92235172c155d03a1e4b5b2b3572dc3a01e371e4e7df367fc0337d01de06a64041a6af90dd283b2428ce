export function stringify(value: any, replacer?: (key: string, value: any) => any, space?: string | number): string;
export function stringify(value: any, replacer?: (number | string)[] | null, space?: string | number): string;

export interface StringifyOptions {
  bigint?: boolean,
  circularValue?: string | null | TypeErrorConstructor | ErrorConstructor,
  deterministic?: boolean,
  maximumBreadth?: number,
  maximumDepth?: number,
  strict?: boolean,
}

export namespace stringify {
  export function configure(options: StringifyOptions): typeof stringify;
}

export function configure(options: StringifyOptions): typeof stringify;

export default stringify;
