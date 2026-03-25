"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsUpdater = exports.TenantsGetter = exports.TenantsExists = exports.TenantsDeleter = exports.TenantsCreator = exports.ShardsUpdater = exports.ShardUpdater = exports.PropertyCreator = exports.SchemaGetter = exports.ClassGetter = exports.ClassDeleter = exports.ClassCreator = void 0;
const classCreator_js_1 = __importDefault(require("./classCreator.js"));
const classDeleter_js_1 = __importDefault(require("./classDeleter.js"));
const classExists_js_1 = __importDefault(require("./classExists.js"));
const classGetter_js_1 = __importDefault(require("./classGetter.js"));
const classUpdater_js_1 = __importDefault(require("./classUpdater.js"));
const deleteAll_js_1 = __importDefault(require("./deleteAll.js"));
const getter_js_1 = __importDefault(require("./getter.js"));
const propertyCreator_js_1 = __importDefault(require("./propertyCreator.js"));
const shardUpdater_js_1 = __importDefault(require("./shardUpdater.js"));
const shardsGetter_js_1 = __importDefault(require("./shardsGetter.js"));
const shardsUpdater_js_1 = __importDefault(require("./shardsUpdater.js"));
const tenantsCreator_js_1 = __importDefault(require("./tenantsCreator.js"));
const tenantsDeleter_js_1 = __importDefault(require("./tenantsDeleter.js"));
const tenantsExists_js_1 = __importDefault(require("./tenantsExists.js"));
const tenantsGetter_js_1 = __importDefault(require("./tenantsGetter.js"));
const tenantsUpdater_js_1 = __importDefault(require("./tenantsUpdater.js"));
const schema = (client) => {
    return {
        classCreator: () => new classCreator_js_1.default(client),
        classDeleter: () => new classDeleter_js_1.default(client),
        classGetter: () => new classGetter_js_1.default(client),
        classUpdater: () => new classUpdater_js_1.default(client),
        exists: (className) => new classExists_js_1.default(client).withClassName(className).do(),
        getter: () => new getter_js_1.default(client),
        propertyCreator: () => new propertyCreator_js_1.default(client),
        deleteAll: () => (0, deleteAll_js_1.default)(client),
        shardsGetter: () => new shardsGetter_js_1.default(client),
        shardUpdater: () => new shardUpdater_js_1.default(client),
        shardsUpdater: () => new shardsUpdater_js_1.default(client),
        tenantsCreator: (className, tenants) => new tenantsCreator_js_1.default(client, className, tenants),
        tenantsGetter: (className) => new tenantsGetter_js_1.default(client, className),
        tenantsUpdater: (className, tenants) => new tenantsUpdater_js_1.default(client, className, tenants),
        tenantsDeleter: (className, tenants) => new tenantsDeleter_js_1.default(client, className, tenants),
        tenantsExists: (className, tenant) => new tenantsExists_js_1.default(client, className, tenant),
    };
};
exports.default = schema;
var classCreator_js_2 = require("./classCreator.js");
Object.defineProperty(exports, "ClassCreator", { enumerable: true, get: function () { return __importDefault(classCreator_js_2).default; } });
var classDeleter_js_2 = require("./classDeleter.js");
Object.defineProperty(exports, "ClassDeleter", { enumerable: true, get: function () { return __importDefault(classDeleter_js_2).default; } });
var classGetter_js_2 = require("./classGetter.js");
Object.defineProperty(exports, "ClassGetter", { enumerable: true, get: function () { return __importDefault(classGetter_js_2).default; } });
var getter_js_2 = require("./getter.js");
Object.defineProperty(exports, "SchemaGetter", { enumerable: true, get: function () { return __importDefault(getter_js_2).default; } });
var propertyCreator_js_2 = require("./propertyCreator.js");
Object.defineProperty(exports, "PropertyCreator", { enumerable: true, get: function () { return __importDefault(propertyCreator_js_2).default; } });
var shardUpdater_js_2 = require("./shardUpdater.js");
Object.defineProperty(exports, "ShardUpdater", { enumerable: true, get: function () { return __importDefault(shardUpdater_js_2).default; } });
var shardsUpdater_js_2 = require("./shardsUpdater.js");
Object.defineProperty(exports, "ShardsUpdater", { enumerable: true, get: function () { return __importDefault(shardsUpdater_js_2).default; } });
var tenantsCreator_js_2 = require("./tenantsCreator.js");
Object.defineProperty(exports, "TenantsCreator", { enumerable: true, get: function () { return __importDefault(tenantsCreator_js_2).default; } });
var tenantsDeleter_js_2 = require("./tenantsDeleter.js");
Object.defineProperty(exports, "TenantsDeleter", { enumerable: true, get: function () { return __importDefault(tenantsDeleter_js_2).default; } });
var tenantsExists_js_2 = require("./tenantsExists.js");
Object.defineProperty(exports, "TenantsExists", { enumerable: true, get: function () { return __importDefault(tenantsExists_js_2).default; } });
var tenantsGetter_js_2 = require("./tenantsGetter.js");
Object.defineProperty(exports, "TenantsGetter", { enumerable: true, get: function () { return __importDefault(tenantsGetter_js_2).default; } });
var tenantsUpdater_js_2 = require("./tenantsUpdater.js");
Object.defineProperty(exports, "TenantsUpdater", { enumerable: true, get: function () { return __importDefault(tenantsUpdater_js_2).default; } });
