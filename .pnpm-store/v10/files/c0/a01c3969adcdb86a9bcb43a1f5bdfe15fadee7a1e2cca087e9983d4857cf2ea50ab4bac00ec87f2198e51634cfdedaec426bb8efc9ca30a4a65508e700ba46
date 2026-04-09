import type { DeletedKeyBundle, DeletedKeyItem, KeyRotationPolicy as GeneratedPolicy, KeyBundle, KeyItem } from "./generated/models/index.js";
import type { DeletedKey, KeyProperties, KeyRotationPolicy, KeyRotationPolicyProperties, KeyVaultKey } from "./keysModels.js";
import type { PagedAsyncIterableIterator } from "./generated/index.js";
import type { OperationOptions } from "@azure-rest/core-client";
/**
 * @internal
 * Shapes the exposed {@link KeyVaultKey} based on either a received key bundle or deleted key bundle.
 */
export declare function getKeyFromKeyBundle(bundle: KeyBundle | DeletedKeyBundle): KeyVaultKey | DeletedKey;
/**
 * @internal
 * Shapes the exposed {@link DeletedKey} based on a received KeyItem.
 */
export declare function getDeletedKeyFromDeletedKeyItem(keyItem: DeletedKeyItem): DeletedKey;
/**
 * @internal
 * Shapes the exposed {@link KeyProperties} based on a received KeyItem.
 */
export declare function getKeyPropertiesFromKeyItem(keyItem: KeyItem): KeyProperties;
/**
 * @internal
 */
export declare const keyRotationTransformations: {
    propertiesToGenerated: (parameters: KeyRotationPolicyProperties) => Partial<GeneratedPolicy>;
    generatedToPublic(generated: GeneratedPolicy): KeyRotationPolicy;
};
/**
 * A helper supporting compatibility between modular and legacy paged async iterables.
 *
 * Provides the following compatibility:
 * 1. Maps the values of the paged async iterable using the provided mapper function.
 * 2. Supports `maxPageSize` operation on the paged async iterable.
 *
 * TODO: move this to keyvault-common once everything is merged
 */
export declare function mapPagedAsyncIterable<TGenerated, TPublic, TOptions extends OperationOptions & {
    maxresults?: number;
}>(options: TOptions, operation: (options: TOptions) => PagedAsyncIterableIterator<TGenerated>, mapper: (x: TGenerated) => TPublic): PagedAsyncIterableIterator<TPublic>;
//# sourceMappingURL=transformations.d.ts.map