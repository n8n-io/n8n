import { type Oas3Responses } from '@redocly/openapi-core/lib/typings/openapi';
import { type OperationMethod, type TestContext } from '../../types';
export type DescriptionSource = {
    operationId?: string;
    operationPath?: string;
};
export type OperationDetails = {
    method: OperationMethod;
    path: string;
    descriptionName: string;
    servers?: Array<{
        url: string;
    }>;
    responses: Oas3Responses;
};
export declare function getOperationFromDescription(path: string, method: string, descriptionPaths: Record<string, any>): Record<string, string> | undefined;
export declare function getOperationFromDescriptionBySource(source: DescriptionSource, ctx: TestContext): (OperationDetails & Record<string, any>) | undefined;
//# sourceMappingURL=get-operation-from-description.d.ts.map