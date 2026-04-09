# Installation
> `npm install --save @types/file-saver`

# Summary
This package contains type definitions for file-saver (https://github.com/eligrey/FileSaver.js/).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/file-saver.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/file-saver/index.d.ts)
````ts
export = FileSaver;

export as namespace saveAs;

/**
 * FileSaver.js implements the saveAs() FileSaver interface in browsers that do not natively support it.
 * @param data - The actual file data blob or URL.
 * @param filename - The optional name of the file to be downloaded. If omitted, the name used in the file data will be used. If none is provided "download" will be used.
 * @param options - Optional FileSaver.js config
 */
declare function FileSaver(data: Blob | string, filename?: string, options?: FileSaver.FileSaverOptions): void;

/**
 * FileSaver.js implements the saveAs() FileSaver interface in browsers that do not natively support it.
 * @param data - The actual file data blob or URL.
 * @param filename - The optional name of the file to be downloaded. If omitted, the name used in the file data will be used. If none is provided "download" will be used.
 * @param disableAutoBOM - Optional & defaults to `true`. Set to `false` if you want FileSaver.js to automatically provide Unicode text encoding hints
 * @deprecated use `{ autoBom: false }` as the third argument
 */
// tslint:disable-next-line:unified-signatures
declare function FileSaver(data: Blob | string, filename?: string, disableAutoBOM?: boolean): void;

declare namespace FileSaver {
    interface FileSaverOptions {
        /**
         * Automatically provide Unicode text encoding hints
         * @default false
         */
        autoBom: boolean;
    }

    const saveAs: typeof FileSaver;
}

````

### Additional Details
 * Last updated: Tue, 07 Nov 2023 03:09:37 GMT
 * Dependencies: none

# Credits
These definitions were written by [Cyril Schumacher](https://github.com/cyrilschumacher), [Daniel Roth](https://github.com/DaIgeb), [HitkoDev](https://github.com/HitkoDev), [JounQin](https://github.com/JounQin), and [BendingBender](https://github.com/bendingbender).
