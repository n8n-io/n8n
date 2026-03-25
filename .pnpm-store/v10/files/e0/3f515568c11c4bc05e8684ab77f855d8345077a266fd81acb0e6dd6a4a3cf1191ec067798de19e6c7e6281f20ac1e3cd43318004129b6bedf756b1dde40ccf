import { TarOptions, TarOptionsAsyncFile, TarOptionsAsyncNoFile, TarOptionsSyncFile, TarOptionsSyncNoFile, TarOptionsWithAliases, TarOptionsWithAliasesAsync, TarOptionsWithAliasesAsyncFile, TarOptionsWithAliasesAsyncNoFile, TarOptionsWithAliasesFile, TarOptionsWithAliasesNoFile, TarOptionsWithAliasesSync, TarOptionsWithAliasesSyncFile, TarOptionsWithAliasesSyncNoFile } from './options.js';
export type CB = (er?: Error) => any;
export type TarCommand<AsyncClass, SyncClass extends {
    sync: true;
}> = {
    (): AsyncClass;
    (opt: TarOptionsWithAliasesAsyncNoFile): AsyncClass;
    (entries: string[]): AsyncClass;
    (opt: TarOptionsWithAliasesAsyncNoFile, entries: string[]): AsyncClass;
} & {
    (opt: TarOptionsWithAliasesSyncNoFile): SyncClass;
    (opt: TarOptionsWithAliasesSyncNoFile, entries: string[]): SyncClass;
} & {
    (opt: TarOptionsWithAliasesAsyncFile): Promise<void>;
    (opt: TarOptionsWithAliasesAsyncFile, entries: string[]): Promise<void>;
    (opt: TarOptionsWithAliasesAsyncFile, cb: CB): Promise<void>;
    (opt: TarOptionsWithAliasesAsyncFile, entries: string[], cb: CB): Promise<void>;
} & {
    (opt: TarOptionsWithAliasesSyncFile): void;
    (opt: TarOptionsWithAliasesSyncFile, entries: string[]): void;
} & {
    (opt: TarOptionsWithAliasesSync): typeof opt extends (TarOptionsWithAliasesFile) ? void : typeof opt extends TarOptionsWithAliasesNoFile ? SyncClass : void | SyncClass;
    (opt: TarOptionsWithAliasesSync, entries: string[]): typeof opt extends TarOptionsWithAliasesFile ? void : typeof opt extends TarOptionsWithAliasesNoFile ? SyncClass : void | SyncClass;
} & {
    (opt: TarOptionsWithAliasesAsync): typeof opt extends (TarOptionsWithAliasesFile) ? Promise<void> : typeof opt extends TarOptionsWithAliasesNoFile ? AsyncClass : Promise<void> | AsyncClass;
    (opt: TarOptionsWithAliasesAsync, entries: string[]): typeof opt extends TarOptionsWithAliasesFile ? Promise<void> : typeof opt extends TarOptionsWithAliasesNoFile ? AsyncClass : Promise<void> | AsyncClass;
    (opt: TarOptionsWithAliasesAsync, cb: CB): Promise<void>;
    (opt: TarOptionsWithAliasesAsync, entries: string[], cb: CB): typeof opt extends TarOptionsWithAliasesFile ? Promise<void> : typeof opt extends TarOptionsWithAliasesNoFile ? never : Promise<void>;
} & {
    (opt: TarOptionsWithAliasesFile): Promise<void> | void;
    (opt: TarOptionsWithAliasesFile, entries: string[]): typeof opt extends TarOptionsWithAliasesSync ? void : typeof opt extends TarOptionsWithAliasesAsync ? Promise<void> : Promise<void> | void;
    (opt: TarOptionsWithAliasesFile, cb: CB): Promise<void>;
    (opt: TarOptionsWithAliasesFile, entries: string[], cb: CB): typeof opt extends TarOptionsWithAliasesSync ? never : typeof opt extends TarOptionsWithAliasesAsync ? Promise<void> : Promise<void>;
} & {
    (opt: TarOptionsWithAliasesNoFile): typeof opt extends (TarOptionsWithAliasesSync) ? SyncClass : typeof opt extends TarOptionsWithAliasesAsync ? AsyncClass : SyncClass | AsyncClass;
    (opt: TarOptionsWithAliasesNoFile, entries: string[]): typeof opt extends TarOptionsWithAliasesSync ? SyncClass : typeof opt extends TarOptionsWithAliasesAsync ? AsyncClass : SyncClass | AsyncClass;
} & {
    (opt: TarOptionsWithAliases): typeof opt extends (TarOptionsWithAliasesFile) ? typeof opt extends TarOptionsWithAliasesSync ? void : typeof opt extends TarOptionsWithAliasesAsync ? Promise<void> : void | Promise<void> : typeof opt extends TarOptionsWithAliasesNoFile ? typeof opt extends TarOptionsWithAliasesSync ? SyncClass : typeof opt extends TarOptionsWithAliasesAsync ? AsyncClass : SyncClass | AsyncClass : typeof opt extends TarOptionsWithAliasesSync ? SyncClass | void : typeof opt extends TarOptionsWithAliasesAsync ? AsyncClass | Promise<void> : SyncClass | void | AsyncClass | Promise<void>;
} & {
    syncFile: (opt: TarOptionsSyncFile, entries: string[]) => void;
    asyncFile: (opt: TarOptionsAsyncFile, entries: string[], cb?: CB) => Promise<void>;
    syncNoFile: (opt: TarOptionsSyncNoFile, entries: string[]) => SyncClass;
    asyncNoFile: (opt: TarOptionsAsyncNoFile, entries: string[]) => AsyncClass;
    validate?: (opt: TarOptions, entries?: string[]) => void;
};
export declare const makeCommand: <AsyncClass, SyncClass extends {
    sync: true;
}>(syncFile: (opt: TarOptionsSyncFile, entries: string[]) => void, asyncFile: (opt: TarOptionsAsyncFile, entries: string[], cb?: CB) => Promise<void>, syncNoFile: (opt: TarOptionsSyncNoFile, entries: string[]) => SyncClass, asyncNoFile: (opt: TarOptionsAsyncNoFile, entries: string[]) => AsyncClass, validate?: (opt: TarOptions, entries?: string[]) => void) => TarCommand<AsyncClass, SyncClass>;
//# sourceMappingURL=make-command.d.ts.map