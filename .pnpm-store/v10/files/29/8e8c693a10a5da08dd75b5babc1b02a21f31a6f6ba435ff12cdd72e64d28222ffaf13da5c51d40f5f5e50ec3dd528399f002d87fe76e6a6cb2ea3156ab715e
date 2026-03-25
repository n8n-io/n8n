import { ClassTransformOptions, TypeMetadata } from './interfaces';
import { TransformationType } from './enums';
export declare class TransformOperationExecutor {
    private transformationType;
    private options;
    private recursionStack;
    constructor(transformationType: TransformationType, options: ClassTransformOptions);
    transform(source: Record<string, any> | Record<string, any>[] | any, value: Record<string, any> | Record<string, any>[] | any, targetType: Function | TypeMetadata, arrayType: Function, isMap: boolean, level?: number): any;
    private applyCustomTransformations;
    private isCircular;
    private getReflectedType;
    private getKeys;
    private checkVersion;
    private checkGroups;
}
