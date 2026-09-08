import type { IExecuteFunctions, IDataObject, ILoadOptionsFunctions, IHttpRequestMethods } from 'n8n-workflow';
export declare function elasticSecurityApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, endpoint: string, body?: IDataObject, qs?: IDataObject): Promise<any>;
export declare function elasticSecurityApiRequestAllItems(this: IExecuteFunctions, method: IHttpRequestMethods, endpoint: string, body?: IDataObject, qs?: IDataObject): Promise<IDataObject[]>;
export declare function handleListing(this: IExecuteFunctions, method: IHttpRequestMethods, endpoint: string, body?: IDataObject, qs?: IDataObject): Promise<IDataObject[]>;
/**
 * Retrieve a connector name and type from a connector ID.
 *
 * https://www.elastic.co/guide/en/kibana/master/get-connector-api.html
 */
export declare function getConnector(this: IExecuteFunctions, connectorId: string): Promise<{
    id: string;
    name: string;
    type: import("./types").ConnectorType;
}>;
export declare function throwOnEmptyUpdate(this: IExecuteFunctions, resource: string): void;
export declare function getVersion(this: IExecuteFunctions, endpoint: string): Promise<string>;
//# sourceMappingURL=GenericFunctions.d.ts.map