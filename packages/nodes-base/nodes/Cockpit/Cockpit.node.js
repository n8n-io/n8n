import { NodeConnectionTypes } from 'n8n-workflow';
import { collectionFields, collectionOperations } from './CollectionDescription';
import { createCollectionEntry, getAllCollectionEntries, getAllCollectionNames, } from './CollectionFunctions';
import { formFields, formOperations } from './FormDescription';
import { submitForm } from './FormFunctions';
import { createDataFromParameters } from './GenericFunctions';
import { singletonFields, singletonOperations } from './SingletonDescription';
import { getAllSingletonNames, getSingleton } from './SingletonFunctions';
export class Cockpit {
    description = {
        displayName: 'Cockpit',
        name: 'cockpit',
        icon: { light: 'file:cockpit.svg', dark: 'file:cockpit.dark.svg' },
        group: ['output'],
        version: 1,
        subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
        description: 'Consume Cockpit API',
        defaults: {
            name: 'Cockpit',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'cockpitApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                default: 'collection',
                options: [
                    {
                        name: 'Collection',
                        value: 'collection',
                    },
                    {
                        name: 'Form',
                        value: 'form',
                    },
                    {
                        name: 'Singleton',
                        value: 'singleton',
                    },
                ],
            },
            ...collectionOperations,
            ...collectionFields,
            ...formOperations,
            ...formFields,
            ...singletonOperations,
            ...singletonFields,
        ],
    };
    methods = {
        loadOptions: {
            async getCollections() {
                const collections = await getAllCollectionNames.call(this);
                return collections.map((itemName) => {
                    return {
                        name: itemName,
                        value: itemName,
                    };
                });
            },
            async getSingletons() {
                const singletons = await getAllSingletonNames.call(this);
                return singletons.map((itemName) => {
                    return {
                        name: itemName,
                        value: itemName,
                    };
                });
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        let responseData;
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'collection') {
                    const collectionName = this.getNodeParameter('collection', i);
                    if (operation === 'create') {
                        const data = createDataFromParameters.call(this, i);
                        responseData = await createCollectionEntry.call(this, collectionName, data);
                    }
                    else if (operation === 'getAll') {
                        const options = this.getNodeParameter('options', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        if (!returnAll) {
                            options.limit = this.getNodeParameter('limit', i);
                        }
                        responseData = await getAllCollectionEntries.call(this, collectionName, options);
                    }
                    else if (operation === 'update') {
                        const id = this.getNodeParameter('id', i);
                        const data = createDataFromParameters.call(this, i);
                        responseData = await createCollectionEntry.call(this, collectionName, data, id);
                    }
                }
                else if (resource === 'form') {
                    const formName = this.getNodeParameter('form', i);
                    if (operation === 'submit') {
                        const form = createDataFromParameters.call(this, i);
                        responseData = await submitForm.call(this, formName, form);
                    }
                }
                else if (resource === 'singleton') {
                    const singletonName = this.getNodeParameter('singleton', i);
                    if (operation === 'get') {
                        responseData = await getSingleton.call(this, singletonName);
                    }
                }
                if (Array.isArray(responseData)) {
                    returnData.push.apply(returnData, responseData);
                }
                else {
                    returnData.push(responseData);
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message });
                    continue;
                }
                throw error;
            }
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=Cockpit.node.js.map