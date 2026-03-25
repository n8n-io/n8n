"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPConnect = exports.newConnectClient = void 0;
const resources_1 = require("./resources");
const client_1 = require("./client");
const requests_1 = require("./requests");
const constants_1 = require("./constants");
/**
 * OnePasswordConnect client factory.
 *
 * @param {OPConfig} opts
 * @returns {OPConnect}
 */
const newConnectClient = (opts) => {
    if (opts && typeof opts !== "object") {
        throw new TypeError("Options argument must be an object");
    }
    if (!opts.serverURL || !opts.token) {
        throw new Error("Options serverURL and token are required.");
    }
    return new OPConnect(opts);
};
exports.newConnectClient = newConnectClient;
class OPConnect {
    constructor(opts) {
        this.httpAdapter = new requests_1.RequestAdapter(opts.httpClient ? opts.httpClient : new client_1.HTTPClient(opts), { serverURL: opts.serverURL, token: opts.token });
        this.vaults = new resources_1.Vaults(this.httpAdapter);
        this.items = new resources_1.Items(this.httpAdapter);
        this.files = new resources_1.Files(this.httpAdapter, this.vaults, this.items);
    }
    /**
     * Returns a list of all Vaults the Service Account has permission
     * to view.
     *
     * @returns {Promise<Vault[]>}
     */
    listVaults() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.vaults.list();
        });
    }
    /**
     * Returns a list of Vaults with a matching Title value.
     *
     * The Vault Title must be an exact-match.
     *
     * @param {string} vaultTitle
     * @returns {Promise<Vault[]>}
     */
    listVaultsByTitle(vaultTitle) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.vaults.listVaultsByTitle(vaultTitle);
        });
    }
    /**
     * Get details about a specific vault wih a matching ID or Title value.
     *
     * If the Service Account does not have permission to view the vault, an
     * error is returned.
     *
     * @param {string} vaultQuery
     * @returns {Promise<Vault>}
     */
    getVault(vaultQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!vaultQuery) {
                throw new Error(constants_1.ERROR_MESSAGE.PROVIDE_VAULT_NAME_OR_ID);
            }
            return this.vaults.getVault(vaultQuery);
        });
    }
    /**
     * Get details about a specific vault with a matching ID value.
     *
     * @param {string} vaultId
     * @returns {Promise<Vault>}
     */
    getVaultById(vaultId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.vaults.getVaultById(vaultId);
        });
    }
    /**
     * Get details about a specific vault with a matching Title value.
     *
     * The Vault Title must be an exact-match.
     *
     * @param {string} vaultTitle
     * @returns {Promise<Vault>}
     */
    getVaultByTitle(vaultTitle) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.vaults.getVaultByTitle(vaultTitle);
        });
    }
    /**
     * Lists all Items inside a specific Vault.
     *
     * @param {string} vaultId
     * @returns {Promise<SimpleItem[]>}
     */
    listItems(vaultId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.vaults.listItems(vaultId);
        });
    }
    /**
     * Returns a list of Items with a matching Title value.
     *
     * @param {string} vaultId
     * @param {string} itemTitle
     * @returns {Promise<FullItem[]>}
     */
    listItemsByTitle(vaultId, itemTitle) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.items.listItemsByTitle(vaultId, itemTitle);
        });
    }
    /**
     * Returns a list of Items that contain provided string.
     *
     *
     * @param {string} vaultId
     * @param {string} titleSearchStr
     * @returns {Promise<FullItem[]>}
     */
    listItemsByTitleContains(vaultId, titleSearchStr) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.items.listItemsByTitleContains(vaultId, titleSearchStr);
        });
    }
    /**
     * Get details about a specific Item in a Vault.
     *
     * @param {string} vaultId
     * @param {string} itemQuery
     * @returns {Promise<FullItem>}
     */
    getItem(vaultId, itemQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!itemQuery) {
                throw new Error(constants_1.ERROR_MESSAGE.PROVIDE_ITEM_NAME_OR_ID);
            }
            return this.items.get(vaultId, itemQuery);
        });
    }
    /**
     * Get details about a specific Item with a matching ID value.
     *
     * @param {string} vaultId
     * @param {string} itemId
     * @returns {Promise<FullItem>}
     */
    getItemById(vaultId, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.items.getById(vaultId, itemId);
        });
    }
    /**
     * Get details about a specific Item with a matching Title value.
     *
     * The Item Title must be an exact-match.
     *
     * @param {string} vaultId
     * @param {string} title
     * @returns {Promise<FullItem>}
     */
    getItemByTitle(vaultId, title) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.items.getByTitle(vaultId, title);
        });
    }
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
    getItemOTP(vaultId, itemQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.items.getOTP(vaultId, itemQuery);
        });
    }
    /**
     * Creates a new Item inside the specified Vault.
     *
     * @param {string} vaultId
     * @param {FullItem} item
     * @returns {Promise<FullItem>}
     */
    createItem(vaultId, item) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.items.create(vaultId, item);
        });
    }
    /**
     * Perform a replacement update of an Item. The given `item` object will
     * overwrite the existing item in the Vault.
     *
     * @param {string} vaultId
     * @param {FullItem} item
     * @returns {Promise<FullItem>}
     */
    updateItem(vaultId, item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!item.id)
                throw Error("Item ID must be defined.");
            return yield this.items.update(vaultId, item);
        });
    }
    /**
     * Delete a specific item with a matching ID or Title.
     *
     * The Item Title must be an exact-match.
     *
     * @param {string} vaultId
     * @param {string} itemQuery
     * @returns {Promise<void>}
     */
    deleteItem(vaultId, itemQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!itemQuery) {
                throw new Error(constants_1.ERROR_MESSAGE.PROVIDE_ITEM_NAME_OR_ID);
            }
            yield this.items.delete(vaultId, itemQuery);
        });
    }
    /**
     * Delete a specific item with a matching ID value.
     *
     * @param {string} vaultId
     * @param {string} itemId
     * @returns {Promise<void>}
     */
    deleteItemById(vaultId, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.items.deleteById(vaultId, itemId);
        });
    }
    /**
     * Delete a specific item with a matching Title value.
     *
     * The Item Title must be an exact-match.
     *
     * @param {string} vaultId
     * @param {string} itemTitle
     * @returns {Promise<void>}
     */
    deleteItemByTitle(vaultId, itemTitle) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.items.deleteByTitle(vaultId, itemTitle);
        });
    }
    /**
     * Get a list of files an Item contains.
     *
     * @param {string} vaultQuery - the Vault's title or ID
     * @param {string} itemQuery - the Item's title or ID
     * @returns {Promise<ItemFile[]>}
     */
    listFiles(vaultQuery, itemQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.files.listFiles(vaultQuery, itemQuery);
        });
    }
    /**
     * Get an Item's specific File with a matching ID value.
     *
     * @param {string} vaultQuery - the Vault's title or ID
     * @param {string} itemQuery - the Item's title or ID
     * @param {string} fileId - File's ID
     * @returns {Promise<ItemFile>}
     */
    getFileById(vaultQuery, itemQuery, fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.files.getById(vaultQuery, itemQuery, fileId);
        });
    }
    /**
     * Get an Item File's content.
     *
     * @param {string} vaultQuery - the Vault's title or ID
     * @param {string} itemQuery - the Item's title or ID
     * @param {string} fileId - File's ID
     * @returns {Promise<string>}
     */
    getFileContent(vaultQuery, itemQuery, fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.files.getFileContent(vaultQuery, itemQuery, fileId);
        });
    }
    /**
     * Get an Item File's content stream.
     *
     * @param {string} vaultQuery - the Vault's title or ID
     * @param {string} itemQuery - the Item's title or ID
     * @param {string} fileId - File's ID
     * @returns {Promise<Stream>}
     */
    getFileContentStream(vaultQuery, itemQuery, fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.files.getFileContentStream(vaultQuery, itemQuery, fileId);
        });
    }
}
exports.OPConnect = OPConnect;
//# sourceMappingURL=op-connect.js.map