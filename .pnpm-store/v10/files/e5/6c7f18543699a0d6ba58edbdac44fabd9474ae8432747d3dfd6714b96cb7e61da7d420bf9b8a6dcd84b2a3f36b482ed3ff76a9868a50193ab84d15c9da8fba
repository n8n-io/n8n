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
exports.Role = void 0;
/**
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 * @method listRoles - Lists all roles in the system.
 * @method describeRole - Describes a role.
 * @method createRole - Creates a new role.
 * @method dropRole - Deletes a role.
 * @method grantPrivilegeToRole - Grants a privilege to a role.
 * @method revokePrivilegeFromRole - Revokes a privilege from a role.
 */
function Role(Base) {
    return class extends Base {
        get rolePrefix() {
            return '/vectordb/roles';
        }
        listRoles(options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.rolePrefix}/list`;
                return yield this.POST(url, {}, options);
            });
        }
        describeRole(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.rolePrefix}/describe`;
                return yield this.POST(url, params, options);
            });
        }
        createRole(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.rolePrefix}/create`;
                return yield this.POST(url, params, options);
            });
        }
        dropRole(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.rolePrefix}/drop`;
                return yield this.POST(url, params, options);
            });
        }
        grantPrivilegeToRole(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.rolePrefix}/grant_privilege`;
                return yield this.POST(url, params, options);
            });
        }
        revokePrivilegeFromRole(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.rolePrefix}/revoke_privilege`;
                return yield this.POST(url, params, options);
            });
        }
    };
}
exports.Role = Role;
//# sourceMappingURL=Role.js.map