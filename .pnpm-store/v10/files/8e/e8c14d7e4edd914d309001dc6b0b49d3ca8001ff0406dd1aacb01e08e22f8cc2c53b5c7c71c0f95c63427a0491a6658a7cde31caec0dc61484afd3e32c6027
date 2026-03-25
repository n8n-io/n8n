import { Emitter } from 'strict-event-emitter';
import { H as HttpRequestEventMap, h as Interceptor } from '../../Interceptor-436630be.js';
import '@open-draft/deferred-promise';
import '@open-draft/logger';

type XMLHttpRequestEmitter = Emitter<HttpRequestEventMap>;
declare class XMLHttpRequestInterceptor extends Interceptor<HttpRequestEventMap> {
    static interceptorSymbol: symbol;
    constructor();
    protected checkEnvironment(): boolean;
    protected setup(): void;
}

export { XMLHttpRequestEmitter, XMLHttpRequestInterceptor };
