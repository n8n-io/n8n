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
exports.Import = void 0;
/**
 *
 * @param {Constructor<HttpBaseClient>} Base - The base class to be extended.
 * @returns {class} - The extended class with additional methods for collection management.
 *
 * @method listImportJobs - Lists all import jobs.
 * @method createImportJobs - Creates new import jobs.
 * @method getImportJobProgress - Retrieves the progress of an import job.
 */
function Import(Base) {
    return class extends Base {
        get importPrefix() {
            return '/vectordb/jobs/import';
        }
        listImportJobs(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.importPrefix}/list`;
                return yield this.POST(url, params, options);
            });
        }
        createImportJobs(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.importPrefix}/create`;
                return yield this.POST(url, params, options);
            });
        }
        getImportJobProgress(params, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const url = `${this.importPrefix}/get_progress`;
                return yield this.POST(url, params, options);
            });
        }
    };
}
exports.Import = Import;
//# sourceMappingURL=Import.js.map