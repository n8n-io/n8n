import * as React from 'react';
import { SchemaModel } from '../../services/models';
import { SchemaProps } from './Schema';
export interface ObjectSchemaProps extends SchemaProps {
    discriminator?: {
        fieldName: string;
        parentSchema: SchemaModel;
    };
    fieldParentsName?: string[];
}
export declare const ObjectSchema: ({ schema: { fields, title }, showTitle, discriminator, skipReadOnly, skipWriteOnly, level, fieldParentsName, }: ObjectSchemaProps) => React.JSX.Element;
