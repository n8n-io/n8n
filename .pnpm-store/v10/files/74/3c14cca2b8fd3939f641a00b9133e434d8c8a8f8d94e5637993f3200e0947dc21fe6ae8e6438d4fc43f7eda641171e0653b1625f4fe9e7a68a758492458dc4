/// <reference types="jest" />
import { MatchersOrLiterals } from './Matchers';
import { DeepPartial } from 'ts-essentials';
type ProxiedProperty = string | number | symbol;
export interface GlobalConfig {
    ignoreProps?: ProxiedProperty[];
}
export declare const JestMockExtended: {
    DEFAULT_CONFIG: GlobalConfig;
    configure: (config: GlobalConfig) => void;
    resetConfig: () => void;
};
export interface CalledWithMock<T, Y extends any[]> extends jest.Mock<T, Y> {
    calledWith: (...args: Y | MatchersOrLiterals<Y>) => jest.Mock<T, Y>;
}
export type _MockProxy<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer B ? T[K] & CalledWithMock<B, A> : T[K];
};
export type MockProxy<T> = _MockProxy<T> & T;
export type _DeepMockProxy<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer B ? T[K] & CalledWithMock<B, A> : T[K] & _DeepMockProxy<T[K]>;
};
export type DeepMockProxy<T> = _DeepMockProxy<T> & T;
export type _DeepMockProxyWithFuncPropSupport<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer B ? CalledWithMock<B, A> & DeepMockProxy<T[K]> : DeepMockProxy<T[K]>;
};
export type DeepMockProxyWithFuncPropSupport<T> = _DeepMockProxyWithFuncPropSupport<T> & T;
export interface MockOpts {
    deep?: boolean;
    fallbackMockImplementation?: (...args: any[]) => any;
}
export declare const mockClear: (mock: MockProxy<any>) => any;
export declare const mockReset: (mock: MockProxy<any>) => any;
export declare function mockDeep<T>(opts: {
    funcPropSupport?: true;
    fallbackMockImplementation?: MockOpts['fallbackMockImplementation'];
}, mockImplementation?: DeepPartial<T>): DeepMockProxyWithFuncPropSupport<T>;
export declare function mockDeep<T>(mockImplementation?: DeepPartial<T>): DeepMockProxy<T>;
declare const mock: <T, MockedReturn extends _MockProxy<T> & T = _MockProxy<T> & T>(mockImplementation?: DeepPartial<T>, opts?: MockOpts) => MockedReturn;
export declare const mockFn: <T extends Function, A extends any[] = T extends (...args: infer AReal) => any ? AReal : any[], R = T extends (...args: any) => infer RReal ? RReal : any>() => CalledWithMock<R, A> & T;
export declare const stub: <T extends object>() => T;
export default mock;
