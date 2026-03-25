"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverFactory = void 0;
const MissingDriverError_1 = require("../error/MissingDriverError");
const getDriver = async (type) => {
    switch (type) {
        case "mysql":
        case "mariadb":
            return (await Promise.resolve().then(() => __importStar(require("./mysql/MysqlDriver")))).MysqlDriver;
        case "postgres":
            return (await Promise.resolve().then(() => __importStar(require("./postgres/PostgresDriver")))).PostgresDriver;
        case "sqlite":
            return (await Promise.resolve().then(() => __importStar(require("./sqlite/SqliteDriver")))).SqliteDriver;
        case "sqlite-pooled":
            return (await Promise.resolve().then(() => __importStar(require("./sqlite-pooled/SqliteReadWriteDriver"))))
                .SqliteReadWriteDriver;
        default:
            throw new MissingDriverError_1.MissingDriverError(type, [
                "mariadb",
                "mysql",
                "postgres",
                "sqlite",
                "sqlite-pooled",
            ]);
    }
};
/**
 * Helps to create drivers.
 */
class DriverFactory {
    /**
     * Creates a new driver depend on a given connection's driver type.
     */
    static async create(connection) {
        const { type } = connection.options;
        return new (await getDriver(type))(connection);
    }
}
exports.DriverFactory = DriverFactory;

//# sourceMappingURL=DriverFactory.js.map
