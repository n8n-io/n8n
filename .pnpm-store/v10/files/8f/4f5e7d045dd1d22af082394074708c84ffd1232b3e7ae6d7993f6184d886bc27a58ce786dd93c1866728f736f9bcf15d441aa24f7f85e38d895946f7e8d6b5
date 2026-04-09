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
exports.Database = void 0;
/**
 * Database is a mixin function that extends the functionality of a base class.
 * It provides methods to interact with databases in a Milvus cluster.
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for database management.
 *
 * @method createDatabase - Creates a new database.
 * @method dropDatabase - Drops a database.
 * @method describeDatabase - Describes a database.
 * @method listDatabases - Lists all databases.
 * @method alterDatabaseProperties - Alters properties of a database.
 * @method dropDatabaseProperties - Drops properties of a database.
 */
function Database(Base) {
    return class extends Base {
        get databasePrefix() {
            return '/vectordb/databases';
        }
        createDatabase(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.databasePrefix}/create`;
                return yield this.POST(url, params, options);
            });
        }
        dropDatabase(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.databasePrefix}/drop`;
                return yield this.POST(url, params, options);
            });
        }
        describeDatabase(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.databasePrefix}/describe`;
                return yield this.POST(url, params, options);
            });
        }
        listDatabases(options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.databasePrefix}/list`;
                return yield this.POST(url, {}, options);
            });
        }
        alterDatabaseProperties(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.databasePrefix}/alter`;
                return yield this.POST(url, params, options);
            });
        }
        dropDatabaseProperties(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.databasePrefix}/drop_properties`;
                return yield this.POST(url, params, options);
            });
        }
    };
}
exports.Database = Database;
//# sourceMappingURL=Database.js.map