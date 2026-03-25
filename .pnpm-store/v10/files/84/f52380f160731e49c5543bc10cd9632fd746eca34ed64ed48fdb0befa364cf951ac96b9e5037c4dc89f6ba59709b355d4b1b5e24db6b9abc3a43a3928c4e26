import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";

//#region src/util/openapi.d.ts
declare class OpenAPISpec {
  document: OpenAPIV3_1.Document;
  constructor(document: OpenAPIV3_1.Document);
  get baseUrl(): string | undefined;
  getPathsStrict(): OpenAPIV3_1.PathsObject<{}, {}>;
  getParametersStrict(): Record<string, OpenAPIV3.ParameterObject | OpenAPIV3_1.ReferenceObject>;
  getSchemasStrict(): Record<string, OpenAPIV3_1.SchemaObject>;
  getRequestBodiesStrict(): Record<string, OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.RequestBodyObject>;
  getPathStrict(path: string): Omit<OpenAPIV3.PathItemObject<{}>, "parameters" | "servers"> & {
    servers?: OpenAPIV3_1.ServerObject[] | undefined;
    parameters?: (OpenAPIV3.ParameterObject | OpenAPIV3_1.ReferenceObject)[] | undefined;
  } & {
    delete?: OpenAPIV3_1.OperationObject<{}> | undefined;
    get?: OpenAPIV3_1.OperationObject<{}> | undefined;
    head?: OpenAPIV3_1.OperationObject<{}> | undefined;
    options?: OpenAPIV3_1.OperationObject<{}> | undefined;
    patch?: OpenAPIV3_1.OperationObject<{}> | undefined;
    post?: OpenAPIV3_1.OperationObject<{}> | undefined;
    put?: OpenAPIV3_1.OperationObject<{}> | undefined;
    trace?: OpenAPIV3_1.OperationObject<{}> | undefined;
  };
  getReferencedParameter(ref: OpenAPIV3_1.ReferenceObject): OpenAPIV3.ParameterObject | OpenAPIV3_1.ReferenceObject;
  getRootReferencedParameter(ref: OpenAPIV3_1.ReferenceObject): OpenAPIV3_1.ParameterObject;
  getReferencedSchema(ref: OpenAPIV3_1.ReferenceObject): OpenAPIV3_1.SchemaObject;
  getSchema(schema: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject): OpenAPIV3_1.SchemaObject;
  getRootReferencedSchema(ref: OpenAPIV3_1.ReferenceObject): OpenAPIV3.ParameterObject;
  getReferencedRequestBody(ref: OpenAPIV3_1.ReferenceObject): OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.RequestBodyObject;
  getRootReferencedRequestBody(ref: OpenAPIV3_1.ReferenceObject): OpenAPIV3_1.RequestBodyObject;
  getMethodsForPath(path: string): OpenAPIV3.HttpMethods[];
  getParametersForPath(path: string): OpenAPIV3.ParameterObject[];
  getOperation(path: string, method: OpenAPIV3.HttpMethods): {
    tags?: string[] | undefined;
    summary?: string | undefined;
    description?: string | undefined;
    externalDocs?: OpenAPIV3.ExternalDocumentationObject | undefined;
    operationId?: string | undefined;
    parameters?: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[] | undefined;
    requestBody?: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject | undefined;
    responses: OpenAPIV3.ResponsesObject;
    callbacks?: {
      [callback: string]: OpenAPIV3.CallbackObject | OpenAPIV3.ReferenceObject;
    } | undefined;
    deprecated?: boolean | undefined;
    security?: OpenAPIV3.SecurityRequirementObject[] | undefined;
    servers?: OpenAPIV3.ServerObject[] | undefined;
  } & Omit<{
    tags?: string[] | undefined;
    summary?: string | undefined;
    description?: string | undefined;
    externalDocs?: OpenAPIV3.ExternalDocumentationObject | undefined;
    operationId?: string | undefined;
    parameters?: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[] | undefined;
    requestBody?: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject | undefined;
    responses: OpenAPIV3.ResponsesObject;
    callbacks?: {
      [callback: string]: OpenAPIV3.CallbackObject | OpenAPIV3.ReferenceObject;
    } | undefined;
    deprecated?: boolean | undefined;
    security?: OpenAPIV3.SecurityRequirementObject[] | undefined;
    servers?: OpenAPIV3.ServerObject[] | undefined;
  }, "callbacks" | "parameters" | "requestBody" | "responses" | "servers"> & {
    parameters?: (OpenAPIV3.ParameterObject | OpenAPIV3_1.ReferenceObject)[] | undefined;
    requestBody?: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.RequestBodyObject | undefined;
    responses?: OpenAPIV3_1.ResponsesObject | undefined;
    callbacks?: Record<string, OpenAPIV3_1.CallbackObject | OpenAPIV3_1.ReferenceObject> | undefined;
    servers?: OpenAPIV3_1.ServerObject[] | undefined;
  };
  getParametersForOperation(operation: OpenAPIV3_1.OperationObject): OpenAPIV3.ParameterObject[];
  getRequestBodyForOperation(operation: OpenAPIV3_1.OperationObject): OpenAPIV3_1.RequestBodyObject;
  static getCleanedOperationId(operation: OpenAPIV3_1.OperationObject, path: string, method: OpenAPIV3_1.HttpMethods): string;
  static alertUnsupportedSpec(document: Record<string, any>): void;
  static fromObject(document: Record<string, any>): OpenAPISpec;
  static fromString(rawString: string): OpenAPISpec;
  static fromURL(url: string): Promise<OpenAPISpec>;
}
//#endregion
export { OpenAPISpec };
//# sourceMappingURL=openapi.d.cts.map