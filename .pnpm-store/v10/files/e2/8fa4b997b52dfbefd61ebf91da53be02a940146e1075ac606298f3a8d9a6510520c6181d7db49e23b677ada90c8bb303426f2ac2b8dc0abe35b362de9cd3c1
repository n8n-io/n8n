import type { ParameterWithIn } from '../config-parser';
import type { TestContext, Step } from '../../types';
import type { OperationDetails } from '../description-parser';
export type RequestData = {
    serverUrl?: {
        url: string;
    };
    path: string;
    method: string;
    parameters: ParameterWithIn[];
    requestBody: any;
    openapiOperation?: OperationDetails & Record<string, string>;
};
export declare function prepareRequest(ctx: TestContext, step: Step, workflowName: string): Promise<RequestData>;
//# sourceMappingURL=prepare-request.d.ts.map