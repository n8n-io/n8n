export { JestMockExtended, GlobalConfig, mockDeep, MockProxy, DeepMockProxy, CalledWithMock, mockClear, mockReset, mockFn, stub, } from './Mock';
export declare const mock: <T, MockedReturn extends { [K in keyof T]: T[K] extends (...args: infer A) => infer B ? import("./Mock").CalledWithMock<B, A> : T[K]; } & T = { [K in keyof T]: T[K] extends (...args: infer A) => infer B ? import("./Mock").CalledWithMock<B, A> : T[K]; } & T>(mockImplementation?: import("ts-essentials").DeepPartial<T>, opts?: import("./Mock").MockOpts | undefined) => MockedReturn;
export declare const calledWithFn: <T, Y extends any[]>({ fallbackMockImplementation, }?: {
    fallbackMockImplementation?: ((...args: Y) => T) | undefined;
}) => import("./Mock").CalledWithMock<T, Y>;
export * from './Matchers';
