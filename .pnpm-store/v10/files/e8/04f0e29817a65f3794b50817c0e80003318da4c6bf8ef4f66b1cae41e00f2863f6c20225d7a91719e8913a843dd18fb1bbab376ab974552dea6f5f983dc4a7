// Adjusted from type definitions for rusha 0.8
// Project: https://github.com/srijs/rusha#readme
// Definitions by: Jacopo Scazzosi <https://github.com/jacoscaz>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// Minimum TypeScript Version: 4.0

/// <reference types="node" />

interface Hash {
  update(value: string | number[] | ArrayBuffer | Buffer): Hash
  digest(encoding?: undefined): ArrayBuffer
  digest(encoding: 'hex'): string
}

interface Rusha {
  createHash(): Hash
}

declare const Rusha: Rusha

declare module 'rusha' {
  export = Rusha
}
