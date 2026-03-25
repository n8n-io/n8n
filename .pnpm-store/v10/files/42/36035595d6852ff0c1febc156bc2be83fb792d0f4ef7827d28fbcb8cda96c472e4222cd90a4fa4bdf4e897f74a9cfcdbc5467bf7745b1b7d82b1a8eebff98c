/**
 * @fileoverview Types for this package.
 */
import type { Linter } from "eslint";
/**
 * Infinite array type.
 */
export type InfiniteArray<T> = T | InfiniteArray<T>[];
/**
 * The type of array element in the `extends` property after flattening.
 */
export type SimpleExtendsElement = string | Linter.Config;
/**
 * The type of array element in the `extends` property before flattening.
 */
export type ExtendsElement = SimpleExtendsElement | InfiniteArray<Linter.Config>;
/**
 * Config with extends. Valid only inside of `defineConfig()`.
 */
export interface ConfigWithExtends extends Linter.Config {
    extends?: ExtendsElement[];
}
export type ConfigWithExtendsArray = InfiniteArray<ConfigWithExtends>[];
