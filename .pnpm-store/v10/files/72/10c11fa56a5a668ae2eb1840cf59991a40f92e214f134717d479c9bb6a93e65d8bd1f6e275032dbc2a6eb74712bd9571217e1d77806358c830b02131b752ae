import type { ExtendedOperation, TestContext } from '../../types';
import type { OperationDetails } from '../description-parser';
export type GetServerUrlInput = {
    ctx: TestContext;
    descriptionName?: string;
    openapiOperation?: (OperationDetails & Record<string, any>) | undefined;
    xOperation?: ExtendedOperation;
};
export type ServerObject = {
    url: string;
    description?: string;
    variables?: Record<string, {
        default: string;
        enum?: string[];
        description?: string;
    }>;
};
export declare function getServerUrl({ ctx, descriptionName, openapiOperation, xOperation, }: GetServerUrlInput): {
    url: string;
} | undefined;
//# sourceMappingURL=get-server-url.d.ts.map