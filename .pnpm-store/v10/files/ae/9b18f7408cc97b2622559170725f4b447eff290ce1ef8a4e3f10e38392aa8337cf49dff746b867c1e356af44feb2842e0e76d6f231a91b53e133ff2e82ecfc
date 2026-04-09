export interface Cache {
  set(key: string, value: any): value
  get(key: string): any
  clear(): void
}

export interface Expr {
  setConfig(config: { contentSecurityPolicy: boolean }): void

  Cache: {
    new (maxSize: number): Cache
  }

  split(path: string): string[]
  setter(path: string): (data: any, value: any) => any
  getter(path: string, safe?: boolean): (data: any) => any
  join(segments: string[]): string
  forEach(
    path: string | string[],
    callback: (
      part: string,
      isBracket: boolean,
      isArray: boolean,
      idx: number,
      parts: string[]
    ) => any
  ): void
}

declare const expr: Expr
export default expr
