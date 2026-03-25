import { TypeMetadata, ExposeMetadata, ExcludeMetadata, TransformMetadata } from './interfaces';
import { TransformationType } from './enums';
/**
 * Storage all library metadata.
 */
export declare class MetadataStorage {
    private _typeMetadatas;
    private _transformMetadatas;
    private _exposeMetadatas;
    private _excludeMetadatas;
    private _ancestorsMap;
    addTypeMetadata(metadata: TypeMetadata): void;
    addTransformMetadata(metadata: TransformMetadata): void;
    addExposeMetadata(metadata: ExposeMetadata): void;
    addExcludeMetadata(metadata: ExcludeMetadata): void;
    findTransformMetadatas(target: Function, propertyName: string, transformationType: TransformationType): TransformMetadata[];
    findExcludeMetadata(target: Function, propertyName: string): ExcludeMetadata;
    findExposeMetadata(target: Function, propertyName: string): ExposeMetadata;
    findExposeMetadataByCustomName(target: Function, name: string): ExposeMetadata;
    findTypeMetadata(target: Function, propertyName: string): TypeMetadata;
    getStrategy(target: Function): 'excludeAll' | 'exposeAll' | 'none';
    getExposedMetadatas(target: Function): ExposeMetadata[];
    getExcludedMetadatas(target: Function): ExcludeMetadata[];
    getExposedProperties(target: Function, transformationType: TransformationType): string[];
    getExcludedProperties(target: Function, transformationType: TransformationType): string[];
    clear(): void;
    private getMetadata;
    private findMetadata;
    private findMetadatas;
    private getAncestors;
}
