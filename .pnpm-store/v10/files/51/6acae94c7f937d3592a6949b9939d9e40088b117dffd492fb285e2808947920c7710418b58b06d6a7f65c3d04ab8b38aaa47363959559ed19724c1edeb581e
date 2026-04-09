export type Primitive = string | number | boolean

export interface Hash {
  [key: string]: Primitive
}

export interface Headers {
  readonly [key: string]: Primitive
}

export type Body = Record<string, unknown> | string

export interface Auth {
  username?: string
  password?: string
  readonly [key: string]: Primitive | undefined
}

export interface Params {
  readonly [key: string]: object | Primitive | undefined | null
}

export interface NestedParam {
  // We need the NestedParamArray here for circularity
  [param: string]: Primitive | undefined | null | NestedParam | NestedParamArray
}

// Eslint will try to fix this to a type, but we need it as an interface for the recursability

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NestedParamArray extends Array<Primitive | NestedParam | NestedParamArray> {}

export interface RequestParams {
  readonly auth?: Auth
  readonly body?: Body
  readonly headers?: Headers
  readonly host?: string
  readonly path?: string
  readonly params?: Params
  readonly timeout?: number
  readonly signal?: AbortSignal
  [param: string]: object | Primitive | undefined | null | NestedParam | NestedParamArray
}

export type ParameterEncoderFn = (arg: Primitive) => string
