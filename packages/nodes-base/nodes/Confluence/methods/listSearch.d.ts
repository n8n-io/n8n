import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
export declare function getSites(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult>;
export declare function searchSpaces(this: ILoadOptionsFunctions, filter?: string, paginationToken?: string): Promise<INodeListSearchResult>;
export declare function getLabels(this: ILoadOptionsFunctions, filter?: string, paginationToken?: string): Promise<INodeListSearchResult>;
export declare function searchSpacesWithAll(this: ILoadOptionsFunctions, filter?: string, paginationToken?: string): Promise<INodeListSearchResult>;
export declare function getPages(this: ILoadOptionsFunctions, filter?: string, paginationToken?: string): Promise<INodeListSearchResult>;
//# sourceMappingURL=listSearch.d.ts.map