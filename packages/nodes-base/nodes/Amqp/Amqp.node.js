import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { create_container } from 'rhea';
async function checkIfCredentialsValid(credentials) {
    const connectOptions = {
        reconnect: false,
        host: credentials.hostname,
        hostname: credentials.hostname,
        port: credentials.port,
        username: credentials.username ? credentials.username : undefined,
        password: credentials.password ? credentials.password : undefined,
        transport: credentials.transportType ? credentials.transportType : undefined,
    };
    let conn = undefined;
    try {
        const container = create_container();
        await new Promise((resolve, reject) => {
            container.on('connection_open', function (_context) {
                resolve();
            });
            container.on('disconnected', function (context) {
                reject(context.error ?? new Error('unknown error'));
            });
            conn = container.connect(connectOptions);
        });
    }
    catch (error) {
        return {
            status: 'Error',
            message: error.message,
        };
    }
    finally {
        if (conn)
            conn.close();
    }
    return {
        status: 'OK',
        message: 'Connection successful!',
    };
}
export class Amqp {
    description = {
        displayName: 'AMQP Sender',
        name: 'amqp',
        icon: 'file:amqp.svg',
        group: ['transform'],
        version: 1,
        description: 'Sends a raw-message via AMQP 1.0, executed once per item',
        defaults: {
            name: 'AMQP Sender',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'amqp',
                required: true,
                testedBy: 'amqpConnectionTest',
            },
        ],
        properties: [
            {
                displayName: 'Queue / Topic',
                name: 'sink',
                type: 'string',
                default: '',
                placeholder: 'e.g. topic://sourcename.something',
                description: 'Name of the queue or topic to publish to',
            },
            // Header Parameters
            {
                displayName: 'Headers',
                name: 'headerParametersJson',
                type: 'json',
                default: '',
                description: 'Header parameters as JSON (flat object). Sent as application_properties in amqp-message meta info.',
            },
            {
                displayName: 'Options',
                name: 'options',
                type: 'collection',
                placeholder: 'Add option',
                default: {},
                options: [
                    {
                        displayName: 'Container ID',
                        name: 'containerId',
                        type: 'string',
                        default: '',
                        description: 'Will be used to pass to the RHEA Backend as container_id',
                    },
                    {
                        displayName: 'Data as Object',
                        name: 'dataAsObject',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to send the data as an object',
                    },
                    {
                        displayName: 'Reconnect',
                        name: 'reconnect',
                        type: 'boolean',
                        default: true,
                        description: 'Whether to automatically reconnect if disconnected',
                    },
                    {
                        displayName: 'Reconnect Limit',
                        name: 'reconnectLimit',
                        type: 'number',
                        default: 50,
                        description: 'Maximum number of reconnect attempts',
                    },
                    {
                        displayName: 'Send Property',
                        name: 'sendOnlyProperty',
                        type: 'string',
                        default: '',
                        description: 'The only property to send. If empty the whole item will be sent.',
                    },
                ],
            },
        ],
    };
    methods = {
        credentialTest: {
            async amqpConnectionTest(credential) {
                const credentials = credential.data;
                return await checkIfCredentialsValid(credentials);
            },
        },
    };
    async execute() {
        const container = create_container();
        let connection = undefined;
        let sender = undefined;
        try {
            const credentials = await this.getCredentials('amqp');
            // check if credentials are valid to avoid unnecessary reconnects
            const credentialsTestResult = await checkIfCredentialsValid(credentials);
            if (credentialsTestResult.status === 'Error') {
                throw new NodeOperationError(this.getNode(), credentialsTestResult.message, {
                    description: 'Check your credentials and try again',
                });
            }
            const sink = this.getNodeParameter('sink', 0, '');
            const applicationProperties = this.getNodeParameter('headerParametersJson', 0, {});
            const options = this.getNodeParameter('options', 0, {});
            const containerId = options.containerId;
            const containerReconnect = options.reconnect ?? true;
            const containerReconnectLimit = options.reconnectLimit || 50;
            let headerProperties;
            if (typeof applicationProperties === 'string' && applicationProperties !== '') {
                headerProperties = JSON.parse(applicationProperties);
            }
            else {
                headerProperties = applicationProperties;
            }
            if (sink === '') {
                throw new NodeOperationError(this.getNode(), 'Queue or Topic required!');
            }
            /*
                Values are documented here: https://github.com/amqp/rhea#container
            */
            const connectOptions = {
                host: credentials.hostname,
                hostname: credentials.hostname,
                port: credentials.port,
                username: credentials.username ? credentials.username : undefined,
                password: credentials.password ? credentials.password : undefined,
                transport: credentials.transportType ? credentials.transportType : undefined,
                container_id: containerId ? containerId : undefined,
                id: containerId ? containerId : undefined,
                reconnect: containerReconnect,
                reconnect_limit: containerReconnectLimit,
            };
            const node = this.getNode();
            const responseData = await new Promise((resolve, reject) => {
                connection = container.connect(connectOptions);
                sender = connection.open_sender(sink);
                let limit = containerReconnectLimit;
                container.on('disconnected', function (context) {
                    //handling this manually as container, despite reconnect_limit, does reconnect on disconnect
                    // with reconnect off there is no retry to wait for, so the first drop is final
                    if (limit <= 0 || !containerReconnect) {
                        connection.options.reconnect = false;
                        const error = new NodeOperationError(node, (context.error ?? {}).message ?? 'Disconnected', {
                            description: `Check your credentials${options.reconnect ? '' : ', and consider enabling reconnect in the options'}`,
                            itemIndex: 0,
                        });
                        reject(error);
                    }
                    limit--;
                });
                container.once('sendable', (context) => {
                    const returnData = [];
                    const items = this.getInputData();
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        let body = item.json;
                        const sendOnlyProperty = options.sendOnlyProperty;
                        if (sendOnlyProperty) {
                            body = body[sendOnlyProperty];
                        }
                        if (options.dataAsObject !== true) {
                            body = JSON.stringify(body);
                        }
                        const result = context.sender?.send({
                            application_properties: headerProperties,
                            body,
                        });
                        returnData.push({ json: { id: result?.id }, pairedItems: { item: i } });
                    }
                    resolve(returnData);
                });
            });
            return [responseData];
        }
        catch (error) {
            if (this.continueOnFail()) {
                return [[{ json: { error: error.message }, pairedItems: { item: 0 } }]];
            }
            else {
                throw error;
            }
        }
        finally {
            if (sender)
                sender.close();
            if (connection)
                connection.close();
        }
    }
}
//# sourceMappingURL=Amqp.node.js.map