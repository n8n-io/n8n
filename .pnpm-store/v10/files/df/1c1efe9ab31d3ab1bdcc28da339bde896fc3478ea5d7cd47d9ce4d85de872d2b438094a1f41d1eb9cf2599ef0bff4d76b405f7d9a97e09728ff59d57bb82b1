"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstanceChecker = void 0;
class InstanceChecker {
    static isEntityMetadata(obj) {
        return this.check(obj, "EntityMetadata");
    }
    static isColumnMetadata(obj) {
        return this.check(obj, "ColumnMetadata");
    }
    static isSelectQueryBuilder(obj) {
        return this.check(obj, "SelectQueryBuilder");
    }
    static isInsertQueryBuilder(obj) {
        return this.check(obj, "InsertQueryBuilder");
    }
    static isDeleteQueryBuilder(obj) {
        return this.check(obj, "DeleteQueryBuilder");
    }
    static isUpdateQueryBuilder(obj) {
        return this.check(obj, "UpdateQueryBuilder");
    }
    static isSoftDeleteQueryBuilder(obj) {
        return this.check(obj, "SoftDeleteQueryBuilder");
    }
    static isRelationQueryBuilder(obj) {
        return this.check(obj, "RelationQueryBuilder");
    }
    static isBrackets(obj) {
        return this.check(obj, "Brackets") || this.check(obj, "NotBrackets");
    }
    static isNotBrackets(obj) {
        return this.check(obj, "NotBrackets");
    }
    static isSubject(obj) {
        return this.check(obj, "Subject");
    }
    static isRdbmsSchemaBuilder(obj) {
        return this.check(obj, "RdbmsSchemaBuilder");
    }
    static isEntitySchema(obj) {
        return this.check(obj, "EntitySchema");
    }
    static isBaseEntityConstructor(obj) {
        return (typeof obj === "function" &&
            typeof obj.hasId === "function" &&
            typeof obj.save === "function" &&
            typeof obj.useDataSource === "function");
    }
    static isFindOperator(obj) {
        return (this.check(obj, "FindOperator") || this.check(obj, "EqualOperator"));
    }
    static isEqualOperator(obj) {
        return this.check(obj, "EqualOperator");
    }
    static isQuery(obj) {
        return this.check(obj, "Query");
    }
    static isTable(obj) {
        return this.check(obj, "Table");
    }
    static isTableCheck(obj) {
        return this.check(obj, "TableCheck");
    }
    static isTableColumn(obj) {
        return this.check(obj, "TableColumn");
    }
    static isTableExclusion(obj) {
        return this.check(obj, "TableExclusion");
    }
    static isTableForeignKey(obj) {
        return this.check(obj, "TableForeignKey");
    }
    static isTableIndex(obj) {
        return this.check(obj, "TableIndex");
    }
    static isTableUnique(obj) {
        return this.check(obj, "TableUnique");
    }
    static isView(obj) {
        return this.check(obj, "View");
    }
    static isDataSource(obj) {
        return this.check(obj, "DataSource");
    }
    static check(obj, name) {
        return (typeof obj === "object" &&
            obj !== null &&
            obj["@instanceof"] ===
                Symbol.for(name));
    }
}
exports.InstanceChecker = InstanceChecker;

//# sourceMappingURL=InstanceChecker.js.map
