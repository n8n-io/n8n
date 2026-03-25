import { Client } from '../../client/index.js';
import { StreamableHTTPClientTransport } from '../../client/streamableHttp.js';
import { createInterface } from 'node:readline';
import { ListToolsResultSchema, CallToolResultSchema, ListPromptsResultSchema, GetPromptResultSchema, ListResourcesResultSchema, LoggingMessageNotificationSchema, ResourceListChangedNotificationSchema, ElicitRequestSchema, ReadResourceResultSchema, RELATED_TASK_META_KEY, ErrorCode, McpError } from '../../types.js';
import { getDisplayName } from '../../shared/metadataUtils.js';
import { Ajv } from 'ajv';
// Create readline interface for user input
const readline = createInterface({
    input: process.stdin,
    output: process.stdout
});
// Track received notifications for debugging resumability
let notificationCount = 0;
// Global client and transport for interactive commands
let client = null;
let transport = null;
let serverUrl = 'http://localhost:3000/mcp';
let notificationsToolLastEventId = undefined;
let sessionId = undefined;
async function main() {
    console.log('MCP Interactive Client');
    console.log('=====================');
    // Connect to server immediately with default settings
    await connect();
    // Print help and start the command loop
    printHelp();
    commandLoop();
}
function printHelp() {
    console.log('\nAvailable commands:');
    console.log('  connect [url]              - Connect to MCP server (default: http://localhost:3000/mcp)');
    console.log('  disconnect                 - Disconnect from server');
    console.log('  terminate-session          - Terminate the current session');
    console.log('  reconnect                  - Reconnect to the server');
    console.log('  list-tools                 - List available tools');
    console.log('  call-tool <name> [args]    - Call a tool with optional JSON arguments');
    console.log('  call-tool-task <name> [args] - Call a tool with task-based execution (example: call-tool-task delay {"duration":3000})');
    console.log('  greet [name]               - Call the greet tool');
    console.log('  multi-greet [name]         - Call the multi-greet tool with notifications');
    console.log('  collect-info [type]        - Test form elicitation with collect-user-info tool (contact/preferences/feedback)');
    console.log('  start-notifications [interval] [count] - Start periodic notifications');
    console.log('  run-notifications-tool-with-resumability [interval] [count] - Run notification tool with resumability');
    console.log('  list-prompts               - List available prompts');
    console.log('  get-prompt [name] [args]   - Get a prompt with optional JSON arguments');
    console.log('  list-resources             - List available resources');
    console.log('  read-resource <uri>        - Read a specific resource by URI');
    console.log('  help                       - Show this help');
    console.log('  quit                       - Exit the program');
}
function commandLoop() {
    readline.question('\n> ', async (input) => {
        const args = input.trim().split(/\s+/);
        const command = args[0]?.toLowerCase();
        try {
            switch (command) {
                case 'connect':
                    await connect(args[1]);
                    break;
                case 'disconnect':
                    await disconnect();
                    break;
                case 'terminate-session':
                    await terminateSession();
                    break;
                case 'reconnect':
                    await reconnect();
                    break;
                case 'list-tools':
                    await listTools();
                    break;
                case 'call-tool':
                    if (args.length < 2) {
                        console.log('Usage: call-tool <name> [args]');
                    }
                    else {
                        const toolName = args[1];
                        let toolArgs = {};
                        if (args.length > 2) {
                            try {
                                toolArgs = JSON.parse(args.slice(2).join(' '));
                            }
                            catch {
                                console.log('Invalid JSON arguments. Using empty args.');
                            }
                        }
                        await callTool(toolName, toolArgs);
                    }
                    break;
                case 'greet':
                    await callGreetTool(args[1] || 'MCP User');
                    break;
                case 'multi-greet':
                    await callMultiGreetTool(args[1] || 'MCP User');
                    break;
                case 'collect-info':
                    await callCollectInfoTool(args[1] || 'contact');
                    break;
                case 'start-notifications': {
                    const interval = args[1] ? parseInt(args[1], 10) : 2000;
                    const count = args[2] ? parseInt(args[2], 10) : 10;
                    await startNotifications(interval, count);
                    break;
                }
                case 'run-notifications-tool-with-resumability': {
                    const interval = args[1] ? parseInt(args[1], 10) : 2000;
                    const count = args[2] ? parseInt(args[2], 10) : 10;
                    await runNotificationsToolWithResumability(interval, count);
                    break;
                }
                case 'call-tool-task':
                    if (args.length < 2) {
                        console.log('Usage: call-tool-task <name> [args]');
                    }
                    else {
                        const toolName = args[1];
                        let toolArgs = {};
                        if (args.length > 2) {
                            try {
                                toolArgs = JSON.parse(args.slice(2).join(' '));
                            }
                            catch {
                                console.log('Invalid JSON arguments. Using empty args.');
                            }
                        }
                        await callToolTask(toolName, toolArgs);
                    }
                    break;
                case 'list-prompts':
                    await listPrompts();
                    break;
                case 'get-prompt':
                    if (args.length < 2) {
                        console.log('Usage: get-prompt <name> [args]');
                    }
                    else {
                        const promptName = args[1];
                        let promptArgs = {};
                        if (args.length > 2) {
                            try {
                                promptArgs = JSON.parse(args.slice(2).join(' '));
                            }
                            catch {
                                console.log('Invalid JSON arguments. Using empty args.');
                            }
                        }
                        await getPrompt(promptName, promptArgs);
                    }
                    break;
                case 'list-resources':
                    await listResources();
                    break;
                case 'read-resource':
                    if (args.length < 2) {
                        console.log('Usage: read-resource <uri>');
                    }
                    else {
                        await readResource(args[1]);
                    }
                    break;
                case 'help':
                    printHelp();
                    break;
                case 'quit':
                case 'exit':
                    await cleanup();
                    return;
                default:
                    if (command) {
                        console.log(`Unknown command: ${command}`);
                    }
                    break;
            }
        }
        catch (error) {
            console.error(`Error executing command: ${error}`);
        }
        // Continue the command loop
        commandLoop();
    });
}
async function connect(url) {
    if (client) {
        console.log('Already connected. Disconnect first.');
        return;
    }
    if (url) {
        serverUrl = url;
    }
    console.log(`Connecting to ${serverUrl}...`);
    try {
        // Create a new client with form elicitation capability
        client = new Client({
            name: 'example-client',
            version: '1.0.0'
        }, {
            capabilities: {
                elicitation: {
                    form: {}
                }
            }
        });
        client.onerror = error => {
            console.error('\x1b[31mClient error:', error, '\x1b[0m');
        };
        // Set up elicitation request handler with proper validation
        client.setRequestHandler(ElicitRequestSchema, async (request) => {
            if (request.params.mode !== 'form') {
                throw new McpError(ErrorCode.InvalidParams, `Unsupported elicitation mode: ${request.params.mode}`);
            }
            console.log('\n🔔 Elicitation (form) Request Received:');
            console.log(`Message: ${request.params.message}`);
            console.log(`Related Task: ${request.params._meta?.[RELATED_TASK_META_KEY]?.taskId}`);
            console.log('Requested Schema:');
            console.log(JSON.stringify(request.params.requestedSchema, null, 2));
            const schema = request.params.requestedSchema;
            const properties = schema.properties;
            const required = schema.required || [];
            // Set up AJV validator for the requested schema
            const ajv = new Ajv();
            const validate = ajv.compile(schema);
            let attempts = 0;
            const maxAttempts = 3;
            while (attempts < maxAttempts) {
                attempts++;
                console.log(`\nPlease provide the following information (attempt ${attempts}/${maxAttempts}):`);
                const content = {};
                let inputCancelled = false;
                // Collect input for each field
                for (const [fieldName, fieldSchema] of Object.entries(properties)) {
                    const field = fieldSchema;
                    const isRequired = required.includes(fieldName);
                    let prompt = `${field.title || fieldName}`;
                    // Add helpful information to the prompt
                    if (field.description) {
                        prompt += ` (${field.description})`;
                    }
                    if (field.enum) {
                        prompt += ` [options: ${field.enum.join(', ')}]`;
                    }
                    if (field.type === 'number' || field.type === 'integer') {
                        if (field.minimum !== undefined && field.maximum !== undefined) {
                            prompt += ` [${field.minimum}-${field.maximum}]`;
                        }
                        else if (field.minimum !== undefined) {
                            prompt += ` [min: ${field.minimum}]`;
                        }
                        else if (field.maximum !== undefined) {
                            prompt += ` [max: ${field.maximum}]`;
                        }
                    }
                    if (field.type === 'string' && field.format) {
                        prompt += ` [format: ${field.format}]`;
                    }
                    if (isRequired) {
                        prompt += ' *required*';
                    }
                    if (field.default !== undefined) {
                        prompt += ` [default: ${field.default}]`;
                    }
                    prompt += ': ';
                    const answer = await new Promise(resolve => {
                        readline.question(prompt, input => {
                            resolve(input.trim());
                        });
                    });
                    // Check for cancellation
                    if (answer.toLowerCase() === 'cancel' || answer.toLowerCase() === 'c') {
                        inputCancelled = true;
                        break;
                    }
                    // Parse and validate the input
                    try {
                        if (answer === '' && field.default !== undefined) {
                            content[fieldName] = field.default;
                        }
                        else if (answer === '' && !isRequired) {
                            // Skip optional empty fields
                            continue;
                        }
                        else if (answer === '') {
                            throw new Error(`${fieldName} is required`);
                        }
                        else {
                            // Parse the value based on type
                            let parsedValue;
                            if (field.type === 'boolean') {
                                parsedValue = answer.toLowerCase() === 'true' || answer.toLowerCase() === 'yes' || answer === '1';
                            }
                            else if (field.type === 'number') {
                                parsedValue = parseFloat(answer);
                                if (isNaN(parsedValue)) {
                                    throw new Error(`${fieldName} must be a valid number`);
                                }
                            }
                            else if (field.type === 'integer') {
                                parsedValue = parseInt(answer, 10);
                                if (isNaN(parsedValue)) {
                                    throw new Error(`${fieldName} must be a valid integer`);
                                }
                            }
                            else if (field.enum) {
                                if (!field.enum.includes(answer)) {
                                    throw new Error(`${fieldName} must be one of: ${field.enum.join(', ')}`);
                                }
                                parsedValue = answer;
                            }
                            else {
                                parsedValue = answer;
                            }
                            content[fieldName] = parsedValue;
                        }
                    }
                    catch (error) {
                        console.log(`❌ Error: ${error}`);
                        // Continue to next attempt
                        break;
                    }
                }
                if (inputCancelled) {
                    return { action: 'cancel' };
                }
                // If we didn't complete all fields due to an error, try again
                if (Object.keys(content).length !==
                    Object.keys(properties).filter(name => required.includes(name) || content[name] !== undefined).length) {
                    if (attempts < maxAttempts) {
                        console.log('Please try again...');
                        continue;
                    }
                    else {
                        console.log('Maximum attempts reached. Declining request.');
                        return { action: 'decline' };
                    }
                }
                // Validate the complete object against the schema
                const isValid = validate(content);
                if (!isValid) {
                    console.log('❌ Validation errors:');
                    validate.errors?.forEach(error => {
                        console.log(`  - ${error.instancePath || 'root'}: ${error.message}`);
                    });
                    if (attempts < maxAttempts) {
                        console.log('Please correct the errors and try again...');
                        continue;
                    }
                    else {
                        console.log('Maximum attempts reached. Declining request.');
                        return { action: 'decline' };
                    }
                }
                // Show the collected data and ask for confirmation
                console.log('\n✅ Collected data:');
                console.log(JSON.stringify(content, null, 2));
                const confirmAnswer = await new Promise(resolve => {
                    readline.question('\nSubmit this information? (yes/no/cancel): ', input => {
                        resolve(input.trim().toLowerCase());
                    });
                });
                if (confirmAnswer === 'yes' || confirmAnswer === 'y') {
                    return {
                        action: 'accept',
                        content
                    };
                }
                else if (confirmAnswer === 'cancel' || confirmAnswer === 'c') {
                    return { action: 'cancel' };
                }
                else if (confirmAnswer === 'no' || confirmAnswer === 'n') {
                    if (attempts < maxAttempts) {
                        console.log('Please re-enter the information...');
                        continue;
                    }
                    else {
                        return { action: 'decline' };
                    }
                }
            }
            console.log('Maximum attempts reached. Declining request.');
            return { action: 'decline' };
        });
        transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
            sessionId: sessionId
        });
        // Set up notification handlers
        client.setNotificationHandler(LoggingMessageNotificationSchema, notification => {
            notificationCount++;
            console.log(`\nNotification #${notificationCount}: ${notification.params.level} - ${notification.params.data}`);
            // Re-display the prompt
            process.stdout.write('> ');
        });
        client.setNotificationHandler(ResourceListChangedNotificationSchema, async (_) => {
            console.log(`\nResource list changed notification received!`);
            try {
                if (!client) {
                    console.log('Client disconnected, cannot fetch resources');
                    return;
                }
                const resourcesResult = await client.request({
                    method: 'resources/list',
                    params: {}
                }, ListResourcesResultSchema);
                console.log('Available resources count:', resourcesResult.resources.length);
            }
            catch {
                console.log('Failed to list resources after change notification');
            }
            // Re-display the prompt
            process.stdout.write('> ');
        });
        // Connect the client
        await client.connect(transport);
        sessionId = transport.sessionId;
        console.log('Transport created with session ID:', sessionId);
        console.log('Connected to MCP server');
    }
    catch (error) {
        console.error('Failed to connect:', error);
        client = null;
        transport = null;
    }
}
async function disconnect() {
    if (!client || !transport) {
        console.log('Not connected.');
        return;
    }
    try {
        await transport.close();
        console.log('Disconnected from MCP server');
        client = null;
        transport = null;
    }
    catch (error) {
        console.error('Error disconnecting:', error);
    }
}
async function terminateSession() {
    if (!client || !transport) {
        console.log('Not connected.');
        return;
    }
    try {
        console.log('Terminating session with ID:', transport.sessionId);
        await transport.terminateSession();
        console.log('Session terminated successfully');
        // Check if sessionId was cleared after termination
        if (!transport.sessionId) {
            console.log('Session ID has been cleared');
            sessionId = undefined;
            // Also close the transport and clear client objects
            await transport.close();
            console.log('Transport closed after session termination');
            client = null;
            transport = null;
        }
        else {
            console.log('Server responded with 405 Method Not Allowed (session termination not supported)');
            console.log('Session ID is still active:', transport.sessionId);
        }
    }
    catch (error) {
        console.error('Error terminating session:', error);
    }
}
async function reconnect() {
    if (client) {
        await disconnect();
    }
    await connect();
}
async function listTools() {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
    try {
        const toolsRequest = {
            method: 'tools/list',
            params: {}
        };
        const toolsResult = await client.request(toolsRequest, ListToolsResultSchema);
        console.log('Available tools:');
        if (toolsResult.tools.length === 0) {
            console.log('  No tools available');
        }
        else {
            for (const tool of toolsResult.tools) {
                console.log(`  - id: ${tool.name}, name: ${getDisplayName(tool)}, description: ${tool.description}`);
            }
        }
    }
    catch (error) {
        console.log(`Tools not supported by this server (${error})`);
    }
}
async function callTool(name, args) {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
    try {
        const request = {
            method: 'tools/call',
            params: {
                name,
                arguments: args
            }
        };
        console.log(`Calling tool '${name}' with args:`, args);
        const result = await client.request(request, CallToolResultSchema);
        console.log('Tool result:');
        const resourceLinks = [];
        result.content.forEach(item => {
            if (item.type === 'text') {
                console.log(`  ${item.text}`);
            }
            else if (item.type === 'resource_link') {
                const resourceLink = item;
                resourceLinks.push(resourceLink);
                console.log(`  📁 Resource Link: ${resourceLink.name}`);
                console.log(`     URI: ${resourceLink.uri}`);
                if (resourceLink.mimeType) {
                    console.log(`     Type: ${resourceLink.mimeType}`);
                }
                if (resourceLink.description) {
                    console.log(`     Description: ${resourceLink.description}`);
                }
            }
            else if (item.type === 'resource') {
                console.log(`  [Embedded Resource: ${item.resource.uri}]`);
            }
            else if (item.type === 'image') {
                console.log(`  [Image: ${item.mimeType}]`);
            }
            else if (item.type === 'audio') {
                console.log(`  [Audio: ${item.mimeType}]`);
            }
            else {
                console.log(`  [Unknown content type]:`, item);
            }
        });
        // Offer to read resource links
        if (resourceLinks.length > 0) {
            console.log(`\nFound ${resourceLinks.length} resource link(s). Use 'read-resource <uri>' to read their content.`);
        }
    }
    catch (error) {
        console.log(`Error calling tool ${name}: ${error}`);
    }
}
async function callGreetTool(name) {
    await callTool('greet', { name });
}
async function callMultiGreetTool(name) {
    console.log('Calling multi-greet tool with notifications...');
    await callTool('multi-greet', { name });
}
async function callCollectInfoTool(infoType) {
    console.log(`Testing form elicitation with collect-user-info tool (${infoType})...`);
    await callTool('collect-user-info', { infoType });
}
async function startNotifications(interval, count) {
    console.log(`Starting notification stream: interval=${interval}ms, count=${count || 'unlimited'}`);
    await callTool('start-notification-stream', { interval, count });
}
async function runNotificationsToolWithResumability(interval, count) {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
    try {
        console.log(`Starting notification stream with resumability: interval=${interval}ms, count=${count || 'unlimited'}`);
        console.log(`Using resumption token: ${notificationsToolLastEventId || 'none'}`);
        const request = {
            method: 'tools/call',
            params: {
                name: 'start-notification-stream',
                arguments: { interval, count }
            }
        };
        const onLastEventIdUpdate = (event) => {
            notificationsToolLastEventId = event;
            console.log(`Updated resumption token: ${event}`);
        };
        const result = await client.request(request, CallToolResultSchema, {
            resumptionToken: notificationsToolLastEventId,
            onresumptiontoken: onLastEventIdUpdate
        });
        console.log('Tool result:');
        result.content.forEach(item => {
            if (item.type === 'text') {
                console.log(`  ${item.text}`);
            }
            else {
                console.log(`  ${item.type} content:`, item);
            }
        });
    }
    catch (error) {
        console.log(`Error starting notification stream: ${error}`);
    }
}
async function listPrompts() {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
    try {
        const promptsRequest = {
            method: 'prompts/list',
            params: {}
        };
        const promptsResult = await client.request(promptsRequest, ListPromptsResultSchema);
        console.log('Available prompts:');
        if (promptsResult.prompts.length === 0) {
            console.log('  No prompts available');
        }
        else {
            for (const prompt of promptsResult.prompts) {
                console.log(`  - id: ${prompt.name}, name: ${getDisplayName(prompt)}, description: ${prompt.description}`);
            }
        }
    }
    catch (error) {
        console.log(`Prompts not supported by this server (${error})`);
    }
}
async function getPrompt(name, args) {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
    try {
        const promptRequest = {
            method: 'prompts/get',
            params: {
                name,
                arguments: args
            }
        };
        const promptResult = await client.request(promptRequest, GetPromptResultSchema);
        console.log('Prompt template:');
        promptResult.messages.forEach((msg, index) => {
            console.log(`  [${index + 1}] ${msg.role}: ${msg.content.type === 'text' ? msg.content.text : JSON.stringify(msg.content)}`);
        });
    }
    catch (error) {
        console.log(`Error getting prompt ${name}: ${error}`);
    }
}
async function listResources() {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
    try {
        const resourcesRequest = {
            method: 'resources/list',
            params: {}
        };
        const resourcesResult = await client.request(resourcesRequest, ListResourcesResultSchema);
        console.log('Available resources:');
        if (resourcesResult.resources.length === 0) {
            console.log('  No resources available');
        }
        else {
            for (const resource of resourcesResult.resources) {
                console.log(`  - id: ${resource.name}, name: ${getDisplayName(resource)}, description: ${resource.uri}`);
            }
        }
    }
    catch (error) {
        console.log(`Resources not supported by this server (${error})`);
    }
}
async function readResource(uri) {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
    try {
        const request = {
            method: 'resources/read',
            params: { uri }
        };
        console.log(`Reading resource: ${uri}`);
        const result = await client.request(request, ReadResourceResultSchema);
        console.log('Resource contents:');
        for (const content of result.contents) {
            console.log(`  URI: ${content.uri}`);
            if (content.mimeType) {
                console.log(`  Type: ${content.mimeType}`);
            }
            if ('text' in content && typeof content.text === 'string') {
                console.log('  Content:');
                console.log('  ---');
                console.log(content.text
                    .split('\n')
                    .map((line) => '  ' + line)
                    .join('\n'));
                console.log('  ---');
            }
            else if ('blob' in content && typeof content.blob === 'string') {
                console.log(`  [Binary data: ${content.blob.length} bytes]`);
            }
        }
    }
    catch (error) {
        console.log(`Error reading resource ${uri}: ${error}`);
    }
}
async function callToolTask(name, args) {
    if (!client) {
        console.log('Not connected to server.');
        return;
    }
    console.log(`Calling tool '${name}' with task-based execution...`);
    console.log('Arguments:', args);
    // Use task-based execution - call now, fetch later
    // Using the experimental tasks API - WARNING: may change without notice
    console.log('This will return immediately while processing continues in the background...');
    try {
        // Call the tool with task metadata using streaming API
        const stream = client.experimental.tasks.callToolStream({
            name,
            arguments: args
        }, CallToolResultSchema, {
            task: {
                ttl: 60000 // Keep results for 60 seconds
            }
        });
        console.log('Waiting for task completion...');
        let lastStatus = '';
        for await (const message of stream) {
            switch (message.type) {
                case 'taskCreated':
                    console.log('Task created successfully with ID:', message.task.taskId);
                    break;
                case 'taskStatus':
                    if (lastStatus !== message.task.status) {
                        console.log(`  ${message.task.status}${message.task.statusMessage ? ` - ${message.task.statusMessage}` : ''}`);
                    }
                    lastStatus = message.task.status;
                    break;
                case 'result':
                    console.log('Task completed!');
                    console.log('Tool result:');
                    message.result.content.forEach(item => {
                        if (item.type === 'text') {
                            console.log(`  ${item.text}`);
                        }
                    });
                    break;
                case 'error':
                    throw message.error;
            }
        }
    }
    catch (error) {
        console.log(`Error with task-based execution: ${error}`);
    }
}
async function cleanup() {
    if (client && transport) {
        try {
            // First try to terminate the session gracefully
            if (transport.sessionId) {
                try {
                    console.log('Terminating session before exit...');
                    await transport.terminateSession();
                    console.log('Session terminated successfully');
                }
                catch (error) {
                    console.error('Error terminating session:', error);
                }
            }
            // Then close the transport
            await transport.close();
        }
        catch (error) {
            console.error('Error closing transport:', error);
        }
    }
    process.stdin.setRawMode(false);
    readline.close();
    console.log('\nGoodbye!');
    process.exit(0);
}
// Set up raw mode for keyboard input to capture Escape key
process.stdin.setRawMode(true);
process.stdin.on('data', async (data) => {
    // Check for Escape key (27)
    if (data.length === 1 && data[0] === 27) {
        console.log('\nESC key pressed. Disconnecting from server...');
        // Abort current operation and disconnect from server
        if (client && transport) {
            await disconnect();
            console.log('Disconnected. Press Enter to continue.');
        }
        else {
            console.log('Not connected to server.');
        }
        // Re-display the prompt
        process.stdout.write('> ');
    }
});
// Handle Ctrl+C
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Cleaning up...');
    await cleanup();
});
// Start the interactive client
main().catch((error) => {
    console.error('Error running MCP client:', error);
    process.exit(1);
});
//# sourceMappingURL=simpleStreamableHttp.js.map