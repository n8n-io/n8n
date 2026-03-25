declare namespace cuid2 {
  export function getConstants(): {
    defaultLength: number
    bigLength: number
  }

  export function init(options?: {
    random?: () => number
    counter?: () => number
    length?: number
    fingerprint?: string
  }): () => string

  export function isCuid(id: string): boolean

  export function createId(): string
}

export = cuid2;
