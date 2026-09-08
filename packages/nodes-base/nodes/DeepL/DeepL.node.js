import { NodeConnectionTypes } from 'n8n-workflow';
import { deepLApiRequest } from './GenericFunctions';
import { textOperations } from './TextDescription';
export class DeepL {
    description = {
        displayName: 'DeepL',
        name: 'deepL',
        icon: { light: 'file:deepl.svg', dark: 'file:deepL.dark.svg' },
        group: ['input', 'output'],
        version: 1,
        description: 'Translate data using DeepL',
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        defaults: {
            name: 'DeepL',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'deepLApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Language',
                        value: 'language',
                    },
                ],
                default: 'language',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['language'],
                    },
                },
                options: [
                    {
                        name: 'Translate',
                        value: 'translate',
                        description: 'Translate data',
                        action: 'Translate a language',
                    },
                ],
                default: 'translate',
            },
            ...textOperations,
        ],
    };
    methods = {
        loadOptions: {
            async getLanguages() {
                const returnData = [];
                const languages = await deepLApiRequest.call(this, 'GET', '/languages', {}, { type: 'target' });
                for (const language of languages) {
                    returnData.push({
                        name: language.name,
                        value: language.language,
                    });
                }
                returnData.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const length = items.length;
        const responseData = [];
        for (let i = 0; i < length; i++) {
            try {
                const resource = this.getNodeParameter('resource', i);
                const operation = this.getNodeParameter('operation', i);
                const additionalFields = this.getNodeParameter('additionalFields', i);
                if (resource === 'language') {
                    if (operation === 'translate') {
                        let body = {};
                        const text = this.getNodeParameter('text', i);
                        const translateTo = this.getNodeParameter('translateTo', i);
                        body = { target_lang: translateTo, text };
                        if (additionalFields.sourceLang !== undefined) {
                            body.source_lang = ['EN-GB', 'EN-US'].includes(additionalFields.sourceLang)
                                ? 'EN'
                                : additionalFields.sourceLang;
                        }
                        const { translations } = await deepLApiRequest.call(this, 'GET', '/translate', body);
                        const [translation] = translations;
                        const translationJsonArray = this.helpers.returnJsonArray(translation);
                        const executionData = this.helpers.constructExecutionMetaData(translationJsonArray, {
                            itemData: { item: i },
                        });
                        responseData.push(...executionData);
                    }
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = {
                        json: {},
                        error: error.message,
                        itemIndex: i,
                    };
                    responseData.push(executionErrorData);
                    continue;
                }
                throw error;
            }
        }
        return [responseData];
    }
}
//# sourceMappingURL=DeepL.node.js.map