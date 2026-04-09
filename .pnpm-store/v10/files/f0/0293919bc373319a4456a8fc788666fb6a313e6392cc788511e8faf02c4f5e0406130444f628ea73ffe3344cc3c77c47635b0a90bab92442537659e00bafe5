import type { AdditionalParameterProperties } from '../../types';
export type ParameterWithIn = {
    in: 'header' | 'query' | 'path' | 'cookie';
    name: string;
    value: string | number | boolean;
} & AdditionalParameterProperties;
export type ParameterWithoutIn = Omit<ParameterWithIn, 'in'>;
export declare function isParameterWithoutIn(parameter: any): parameter is ParameterWithoutIn;
export declare function isParameterWithIn(parameter: any): parameter is ParameterWithIn;
//# sourceMappingURL=parse-parameters.d.ts.map