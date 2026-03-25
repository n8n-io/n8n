export type RemoveIndex<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K]
}

export const uppercase = <S extends string>(str: S): Uppercase<S> => str.toUpperCase() as Uppercase<S>

/**
 * Convert Headers instance into regular object
 */
export const HeadersInstanceToPlainObject = (headers: Response['headers']): Record<string, string> => {
  const o: Record<string, string> = {}
  headers.forEach((v, k) => {
    o[k] = v
  })
  return o
}
