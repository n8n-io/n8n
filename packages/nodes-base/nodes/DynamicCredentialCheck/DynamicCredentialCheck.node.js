import { NodeConnectionTypes } from 'n8n-workflow';
export class DynamicCredentialCheck {
    description = {
        displayName: 'Check Credential Status',
        name: 'dynamicCredentialCheck',
        icon: 'fa:key',
        group: ['transform'],
        version: 1,
        description: 'Checks whether the triggering user has the required end-user credential configured. Routes to "Ready" or "Not Ready" and returns auth URLs when the credential is missing.',
        defaults: {
            name: 'Check Credential Status',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
        outputNames: ['Ready', 'Not Ready'],
        sensitiveOutputFields: ['credentials[*].authorizationUrl', 'credentials[*].revokeUrl'],
        properties: [],
    };
    async execute() {
        const items = this.getInputData();
        const executionContext = this.getExecutionContext();
        const workflowId = this.getWorkflow().id;
        // No dynamic credentials context — nothing to check, route to Ready
        if (!executionContext || !workflowId || !this.helpers.checkCredentialStatus) {
            return [items, []];
        }
        const result = await this.helpers.checkCredentialStatus(workflowId, executionContext);
        if (result.readyToExecute) {
            return [items, []];
        }
        const notReadyItems = items.map((item, itemIndex) => ({
            json: structuredClone(result),
            pairedItem: item.pairedItem ?? { item: itemIndex },
        }));
        return [[], notReadyItems];
    }
}
//# sourceMappingURL=DynamicCredentialCheck.node.js.map