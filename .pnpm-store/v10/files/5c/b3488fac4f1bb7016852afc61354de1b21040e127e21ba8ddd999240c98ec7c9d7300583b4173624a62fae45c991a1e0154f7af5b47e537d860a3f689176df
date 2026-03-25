import type { OpenAPISecurityRequirement, OpenAPISecurityScheme } from '../../types';
import type { OpenAPIParser } from '../OpenAPIParser';
export interface SecurityScheme extends OpenAPISecurityScheme {
    id: string;
    sectionId: string;
    displayName: string;
    scopes: string[];
}
export declare class SecurityRequirementModel {
    schemes: SecurityScheme[];
    constructor(requirement: OpenAPISecurityRequirement, parser: OpenAPIParser);
}
