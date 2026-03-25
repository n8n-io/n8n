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
exports.Alias = void 0;
/**
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 * @method listAliases - Lists all aliases in a collection.
 * @method createAlias - Creates a new alias in a collection.
 * @method describeAlias - Describes an alias.
 * @method dropAlias - Deletes an alias.
 * @method alterAlias - Modifies an alias to another collection.
 */
function Alias(Base) {
    return class extends Base {
        get aliasPrefix() {
            return '/vectordb/aliases';
        }
        listAliases(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.aliasPrefix}/list`;
                return yield this.POST(url, params, options);
            });
        }
        createAlias(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.aliasPrefix}/create`;
                return yield this.POST(url, params, options);
            });
        }
        describeAlias(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.aliasPrefix}/describe`;
                return yield this.POST(url, params, options);
            });
        }
        dropAlias(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.aliasPrefix}/drop`;
                return yield this.POST(url, params, options);
            });
        }
        alterAlias(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.aliasPrefix}/alter`;
                return yield this.POST(url, params, options);
            });
        }
    };
}
exports.Alias = Alias;
//# sourceMappingURL=Alias.js.map