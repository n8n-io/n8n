declare var flatten: FlatTypes.Flatten;

export = flatten;

declare namespace FlatTypes {
    interface FlattenOptions {
        delimiter?: string | undefined;
        safe?: boolean | undefined;
        maxDepth?: number | undefined;
        transformKey?: ((key: string) => string) | undefined;
    }

    interface Flatten {
        <TTarget, TResult>(
            target: TTarget,
            options?: FlattenOptions,
        ): TResult;

        flatten: Flatten;
        unflatten: Unflatten;
    }

    interface UnflattenOptions {
        delimiter?: string | undefined;
        object?: boolean | undefined;
        overwrite?: boolean | undefined;
        transformKey?: ((key: string) => string) | undefined;
    }

    interface Unflatten {
        <TTarget, TResult>(
            target: TTarget,
            options?: UnflattenOptions,
        ): TResult;
    }
}
