export { JestMockExtended, GlobalConfig, mockDeep, MockProxy, DeepMockProxy, CalledWithMock, mockClear, mockReset, mockFn, stub, } from './Mock';
export declare const mock: <T, MockedReturn extends import("./Mock")._MockProxy<T> & T = import("./Mock")._MockProxy<T> & T>(mockImplementation?: import("ts-essentials").DeepPartial<T>, opts?: import("./Mock").MockOpts | undefined) => MockedReturn;
export declare const calledWithFn: <T, Y extends any[]>({ fallbackMockImplementation, }?: {
    fallbackMockImplementation?: ((...args: Y) => T) | undefined;
}) => import("./Mock").CalledWithMock<T, Y>;
export * from './Matchers';
