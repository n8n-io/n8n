import { Stream } from "stream";
import { Item as SimpleItem, FullItem, ItemFile, Vault } from "../model/models";
import { RequestAdapter, Response } from "./requests";
declare class OPResource {
    protected adapter: RequestAdapter;
    constructor(adapter: RequestAdapter);
}
export declare class Vaults extends OPResource {
    private basePath;
    /**
     * Return all vaults the Service Account has permission to view.
     */
    list(): Promise<Vault[]>;
    /**
     * Search for all Vaults with exact match on title.
     *
     * @param {string} title
     * @returns {Promise<Vault[]>}
     */
    listVaultsByTitle(title: string): Promise<Vault[]>;
    /**
     * Fetch basic information about all items in specified Vault
     *
     * @param vaultId
     */
    listItems(vaultId: string): Promise<SimpleItem[]>;
    /**
     * Get metadata about a single vault.
     *
     * @param {string} vaultQuery - the Vault's title or ID
     */
    getVault(vaultQuery: string): Promise<Vault>;
    /**
     * Get metadata about a single vault with the provided ID.
     *
     * @param {string} vaultId
     */
    getVaultById(vaultId: string): Promise<Vault>;
    /**
     * Searches for a Vault with exact match on title.
     * If no Vaults or multiple Vaults with the same title are found, it returns an error.
     *
     * @param {string} title
     * @returns {Promise<Vault>}
     */
    getVaultByTitle(title: string): Promise<Vault>;
}
export declare class Items extends OPResource {
    private basePath;
    create(vaultId: string, item: FullItem): Promise<FullItem>;
    update(vaultId: any, item: FullItem): Promise<FullItem>;
    /**
     * Get details about a specific Item in a Vault.
     *
     * @param {string} vaultId
     * @param {string} itemQuery - the Item's title or ID
     * @returns {Promise<FullItem>}
     */
    get(vaultId: string, itemQuery: string): Promise<FullItem>;
    /**
     * Deletes an Item with exact match on Title or ID.
     *
     * @param {string} vaultId
     * @param {string} itemQuery
     * @returns {Promise<void>}
     * @private
     */
    delete(vaultId: string, itemQuery: string): Promise<Response>;
    /**
     * Deletes an item with exact match on ID.
     *
     * @param {string} vaultId
     * @param {string} itemId
     * @returns {Promise<void>}
     * @private
     */
    deleteById(vaultId: string, itemId: string): Promise<Response>;
    getById(vaultId: string, itemId: string): Promise<FullItem>;
    /**
     * Deletes an item with exact match on title.
     *
     * @param {string} vaultId
     * @param {string} title
     * @returns {Promise<void>}
     */
    deleteByTitle(vaultId: string, title: string): Promise<Response>;
    /**
     * Search for all Items with exact match on Title.
     *
     * @param {string} vaultId
     * @param {string} itemTitle
     * @returns {Promise<FullItem[]>}
     */
    listItemsByTitle(vaultId: string, itemTitle: string): Promise<FullItem[]>;
    /**
     * Search for the Items in which the Title contains a provided string.
     *
     * @param {string} vaultId
     * @param {string} titleSearchStr
     * @returns {Promise<FullItem[]>}
     */
    listItemsByTitleContains(vaultId: string, titleSearchStr: string): Promise<FullItem[]>;
    /**
     * Searches for an Item with exact match on title.
     * If found, queries for complete item details and returns result.
     *
     * @param {string} vaultId
     * @param {string} title
     * @returns {Promise<FullItem>}
     */
    getByTitle(vaultId: string, title: string): Promise<FullItem>;
    getSimpleItemByTitle(vaultId: string, title: string): Promise<SimpleItem>;
    /**
     * Get Item's OTP.
     * itemQuery param can be an item's Title or ID.
     *
     * If there are more than one OTP field in an item
     * it always returns the first/main one.
     *
     * @param {string} vaultId
     * @param {string} itemQuery
     * @returns {Promise<string>}
     */
    getOTP(vaultId: string, itemQuery: string): Promise<string>;
}
export declare class Files extends OPResource {
    private vaults;
    private items;
    constructor(adapter: RequestAdapter, vaults: Vaults, items: Items);
    /**
     * Get a list of files an Item contains.
     *
     * @param {string} vaultQuery - the Vault's title or ID
     * @param {string} itemQuery  - the Item's title or ID
     * @returns {Promise<ItemFile[]>}
     */
    listFiles(vaultQuery: string, itemQuery: string): Promise<ItemFile[]>;
    /**
     * Get an Item's specific File with a matching ID value.
     *
     * @param {string} vaultQuery - the Vault's title or ID
     * @param {string} itemQuery - the Item's title or ID
     * @param {string} fileId - File's ID
     * @returns {Promise<ItemFile>}
     * @private
     */
    getById(vaultQuery: string, itemQuery: string, fileId: string): Promise<ItemFile>;
    /**
     * Get an Item File's content.
     *
     * @param {string} vaultQuery - the Vault's title or ID
     * @param {string} itemQuery - the Item's title or ID
     * @param {string} fileId - File's ID
     * @returns {Promise<string>}
     */
    getFileContent(vaultQuery: string, itemQuery: string, fileId: string): Promise<string>;
    /**
     * Get an Item File's content stream.
     *
     * @param {string} vaultQuery - the Vault's title or ID
     * @param {string} itemQuery - the Item's title or ID
     * @param {string} fileId - File's ID
     * @returns {Promise<Stream>}
     */
    getFileContentStream(vaultQuery: string, itemQuery: string, fileId: string): Promise<Stream>;
    private generateFilesUrl;
    private generateSingleFileUrl;
    private generateFileContentUrl;
    private vaultIdFromQuery;
    private itemIdFromQuery;
    private streamToString;
}
export {};
