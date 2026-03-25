import type { Directive } from 'vue';
import type { SFCInstallWithContext, SFCWithInstall } from './typescript';
export declare const withInstall: <T, E extends Record<string, any>>(main: T, extra?: E | undefined) => SFCWithInstall<T> & E;
export declare const withInstallFunction: <T>(fn: T, name: string) => SFCInstallWithContext<T>;
export declare const withInstallDirective: <T extends Directive<any, any>>(directive: T, name: string) => SFCWithInstall<T>;
export declare const withNoopInstall: <T>(component: T) => SFCWithInstall<T>;
