// `AbortSignal` is defined here to prevent a dependency on a particular
// implementation like the `abort-controller` package, and to avoid requiring
// the `dom` library in `tsconfig.json`.

export interface AbortSignal {
    aborted: boolean;
    reason: any;

    addEventListener: (
        type: "abort",
        listener: (this: AbortSignal, event: any) => any,
        options?: boolean | {
            capture?: boolean | undefined;
            once?: boolean | undefined;
            passive?: boolean | undefined;
        },
    ) => void;

    removeEventListener: (
        type: "abort",
        listener: (this: AbortSignal, event: any) => any,
        options?: boolean | {
            capture?: boolean | undefined;
        },
    ) => void;

    dispatchEvent: (event: any) => boolean;

    onabort: null | ((this: AbortSignal, event: any) => any);

    throwIfAborted(): void;
}
