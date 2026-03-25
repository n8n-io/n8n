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
exports.User = void 0;
/**
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 * @method createUser - Creates a new user in Milvus.
 * @method updateUserPassword - Updates the password of a user.
 * @method dropUser - Deletes a user from Milvus.
 * @method describeUser - Retrieves the description of a specific user.
 * @method listUsers - Lists all users in the Milvus cluster.
 * @method grantRole - Grants a role to a user.
 * @method revokeRole - Revokes a role from a user.
 */
function User(Base) {
    return class extends Base {
        get userPrefix() {
            return '/vectordb/users';
        }
        createUser(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.userPrefix}/create`;
                return this.POST(url, params, options);
            });
        }
        updateUserPassword(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.userPrefix}/update_password`;
                return this.POST(url, params, options);
            });
        }
        dropUser(param, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.userPrefix}/drop`;
                return this.POST(url, param, options);
            });
        }
        describeUser(param, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.userPrefix}/describe`;
                return this.POST(url, param, options);
            });
        }
        listUsers(options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.userPrefix}/list`;
                return this.POST(url, {}, options);
            });
        }
        grantRoleToUser(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.userPrefix}/grant_role`;
                return this.POST(url, params, options);
            });
        }
        revokeRoleFromUser(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.userPrefix}/revoke_role`;
                return this.POST(url, params, options);
            });
        }
    };
}
exports.User = User;
//# sourceMappingURL=User.js.map