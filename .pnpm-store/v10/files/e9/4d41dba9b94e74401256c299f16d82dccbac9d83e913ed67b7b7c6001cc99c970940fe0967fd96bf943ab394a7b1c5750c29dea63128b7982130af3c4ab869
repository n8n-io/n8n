export class BaseWasmFactory {
    constructor({ baseUrl }: {
        baseUrl?: null | undefined;
    });
    baseUrl: any;
    fetch({ filename }: {
        filename: any;
    }): Promise<Uint8Array<ArrayBufferLike>>;
    /**
     * @ignore
     * @returns {Promise<Uint8Array>}
     */
    _fetch(url: any): Promise<Uint8Array>;
}
export class DOMWasmFactory extends BaseWasmFactory {
    /**
     * @ignore
     */
    _fetch(url: any): Promise<Uint8Array<any>>;
}
