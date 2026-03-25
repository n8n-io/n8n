import type { ProtectableMap, IProtectableMapParameters } from './ProtectableMap';
/**
 * The internal wrapper used by ProtectableMap.  It extends the real `Map<K, V>` base class,
 * but hooks the destructive operations (clear/delete/set) to give the owner a chance
 * to block them.
 *
 * NOTE: This is not a public API.
 */
export declare class ProtectableMapView<K, V> extends Map<K, V> {
    private readonly _owner;
    private readonly _parameters;
    constructor(owner: ProtectableMap<K, V>, parameters: IProtectableMapParameters<K, V>);
    clear(): void;
    delete(key: K): boolean;
    set(key: K, value: V): this;
    _clearUnprotected(): void;
    _deleteUnprotected(key: K): boolean;
    _setUnprotected(key: K, value: V): void;
}
//# sourceMappingURL=ProtectableMapView.d.ts.map