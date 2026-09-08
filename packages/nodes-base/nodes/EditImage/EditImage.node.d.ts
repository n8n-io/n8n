import type { IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData, INodePropertyOptions, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare function resolveGravity(horizontal: string, vertical: string): string;
export declare class EditImage implements INodeType {
    description: INodeTypeDescription;
    methods: {
        loadOptions: {
            getFonts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
        };
    };
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
//# sourceMappingURL=EditImage.node.d.ts.map