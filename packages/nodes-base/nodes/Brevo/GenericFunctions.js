import { BINARY_ENCODING, jsonParse, NodeOperationError } from 'n8n-workflow';
import MailComposer from 'nodemailer/lib/mail-composer';
export var BrevoNode;
(function (BrevoNode) {
    const OVERRIDE_MAP_VALUES = {
        CATEGORY: 'category',
        NORMAL: 'boolean',
        TRANSACTIONAL: 'id',
    };
    const OVERRIDE_MAP_TYPE = {
        CATEGORY: 'category',
        NORMAL: 'normal',
        TRANSACTIONAL: 'transactional',
    };
    BrevoNode.INTERCEPTORS = new Map([
        [
            OVERRIDE_MAP_TYPE.CATEGORY,
            (body) => {
                body.type = OVERRIDE_MAP_VALUES.CATEGORY;
            },
        ],
        [
            OVERRIDE_MAP_TYPE.NORMAL,
            (body) => {
                body.type = OVERRIDE_MAP_VALUES.NORMAL;
            },
        ],
        [
            OVERRIDE_MAP_TYPE.TRANSACTIONAL,
            (body) => {
                body.type = OVERRIDE_MAP_VALUES.TRANSACTIONAL;
            },
        ],
    ]);
    let Validators;
    (function (Validators) {
        function getFileName(itemIndex, mimeType, fileExt, fileName) {
            const ext = fileExt ?? mimeType.split('/')[1];
            if (!fileName) {
                return `file-${itemIndex}.${ext}`;
            }
            return fileName.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
                ? fileName
                : `${fileName}.${ext}`;
        }
        async function validateAndCompileAttachmentsData(requestOptions) {
            const dataPropertyList = this.getNodeParameter('additionalFields.emailAttachments.attachment');
            const { body } = requestOptions;
            const { attachment = [] } = body;
            try {
                const { binaryPropertyName } = dataPropertyList;
                const dataMappingList = binaryPropertyName.split(',');
                for (const attachmentDataName of dataMappingList) {
                    const binaryData = this.helpers.assertBinaryData(attachmentDataName.trim());
                    const buffer = await this.helpers.getBinaryDataBuffer(attachmentDataName.trim());
                    const content = buffer.toString(BINARY_ENCODING);
                    const name = getFileName(this.getItemIndex(), binaryData.mimeType, binaryData.fileExtension, binaryData.fileName);
                    attachment.push({ content, name });
                }
                Object.assign(body, { attachment });
                return requestOptions;
            }
            catch (err) {
                throw new NodeOperationError(this.getNode(), err);
            }
        }
        Validators.validateAndCompileAttachmentsData = validateAndCompileAttachmentsData;
        async function validateAndCompileTags(requestOptions) {
            const { tag } = this.getNodeParameter('additionalFields.emailTags.tags');
            const tags = tag
                .split(',')
                .map((entry) => entry.trim())
                .filter((entry) => {
                return entry !== '';
            });
            const { body } = requestOptions;
            Object.assign(body, { tags });
            return requestOptions;
        }
        Validators.validateAndCompileTags = validateAndCompileTags;
        function formatToEmailName(data) {
            const { address: email, name } = data;
            const result = { email };
            if (name !== undefined && name !== '') {
                Object.assign(result, { name });
            }
            return { ...result };
        }
        function validateEmailStrings(input) {
            const composer = new MailComposer({
                ...input,
                disableFileAccess: true,
                disableUrlAccess: true,
            });
            const addressFields = composer.compile().getAddresses();
            const fieldFetcher = new Map([
                [
                    'bcc',
                    () => {
                        return addressFields.bcc?.map(formatToEmailName);
                    },
                ],
                [
                    'cc',
                    () => {
                        return addressFields.cc?.map(formatToEmailName);
                    },
                ],
                [
                    'from',
                    () => {
                        return addressFields.from?.map(formatToEmailName);
                    },
                ],
                [
                    'reply-to',
                    () => {
                        return addressFields['reply-to']?.map(formatToEmailName);
                    },
                ],
                [
                    'sender',
                    () => {
                        return addressFields.sender?.map(formatToEmailName)[0];
                    },
                ],
                [
                    'to',
                    () => {
                        return addressFields.to?.map(formatToEmailName);
                    },
                ],
            ]);
            const result = {};
            Object.keys(input).reduce((obj, key) => {
                const getter = fieldFetcher.get(key);
                const value = getter();
                obj[key] = value;
                return obj;
            }, result);
            return result;
        }
        async function validateAndCompileCCEmails(requestOptions) {
            const ccData = this.getNodeParameter('additionalFields.receipientsCC.receipientCc');
            const { cc } = ccData;
            const { body } = requestOptions;
            const data = validateEmailStrings({ cc: cc });
            Object.assign(body, data);
            return requestOptions;
        }
        Validators.validateAndCompileCCEmails = validateAndCompileCCEmails;
        async function validateAndCompileBCCEmails(requestOptions) {
            const bccData = this.getNodeParameter('additionalFields.receipientsBCC.receipientBcc');
            const { bcc } = bccData;
            const { body } = requestOptions;
            const data = validateEmailStrings({ bcc: bcc });
            Object.assign(body, data);
            return requestOptions;
        }
        Validators.validateAndCompileBCCEmails = validateAndCompileBCCEmails;
        async function validateAndCompileRecipientEmails(requestOptions) {
            const to = this.getNodeParameter('receipients');
            const { body } = requestOptions;
            const data = validateEmailStrings({ to });
            Object.assign(body, data);
            return requestOptions;
        }
        Validators.validateAndCompileRecipientEmails = validateAndCompileRecipientEmails;
        async function validateAndCompileSenderEmail(requestOptions) {
            const sender = this.getNodeParameter('sender');
            const { body } = requestOptions;
            const data = validateEmailStrings({ sender });
            Object.assign(body, data);
            return requestOptions;
        }
        Validators.validateAndCompileSenderEmail = validateAndCompileSenderEmail;
        async function validateAndCompileTemplateParameters(requestOptions) {
            const parameterData = this.getNodeParameter('additionalFields.templateParameters.parameterValues');
            const { body } = requestOptions;
            const { parameters } = parameterData;
            const params = parameters
                .split(',')
                .filter((parameter) => {
                return parameter.split('=').length === 2;
            })
                .map((parameter) => {
                const [key, value] = parameter.split('=');
                return {
                    [key]: value,
                };
            })
                .reduce((obj, cObj) => {
                Object.assign(obj, cObj);
                return obj;
            }, {});
            Object.assign(body, { params });
            return requestOptions;
        }
        Validators.validateAndCompileTemplateParameters = validateAndCompileTemplateParameters;
    })(Validators = BrevoNode.Validators || (BrevoNode.Validators = {}));
})(BrevoNode || (BrevoNode = {}));
export var BrevoWebhookApi;
(function (BrevoWebhookApi) {
    const credentialsName = 'sendInBlueApi';
    const baseURL = 'https://api.brevo.com/v3';
    BrevoWebhookApi.supportedAuthMap = new Map([
        [
            'apiKey',
            async (ref) => {
                const credentials = await ref.getCredentials(credentialsName);
                return credentials.sharedSecret;
            },
        ],
    ]);
    BrevoWebhookApi.fetchWebhooks = async (ref, type) => {
        const endpoint = `${baseURL}/webhooks?type=${type}`;
        const options = {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
            uri: endpoint,
        };
        const webhooks = (await ref.helpers.requestWithAuthentication.call(ref, credentialsName, options));
        return await jsonParse(webhooks);
    };
    BrevoWebhookApi.createWebHook = async (ref, type, events, url) => {
        const endpoint = `${baseURL}/webhooks`;
        const options = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
            },
            uri: endpoint,
            body: {
                events,
                type,
                url,
            },
        };
        const webhookId = await ref.helpers.requestWithAuthentication.call(ref, credentialsName, options);
        return await jsonParse(webhookId);
    };
    BrevoWebhookApi.deleteWebhook = async (ref, webhookId) => {
        const endpoint = `${baseURL}/webhooks/${webhookId}`;
        const body = {};
        const options = {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
            },
            uri: endpoint,
            body,
        };
        return await ref.helpers.requestWithAuthentication.call(ref, credentialsName, options);
    };
})(BrevoWebhookApi || (BrevoWebhookApi = {}));
//# sourceMappingURL=GenericFunctions.js.map