import type { Module, ModuleName } from '../interfaces/iModule';
import type { RowModelType } from '../interfaces/iRowModel';
export declare function _registerModule(module: Module, gridId: string | undefined, isInternalRegistration?: boolean): void;
export declare function _unRegisterGridModules(gridId: string): void;
export declare function _isModuleRegistered(moduleName: ModuleName, gridId: string, rowModel: RowModelType): boolean;
export declare function _areModulesGridScoped(): boolean;
export declare function _getRegisteredModules(gridId: string, rowModel: RowModelType): Module[];
export declare function _getAllRegisteredModules(): Set<Module>;
export declare function _getGridRegisteredModules(gridId: string, rowModel: RowModelType): Module[];
/** Internal logic to track if the user has registered modules so that we can give an optimised error message. */
export declare function _hasUserRegistered(): boolean;
export declare function _isUmd(): boolean;
/** Internal use to provide clear error messages for UMD users. */
export declare function _setUmd(): void;
export declare class ModuleRegistry {
    /**
     * @deprecated v33 Use `registerModules([module])` instead.
     */
    static register(module: Module): void;
    /**
     * Globally register the given modules for all grids.
     * @param modules - modules to register
     */
    static registerModules(modules: Module[]): void;
}
