import { Stream } from 'stream';
import { FullItem } from "../model/fullItem";
import { Item as SimpleItem } from "../model/item";
import { Vault } from "../model/vault";
import { ItemFile } from "../model/itemFile";
import { IRequestClient } from "./client";
export interface OPConfig {
    serverURL: string;
    token: string;
    httpClient?: IRequestClient;
    keepAlive?: boolean;
    timeout?: number;
}
/**
 * OnePasswordConnect client factory.
 *
 * @param {OPConfig} opts
 * @returns {OPConnect}
 */
export declare const newConnectClient: (opts: OPConfig) => OPConnect;
export declare class OPConnect {
    private vaults;
    private items;
    private files;
    private readonly httpAdapter;
    constructor(opts: OPConfig);
    /**
     * Returns a list of all Vaults the Service Account has permission
     * to view.
     *
     * @returns {Promise<Vault[]>}
     */
    listVaults(): Promise<Vault[]>;
    /**
     * Returns a list of Vaults with a matching Title value.
     *
     * The Vault Title must be an exact-match.
     *
     * @param {string} vaultTitle
     * @returns {Promise<Vault[]>}
     */
    listVaultsByTitle(vaultTitle: string): Promise<Vault[]>;
    /**
     * Get details about a specific vault wih a matching ID or Title value.
     *
     * If the Service Account does not have permission to view the vault, an
     * error is returned.
     *
     * @param {string} vaultQuery
     * @returns {Promise<Vault>}
     */
    getVault(vaultQuery: string): Promise<Vault>;
    /**
     * Get details about a specific vault with a matching ID value.
     *
     * @param {string} vaultId
     * @returns {Promise<Vault>}
     */
    getVaultById(vaultId: string): Promise<Vault>;
    /**
     * Get details about a specific vault with a matching Title value.
     *
     * The Vault Title must be an exact-match.
     *
     * @param {string} vaultTitle
     * @returns {Promise<Vault>}
     */
    getVaultByTitle(vaultTitle: string): Promise<Vault>;
    /**
     * Lists all Items inside a specific Vault.
     *
     * @param {string} vaultId
     * @returns {Promise<SimpleItem[]>}
     */
    listItems(vaultId: string): Promise<SimpleItem[]>;
    /**
     * Returns a list of Items with a matching Title value.
     *
     * @param {string} vaultId
     * @param {string} itemTitle
     * @returns {Promise<FullItem[]>}
     */
    listItemsByTitle(vaultId: string, itemTitle: string): Promise<FullItem[]>;
    /**
     * Returns a list of Items that contain provided string.
     *
     *
     * @param {string} vaultId
     * @param {string} titleSearchStr
     * @returns {Promise<FullItem[]>}
     */
    listItemsByTitleContains(vaultId: string, titleSearchStr: string): Promise<FullItem[]>;
    /**
     * Get details about a specific Item in a Vault.
     *
     * @param {string} vaultId
     * @param {string} itemQuery
     * @returns {Promise<FullItem>}
     */
    getItem(vaultId: string, itemQuery: string): Promise<FullItem>;
    /**
     * Get details about a specific Item with a matching ID value.
     *
     * @param {string} vaultId
     * @param {string} itemId
     * @returns {Promise<FullItem>}
     */
    getItemById(vaultId: string, itemId: string): Promise<FullItem>;
    /**
     * Get details about a specific Item with a matching Title value.
     *
     * The Item Title must be an exact-match.
     *
     * @param {string} vaultId
     * @param {string} title
     * @returns {Promise<FullItem>}
     */
    getItemByTitle(vaultId: string, title: string): Promise<FullItem>;
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
    getItemOTP(vaultId: string, itemQuery: string): Promise<string>;
    /**
     * Creates a new Item inside the specified Vault.
     *
     * @param {string} vaultId
     * @param {FullItem} item
     * @returns {Promise<FullItem>}
     */
    createItem(vaultId: string, item: FullItem): Promise<FullItem>;
    /**
     * Perform a replacement update of an Item. The given `item` object will
     * overwrite the existing item in the Vault.
     *
     * @param {string} vaultId
     * @param {FullItem} item
     * @returns {Promise<FullItem>}
     */
    updateItem(vaultId: string, item: FullItem): Promise<FullItem>;
    /**
     * Delete a specific item with a matching ID or Title.
     *
     * The Item Title must be an exact-match.
     *
     * @param {string} vaultId
     * @param {string} itemQuery
     * @returns {Promise<void>}
     */
    deleteItem(vaultId: string, itemQuery: string): Promise<void>;
    /**
     * Delete a specific item with a matching ID value.
     *
     * @param {string} vaultId
     * @param {string} itemId
     * @returns {Promise<void>}
     */
    deleteItemById(vaultId: string, itemId: string): Promise<void>;
    /**
     * Delete a specific item with a matching Title value.
     *
     * The Item Title must be an exact-match.
     *
     * @param {string} vaultId
     * @param {string} itemTitle
     * @returns {Promise<void>}
     */
    deleteItemByTitle(vaultId: string, itemTitle: string): Promise<void>;
    /**
     * Get a list of files an Item contains.
     *
     * @param {string} vaultQuery - the Vault's title or ID
     * @param {string} itemQuery - the Item's title or ID
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
     */
    getFileById(vaultQuery: string, itemQuery: string, fileId: string): Promise<ItemFile>;
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
}
