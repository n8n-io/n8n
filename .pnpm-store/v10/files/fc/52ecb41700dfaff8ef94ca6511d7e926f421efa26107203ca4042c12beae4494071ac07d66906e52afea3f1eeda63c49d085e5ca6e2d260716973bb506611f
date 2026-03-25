import * as React from 'react';
export interface EnumValuesProps {
    values?: string[] | {
        [name: string]: string;
    };
    type: string | string[];
}
export interface EnumValuesState {
    collapsed: boolean;
}
export declare class EnumValues extends React.PureComponent<EnumValuesProps, EnumValuesState> {
    constructor(props: EnumValuesProps);
    state: EnumValuesState;
    static contextType: React.Context<import("../../services/RedocNormalizedOptions").RedocNormalizedOptions>;
    private toggle;
    render(): React.JSX.Element | null;
}
