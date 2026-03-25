import { ContentPattern } from '../model/content-pattern.model';
import { StubMapping } from '../model/stub-mapping.model';
import { StubMappings } from '../model/stub-mappings.model';
export declare class MappingService {
    baseUri: string;
    constructor(baseUri: string);
    /**
     * Get all stub mappings
     */
    getAllMappings(): Promise<StubMappings>;
    /**
     * Create a new stub mapping
     * @param stubMapping Stub mapping definition
     */
    createMapping(stubMapping: StubMapping): Promise<StubMapping>;
    /**
     * Create a new stub mapping by file
     * @param fileName File containing a stub mapping
     */
    createMappingFromFile(fileName: string): Promise<StubMapping>;
    /**
     * Create new stub mappings by directory
     * @param directoryName Directory to read files (containing stub mappings) recursively from
     */
    createMappingsFromDir(directoryName: string): Promise<any>;
    /**
     * Delete all stub mappings
     */
    deleteAllMappings(): Promise<void>;
    /**
     * Reset stub mappings (restore to defaults defined back the backing store)
     */
    resetAllMappings(): Promise<void>;
    /**
     * Get single stub mapping
     * @param uuid The UUID of stub mapping
     */
    getMapping(uuid: string): Promise<StubMapping>;
    /**
     * Update an existing stub mapping
     * @param uuid The UUID of stub mapping
     * @param stubMapping Stub mapping definition
     */
    updateMapping(uuid: string, stubMapping: StubMapping): Promise<StubMapping>;
    /**
     * Delete a stub mapping
     * @param uuid The UUID of stub mapping
     */
    deleteMapping(uuid: string): Promise<void>;
    /**
     * Save all persistent stub mappings to the backing store
     */
    saveAllMappings(): Promise<void>;
    /**
     * Find stubs by matching on their metadata
     */
    findByMetaData(contentPattern: ContentPattern): Promise<StubMappings>;
    /**
     * Remove stubs by matching on their metadata
     */
    removeByMetaData(contentPattern: ContentPattern): Promise<void>;
}
