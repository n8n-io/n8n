"use strict";
/**
 * Simple interactive task client demonstrating elicitation and sampling responses.
 *
 * This client connects to simpleTaskInteractive.ts server and demonstrates:
 * - Handling elicitation requests (y/n confirmation)
 * - Handling sampling requests (returns a hardcoded haiku)
 * - Using task-based tool execution with streaming
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../client/index.js");
const streamableHttp_js_1 = require("../../client/streamableHttp.js");
const node_readline_1 = require("node:readline");
const types_js_1 = require("../../types.js");
// Create readline interface for user input
const readline = (0, node_readline_1.createInterface)({
    input: process.stdin,
    output: process.stdout
});
function question(prompt) {
    return new Promise(resolve => {
        readline.question(prompt, answer => {
            resolve(answer.trim());
        });
    });
}
function getTextContent(result) {
    const textContent = result.content.find((c) => c.type === 'text');
    return textContent?.text ?? '(no text)';
}
async function elicitationCallback(params) {
    console.log(`\n[Elicitation] Server asks: ${params.message}`);
    // Simple terminal prompt for y/n
    const response = await question('Your response (y/n): ');
    const confirmed = ['y', 'yes', 'true', '1'].includes(response.toLowerCase());
    console.log(`[Elicitation] Responding with: confirm=${confirmed}`);
    return { action: 'accept', content: { confirm: confirmed } };
}
async function samplingCallback(params) {
    // Get the prompt from the first message
    let prompt = 'unknown';
    if (params.messages && params.messages.length > 0) {
        const firstMessage = params.messages[0];
        const content = firstMessage.content;
        if (typeof content === 'object' && !Array.isArray(content) && content.type === 'text' && 'text' in content) {
            prompt = content.text;
        }
        else if (Array.isArray(content)) {
            const textPart = content.find(c => c.type === 'text' && 'text' in c);
            if (textPart && 'text' in textPart) {
                prompt = textPart.text;
            }
        }
    }
    console.log(`\n[Sampling] Server requests LLM completion for: ${prompt}`);
    // Return a hardcoded haiku (in real use, call your LLM here)
    const haiku = `Cherry blossoms fall
Softly on the quiet pond
Spring whispers goodbye`;
    console.log('[Sampling] Responding with haiku');
    return {
        model: 'mock-haiku-model',
        role: 'assistant',
        content: { type: 'text', text: haiku }
    };
}
async function run(url) {
    console.log('Simple Task Interactive Client');
    console.log('==============================');
    console.log(`Connecting to ${url}...`);
    // Create client with elicitation and sampling capabilities
    const client = new index_js_1.Client({ name: 'simple-task-interactive-client', version: '1.0.0' }, {
        capabilities: {
            elicitation: { form: {} },
            sampling: {}
        }
    });
    // Set up elicitation request handler
    client.setRequestHandler(types_js_1.ElicitRequestSchema, async (request) => {
        if (request.params.mode && request.params.mode !== 'form') {
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Unsupported elicitation mode: ${request.params.mode}`);
        }
        return elicitationCallback(request.params);
    });
    // Set up sampling request handler
    client.setRequestHandler(types_js_1.CreateMessageRequestSchema, async (request) => {
        return samplingCallback(request.params);
    });
    // Connect to server
    const transport = new streamableHttp_js_1.StreamableHTTPClientTransport(new URL(url));
    await client.connect(transport);
    console.log('Connected!\n');
    // List tools
    const toolsResult = await client.listTools();
    console.log(`Available tools: ${toolsResult.tools.map(t => t.name).join(', ')}`);
    // Demo 1: Elicitation (confirm_delete)
    console.log('\n--- Demo 1: Elicitation ---');
    console.log('Calling confirm_delete tool...');
    const confirmStream = client.experimental.tasks.callToolStream({ name: 'confirm_delete', arguments: { filename: 'important.txt' } }, types_js_1.CallToolResultSchema, { task: { ttl: 60000 } });
    for await (const message of confirmStream) {
        switch (message.type) {
            case 'taskCreated':
                console.log(`Task created: ${message.task.taskId}`);
                break;
            case 'taskStatus':
                console.log(`Task status: ${message.task.status}`);
                break;
            case 'result':
                console.log(`Result: ${getTextContent(message.result)}`);
                break;
            case 'error':
                console.error(`Error: ${message.error}`);
                break;
        }
    }
    // Demo 2: Sampling (write_haiku)
    console.log('\n--- Demo 2: Sampling ---');
    console.log('Calling write_haiku tool...');
    const haikuStream = client.experimental.tasks.callToolStream({ name: 'write_haiku', arguments: { topic: 'autumn leaves' } }, types_js_1.CallToolResultSchema, {
        task: { ttl: 60000 }
    });
    for await (const message of haikuStream) {
        switch (message.type) {
            case 'taskCreated':
                console.log(`Task created: ${message.task.taskId}`);
                break;
            case 'taskStatus':
                console.log(`Task status: ${message.task.status}`);
                break;
            case 'result':
                console.log(`Result:\n${getTextContent(message.result)}`);
                break;
            case 'error':
                console.error(`Error: ${message.error}`);
                break;
        }
    }
    // Cleanup
    console.log('\nDemo complete. Closing connection...');
    await transport.close();
    readline.close();
}
// Parse command line arguments
const args = process.argv.slice(2);
let url = 'http://localhost:8000/mcp';
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
        url = args[i + 1];
        i++;
    }
}
// Run the client
run(url).catch(error => {
    console.error('Error running client:', error);
    process.exit(1);
});
//# sourceMappingURL=simpleTaskInteractiveClient.js.map