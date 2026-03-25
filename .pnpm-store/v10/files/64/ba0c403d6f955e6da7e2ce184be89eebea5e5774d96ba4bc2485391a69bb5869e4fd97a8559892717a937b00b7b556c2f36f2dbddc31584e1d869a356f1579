declare const __brand: unique symbol;
type BrandSymbol<B> = {
    [__brand]: B;
};
export type BrandedType<T, B> = T & BrandSymbol<B>;
export {};
