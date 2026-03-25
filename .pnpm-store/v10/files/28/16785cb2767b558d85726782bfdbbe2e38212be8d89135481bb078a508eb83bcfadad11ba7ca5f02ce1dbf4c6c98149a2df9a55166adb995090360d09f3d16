import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { GridApi } from './gridApi';
import type { ApiFunction, ApiFunctionName } from './iApiFunction';
export declare class ApiFunctionService extends BeanStub implements NamedBean {
    beanName: "apiFunctionSvc";
    readonly api: GridApi;
    private fns;
    private preDestroyLink;
    constructor();
    postConstruct(): void;
    addFunction<TFunctionName extends ApiFunctionName>(functionName: TFunctionName, func: ApiFunction<TFunctionName>): void;
    private makeApi;
    private apiNotFound;
    destroy(): void;
}
