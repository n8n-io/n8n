export { Mapping, SourceMap } from '@volar/source-map';
export * from './lib/editorFeatures';
export * from './lib/linkedCodeMap';
export * from './lib/types';
export * from './lib/utils';
import type { Language, LanguagePlugin, MapperFactory, SourceScript, VirtualCode } from './lib/types';
export declare const defaultMapperFactory: MapperFactory;
export declare function createLanguage<T>(plugins: LanguagePlugin<T>[], scriptRegistry: Map<T, SourceScript<T>>, sync: (id: T, includeFsFiles: boolean, shouldRegister: boolean) => void, onAssociationDirty?: (targetId: T) => void): Language<T>;
export declare function forEachEmbeddedCode(virtualCode: VirtualCode): Generator<VirtualCode>;
