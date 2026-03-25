import { R as Request, b as Response } from '../index-D3_z6QHM.mjs';
import { GatewayConfiguration } from './types.mjs';
import { Primitive } from '../types.mjs';

declare class Gateway {
    request: Request;
    configs: GatewayConfiguration;
    successCallback: (res: Response) => void;
    failCallback: (res: Response) => void;
    constructor(request: Request, configs: GatewayConfiguration);
    get(): void;
    head(): void;
    post(): void;
    put(): void;
    patch(): void;
    delete(): void;
    options(): GatewayConfiguration;
    shouldEmulateHTTP(): boolean;
    call(): Promise<any>;
    dispatchResponse(response: Response): void;
    dispatchClientError(message: string, error: Error): void;
    prepareBody(method: string, headers: Record<string, Primitive>): Primitive | null | undefined;
}

export { Gateway, Gateway as default };
