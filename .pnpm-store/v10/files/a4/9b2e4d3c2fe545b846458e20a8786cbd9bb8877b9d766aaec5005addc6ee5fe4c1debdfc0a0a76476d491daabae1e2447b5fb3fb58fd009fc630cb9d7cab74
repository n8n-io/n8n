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
exports.Files = exports.Items = exports.Vaults = void 0;
const models_1 = require("../model/models");
const utils_1 = require("./utils");
class OPResource {
    constructor(adapter) {
        this.adapter = adapter;
    }
}
class Vaults extends OPResource {
    constructor() {
        super(...arguments);
        this.basePath = "v1/vaults";
    }
    /**
     * Return all vaults the Service Account has permission to view.
     */
    list() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.adapter.sendRequest("get", `${this.basePath}/`);
            return models_1.ObjectSerializer.deserialize(data, "Array<Vault>");
        });
    }
    /**
     * Search for all Vaults with exact match on title.
     *
     * @param {string} title
     * @returns {Promise<Vault[]>}
     */
    listVaultsByTitle(title) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.adapter.sendRequest("get", `${this.basePath}/?${utils_1.QueryBuilder.filterByTitle(title)}`);
            return models_1.ObjectSerializer.deserialize(data, "Array<Vault>");
        });
    }
    /**
     * Fetch basic information about all items in specified Vault
     *
     * @param vaultId
     */
    listItems(vaultId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.adapter.sendRequest("get", `${this.basePath}/${vaultId}/items`);
            return models_1.ObjectSerializer.deserialize(data, "Array<Item>");
        });
    }
    /**
     * Get metadata about a single vault.
     *
     * @param {string} vaultQuery - the Vault's title or ID
     */
    getVault(vaultQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((0, utils_1.isValidId)(vaultQuery)) {
                return this.getVaultById(vaultQuery);
            }
            return this.getVaultByTitle(vaultQuery);
        });
    }
    /**
     * Get metadata about a single vault with the provided ID.
     *
     * @param {string} vaultId
     */
    getVaultById(vaultId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.adapter.sendRequest("get", `${this.basePath}/${vaultId}`);
            return models_1.ObjectSerializer.deserialize(data, "Vault");
        });
    }
    /**
     * Searches for a Vault with exact match on title.
     * If no Vaults or multiple Vaults with the same title are found, it returns an error.
     *
     * @param {string} title
     * @returns {Promise<Vault>}
     */
    getVaultByTitle(title) {
        return __awaiter(this, void 0, void 0, function* () {
            const vaults = yield this.listVaultsByTitle(title);
            if (!(vaults === null || vaults === void 0 ? void 0 : vaults.length)) {
                return Promise.reject(utils_1.HttpErrorFactory.noVaultsFoundByTitle());
            }
            if (vaults.length > 1) {
                return Promise.reject(utils_1.HttpErrorFactory.multipleVaultsFoundByTitle());
            }
            return vaults[0];
        });
    }
}
exports.Vaults = Vaults;
class Items extends OPResource {
    constructor() {
        super(...arguments);
        this.basePath = (vaultId, itemId) => itemId && typeof itemId !== "undefined"
            ? `v1/vaults/${vaultId}/items/${itemId}`
            : `v1/vaults/${vaultId}/items/`;
    }
    create(vaultId, item) {
        return __awaiter(this, void 0, void 0, function* () {
            item.vault = Object.assign(item.vault || {}, {
                id: vaultId
            });
            const { data } = yield this.adapter.sendRequest("post", this.basePath(vaultId), {
                data: models_1.ObjectSerializer.serialize(item, "FullItem"),
            });
            return models_1.ObjectSerializer.deserialize(data, "FullItem");
        });
    }
    update(vaultId, item) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.adapter.sendRequest("put", this.basePath(vaultId, item.id), { data: models_1.ObjectSerializer.serialize(item, "FullItem") });
            return models_1.ObjectSerializer.deserialize(data, "FullItem");
        });
    }
    /**
     * Get details about a specific Item in a Vault.
     *
     * @param {string} vaultId
     * @param {string} itemQuery - the Item's title or ID
     * @returns {Promise<FullItem>}
     */
    get(vaultId, itemQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((0, utils_1.isValidId)(itemQuery)) {
                return this.getById(vaultId, itemQuery);
            }
            return this.getByTitle(vaultId, itemQuery);
        });
    }
    /**
     * Deletes an Item with exact match on Title or ID.
     *
     * @param {string} vaultId
     * @param {string} itemQuery
     * @returns {Promise<void>}
     * @private
     */
    delete(vaultId, itemQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((0, utils_1.isValidId)(itemQuery)) {
                return this.deleteById(vaultId, itemQuery);
            }
            return this.deleteByTitle(vaultId, itemQuery);
        });
    }
    /**
     * Deletes an item with exact match on ID.
     *
     * @param {string} vaultId
     * @param {string} itemId
     * @returns {Promise<void>}
     * @private
     */
    deleteById(vaultId, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.adapter.sendRequest("delete", this.basePath(vaultId, itemId));
        });
    }
    getById(vaultId, itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.adapter.sendRequest("get", this.basePath(vaultId, itemId));
            return models_1.ObjectSerializer.deserialize(data, "FullItem");
        });
    }
    /**
     * Deletes an item with exact match on title.
     *
     * @param {string} vaultId
     * @param {string} title
     * @returns {Promise<void>}
     */
    deleteByTitle(vaultId, title) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield this.getSimpleItemByTitle(vaultId, title);
            return this.deleteById(vaultId, item.id);
        });
    }
    /**
     * Search for all Items with exact match on Title.
     *
     * @param {string} vaultId
     * @param {string} itemTitle
     * @returns {Promise<FullItem[]>}
     */
    listItemsByTitle(vaultId, itemTitle) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.adapter.sendRequest("get", `${this.basePath(vaultId)}?${utils_1.QueryBuilder.filterByTitle(itemTitle)}`);
            return Promise.all(data.map(item => this.getById(vaultId, item.id)));
        });
    }
    /**
     * Search for the Items in which the Title contains a provided string.
     *
     * @param {string} vaultId
     * @param {string} titleSearchStr
     * @returns {Promise<FullItem[]>}
     */
    listItemsByTitleContains(vaultId, titleSearchStr) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.adapter.sendRequest("get", `${this.basePath(vaultId)}?${utils_1.QueryBuilder.searchByTitle(titleSearchStr)}`);
            return Promise.all(data.map((item) => this.getById(vaultId, item.id)));
        });
    }
    /**
     * Searches for an Item with exact match on title.
     * If found, queries for complete item details and returns result.
     *
     * @param {string} vaultId
     * @param {string} title
     * @returns {Promise<FullItem>}
     */
    getByTitle(vaultId, title) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield this.getSimpleItemByTitle(vaultId, title);
            return this.getById(item.vault.id, item.id);
        });
    }
    getSimpleItemByTitle(vaultId, title) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryPath = `${this.basePath(vaultId)}?${utils_1.QueryBuilder.filterByTitle(title)}`;
            const { data } = yield this.adapter.sendRequest("get", queryPath);
            if (!(data === null || data === void 0 ? void 0 : data.length)) {
                return Promise.reject(utils_1.HttpErrorFactory.noItemsFoundByTitle());
            }
            if (data.length > 1) {
                return Promise.reject(utils_1.HttpErrorFactory.multipleItemsFoundByTitle());
            }
            return models_1.ObjectSerializer.deserialize(data[0], "Item");
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
    getOTP(vaultId, itemQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            const item = yield this.get(vaultId, itemQuery);
            const otp = item.extractOTP();
            if (!otp) {
                throw new Error(utils_1.ErrorMessageFactory.noOTPFoundForItem(item.id));
            }
            return otp;
        });
    }
}
exports.Items = Items;
class Files extends OPResource {
    constructor(adapter, vaults, items) {
        super(adapter);
        this.vaults = vaults;
        this.items = items;
    }
    /**
     * Get a list of files an Item contains.
     *
     * @param {string} vaultQuery - the Vault's title or ID
     * @param {string} itemQuery  - the Item's title or ID
     * @returns {Promise<ItemFile[]>}
     */
    listFiles(vaultQuery, itemQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = yield this.generateFilesUrl(vaultQuery, itemQuery);
            const { data } = yield this.adapter.sendRequest("get", url);
            return models_1.ObjectSerializer.deserialize(data, "Array<ItemFile>");
        });
    }
    /**
     * Get an Item's specific File with a matching ID value.
     *
     * @param {string} vaultQuery - the Vault's title or ID
     * @param {string} itemQuery - the Item's title or ID
     * @param {string} fileId - File's ID
     * @returns {Promise<ItemFile>}
     * @private
     */
    getById(vaultQuery, itemQuery, fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = yield this.generateSingleFileUrl(vaultQuery, itemQuery, fileId);
            const { data } = yield this.adapter.sendRequest("get", url);
            return models_1.ObjectSerializer.deserialize(data, "ItemFile");
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
            const url = yield this.generateFileContentUrl(vaultQuery, itemQuery, fileId);
            const { data } = yield this.adapter.sendRequest("get", url, { responseType: "stream" });
            return this.streamToString(data);
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
            const url = yield this.generateFileContentUrl(vaultQuery, itemQuery, fileId);
            const { data } = yield this.adapter.sendRequest("get", url, { responseType: "stream" });
            return data;
        });
    }
    generateFilesUrl(vaultQuery, itemQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = "v1/vaults";
            const vaultId = yield this.vaultIdFromQuery(vaultQuery);
            const itemId = yield this.itemIdFromQuery(vaultId, itemQuery);
            url += `/${vaultId}/items/${itemId}/files/`;
            return url;
        });
    }
    generateSingleFileUrl(vaultQuery, itemQuery, fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!fileId) {
                throw new Error(utils_1.ErrorMessageFactory.noFileIdProvided());
            }
            let url = yield this.generateFilesUrl(vaultQuery, itemQuery);
            url += fileId;
            return url;
        });
    }
    generateFileContentUrl(vaultQuery, itemQuery, fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = yield this.generateSingleFileUrl(vaultQuery, itemQuery, fileId);
            url += "/content";
            return url;
        });
    }
    vaultIdFromQuery(query) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(0, utils_1.isValidId)(query)) {
                const vault = yield this.vaults.getVaultByTitle(query);
                return vault.id;
            }
            return query;
        });
    }
    itemIdFromQuery(vaultId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(0, utils_1.isValidId)(query)) {
                const item = yield this.items.getSimpleItemByTitle(vaultId, query);
                return item.id;
            }
            return query;
        });
    }
    streamToString(stream) {
        return new Promise((resolve, reject) => {
            let content = '';
            stream.on('error', (err) => {
                reject(err);
            });
            stream.on('data', (chunk) => {
                content += Buffer.from(chunk).toString();
            });
            stream.on('end', () => {
                resolve(content);
            });
        });
    }
}
exports.Files = Files;
//# sourceMappingURL=resources.js.map