import * as React from 'react';
import type { SchemaOptions } from '../Schema/Schema';
import type { FieldModel } from '../../services/models';
import { RedocNormalizedOptions } from '../../services/RedocNormalizedOptions';
export interface FieldProps extends SchemaOptions {
    className?: string;
    isLast?: boolean;
    showExamples?: boolean;
    field: FieldModel;
    expandByDefault?: boolean;
    fieldParentsName?: string[];
    renderDiscriminatorSwitch?: (opts: FieldProps) => JSX.Element;
}
export declare class Field extends React.Component<FieldProps> {
    static contextType: React.Context<RedocNormalizedOptions>;
    context: RedocNormalizedOptions;
    toggle: () => void;
    handleKeyPress: (e: any) => void;
    render(): React.JSX.Element;
}
