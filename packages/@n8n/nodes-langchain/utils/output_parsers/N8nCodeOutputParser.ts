import type { ISupplyDataFunctions } from 'n8n-workflow';

import { BaseOutputParser, OutputParserException } from '@langchain/core/output_parsers';
import { JavaScriptSandbox } from 'n8n-nodes-base/dist/nodes/Code/JavaScriptSandbox';
import { PythonSandbox } from 'n8n-nodes-base/dist/nodes/Code/PythonSandbox';
import { getSandboxContext, Sandbox } from 'n8n-nodes-base/dist/nodes/Code/Sandbox';

export class N8nCodeOutputParser extends BaseOutputParser<string[]> {
    lc_namespace = ['n8n-nodes-langchain', 'output_parsers', 'code'];

    private itemIndex: number;
    private code: string;
    private language: string;
    private instructions: string;
    private nodeContext: ISupplyDataFunctions;

    constructor(
        config: {
            itemIndex: number,
            code: string,
            language: string,
            instructions: string,
            nodeContext: ISupplyDataFunctions,
        }
    ) {
        super();

        this.itemIndex = config.itemIndex;
        this.code = config.code;
        this.language = config.language;
        this.instructions = config.instructions;
        this.nodeContext = config.nodeContext;
	}

	async parse(text: string): Promise<any> {
        const sandbox = this.getSandbox(text);
        try {
            const response = await sandbox.runCode();
            return response;
        } catch (error) {
            throw new OutputParserException(error.message)
        }
	}

	getFormatInstructions(): string {
        return this.instructions;
	}

	getSchema() {
        return;
	}

    getSandbox(query: string) {
        const node = this.nodeContext.getNode();
        const workflow = this.nodeContext.getWorkflow();
        const workflowMode = this.nodeContext.getMode();
        const sandboxContext = getSandboxContext.call(this.nodeContext, this.itemIndex);
        sandboxContext.query = query;

        let sandbox: Sandbox;
        if (this.language === 'javaScript') {
            sandbox = new JavaScriptSandbox(sandboxContext, this.code, this.nodeContext.helpers);
        } else {
            sandbox = new PythonSandbox(sandboxContext, this.code, this.nodeContext.helpers);
        }

        sandbox.on(
            'output',
            workflowMode === 'manual'
                ? this.nodeContext.sendMessageToUI.bind(this)
                : (...args: unknown[]) =>
                        console.log(`[Workflow "${workflow.id}"][Node "${node.name}"]`, ...args),
        );
        return sandbox;
    };
}
