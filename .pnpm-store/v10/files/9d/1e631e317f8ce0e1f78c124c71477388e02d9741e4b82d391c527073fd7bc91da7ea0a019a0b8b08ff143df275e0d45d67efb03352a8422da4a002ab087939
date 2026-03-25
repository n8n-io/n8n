import { type Minipass } from 'minipass';
/** has a warn method */
export type Warner = {
    warn(code: string, message: string | Error, data: any): void;
    file?: string;
    cwd?: string;
    strict?: boolean;
    emit(event: 'warn', code: string, message: string, data?: WarnData): void;
    emit(event: 'error', error: TarError): void;
};
export type WarnEvent<T = Buffer> = Minipass.Events<T> & {
    warn: [code: string, message: string, data: WarnData];
};
export type WarnData = {
    file?: string;
    cwd?: string;
    code?: string;
    tarCode?: string;
    recoverable?: boolean;
    [k: string]: any;
};
export type TarError = Error & WarnData;
export declare const warnMethod: (self: Warner, code: string, message: string | Error, data?: WarnData) => void;
//# sourceMappingURL=warn-method.d.ts.map