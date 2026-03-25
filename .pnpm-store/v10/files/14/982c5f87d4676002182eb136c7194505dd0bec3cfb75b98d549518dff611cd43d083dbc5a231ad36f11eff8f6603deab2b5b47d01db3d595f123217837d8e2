import { Fork } from "./types";
export default function (fork: Fork): {
    geq: (than: any) => import("./types").Type<unknown>;
    defaults: {
        null: () => null;
        emptyArray: () => never[];
        false: () => boolean;
        true: () => boolean;
        undefined: () => void;
        "use strict": () => string;
    };
    isPrimitive: import("./types").Type<unknown>;
};
interface NodeModule {
    exports: {
        default?: any;
        __esModule?: boolean;
    };
}
export declare function maybeSetModuleExports(moduleGetter: () => NodeModule): void;
export {};
