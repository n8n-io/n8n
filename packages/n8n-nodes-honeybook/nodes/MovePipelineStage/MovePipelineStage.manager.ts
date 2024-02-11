import { honeyBookApiRequest } from "../../utils/transport.utils";
import { IExecuteFunctions, JsonObject } from "n8n-workflow";

export class MovePipelineStageManager {
    requestIndex: number;
    executeContext: IExecuteFunctions;

    constructor(executeContext: IExecuteFunctions, requestIndex: number){
        this.executeContext = executeContext;
        this.requestIndex = requestIndex;
    }

    async movePipelineStage(): Promise<JsonObject> {
        const userRequest = this.executeContext.getNodeParameter('taskDescription', this.requestIndex) as string;
		const requestParams = {
			nodeExecutionContext: this.executeContext,
			method: 'GET',
            host: 'https://mocki.io',
            resource: 'v1/96f209a6-1793-4398-9704-0ff9739d3cae',
			//body: {userRequest},
		};
		
		return await honeyBookApiRequest(requestParams);
	}
}