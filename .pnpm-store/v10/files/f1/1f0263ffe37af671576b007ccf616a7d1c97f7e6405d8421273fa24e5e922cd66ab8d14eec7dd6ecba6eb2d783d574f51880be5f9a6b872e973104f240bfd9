import type { FromSchema } from 'json-schema-to-ts';
import type { Location } from 'react-router-dom';
import type { graphqlConfigSchema } from '../graphql-config-schema';
export type GraphQLConfigTypes = FromSchema<typeof graphqlConfigSchema> & {
    markdown?: {
        parser?: (md: string) => string;
        highlight?: (code: string, lang: string, options?: Record<string, any>) => string;
    };
    onLocationChange?: (location: Partial<Location>) => void;
};
