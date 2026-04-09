import { type Oas3SecurityScheme, type Oas3SecurityRequirement, type Oas3PathItem, type Oas3_1Schema, type Oas3Operation } from 'core/src/typings/openapi';
import { type Workflow } from '../../types';
import { type ArazzoDefinition } from '@redocly/openapi-core/lib/typings/arazzo';
export type WorkflowsFromDescriptionInput = {
    descriptionPaths: {
        [name: string]: Oas3PathItem<Oas3_1Schema> & {
            connect?: Oas3Operation<Oas3_1Schema>;
            query?: Oas3Operation<Oas3_1Schema>;
        };
    };
    sourceDescriptionName: string;
    rootSecurity: Oas3SecurityRequirement[];
    inputsComponents: NonNullable<ArazzoDefinition['components']>;
    securitySchemes: Record<string, Oas3SecurityScheme>;
};
export declare function generateWorkflowsFromDescription({ descriptionPaths, sourceDescriptionName, rootSecurity, inputsComponents, securitySchemes, }: WorkflowsFromDescriptionInput): Workflow[];
//# sourceMappingURL=generate-workflows-from-description.d.ts.map