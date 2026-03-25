"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessageFactory = exports.HttpErrorFactory = void 0;
const constants_1 = require("../constants");
class HttpErrorFactory {
    static noVaultsFoundByTitle() {
        return {
            status: 404,
            message: constants_1.ERROR_MESSAGE.NO_VAULTS_FOUND_BY_TITLE
        };
    }
    static multipleVaultsFoundByTitle() {
        return {
            status: 400,
            message: constants_1.ERROR_MESSAGE.MULTIPLE_VAULTS_FOUND_BY_TITLE
        };
    }
    static noItemsFoundByTitle() {
        return {
            status: 404,
            message: constants_1.ERROR_MESSAGE.NO_ITEMS_FOUND_BY_TITLE
        };
    }
    static multipleItemsFoundByTitle() {
        return {
            status: 400,
            message: constants_1.ERROR_MESSAGE.MULTIPLE_ITEMS_FOUND_BY_TITLE
        };
    }
}
exports.HttpErrorFactory = HttpErrorFactory;
class ErrorMessageFactory {
    static noOTPFoundForItem(itemId = "") {
        return `${constants_1.ERROR_MESSAGE.NO_OTP_FOR_THE_ITEM} ${itemId}`;
    }
    static noFileIdProvided() {
        return constants_1.ERROR_MESSAGE.NO_FILE_ID_PROVIDED;
    }
}
exports.ErrorMessageFactory = ErrorMessageFactory;
//# sourceMappingURL=error.js.map