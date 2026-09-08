import { NodeOperationError } from 'n8n-workflow';
import * as databricksSql from './databricksSql/DatabricksSql.resource';
import * as files from './files/Files.resource';
import * as genie from './genie/Genie.resource';
import { makePermissionErrorLegible } from './helpers';
import * as modelServing from './modelServing/ModelServing.resource';
import * as unityCatalog from './unityCatalog/UnityCatalog.resource';
import * as vectorSearch from './vectorSearch/VectorSearch.resource';
export async function router() {
    const items = this.getInputData();
    const returnData = [];
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    let resourceModule;
    switch (resource) {
        case 'databricksSql':
            resourceModule = databricksSql;
            break;
        case 'files':
            resourceModule = files;
            break;
        case 'genie':
            resourceModule = genie;
            break;
        case 'modelServing':
            resourceModule = modelServing;
            break;
        case 'unityCatalog':
            resourceModule = unityCatalog;
            break;
        case 'vectorSearch':
            resourceModule = vectorSearch;
            break;
        default:
            throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
    }
    const operationModule = resourceModule[operation];
    if (!operationModule) {
        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known for resource "${resource}"`);
    }
    for (let i = 0; i < items.length; i++) {
        try {
            const result = await operationModule.execute.call(this, i);
            returnData.push(...result);
        }
        catch (error) {
            makePermissionErrorLegible(error);
            if (this.continueOnFail()) {
                returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
                continue;
            }
            throw error;
        }
    }
    return [returnData];
}
//# sourceMappingURL=router.js.map