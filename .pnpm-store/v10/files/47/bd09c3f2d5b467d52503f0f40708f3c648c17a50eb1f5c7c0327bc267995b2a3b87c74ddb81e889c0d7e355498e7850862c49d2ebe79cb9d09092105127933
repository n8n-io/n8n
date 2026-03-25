"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerQueryBuilders = void 0;
const DeleteQueryBuilder_1 = require("./DeleteQueryBuilder");
const InsertQueryBuilder_1 = require("./InsertQueryBuilder");
const QueryBuilder_1 = require("./QueryBuilder");
const RelationQueryBuilder_1 = require("./RelationQueryBuilder");
const SelectQueryBuilder_1 = require("./SelectQueryBuilder");
const SoftDeleteQueryBuilder_1 = require("./SoftDeleteQueryBuilder");
const UpdateQueryBuilder_1 = require("./UpdateQueryBuilder");
function registerQueryBuilders() {
    QueryBuilder_1.QueryBuilder.registerQueryBuilderClass("DeleteQueryBuilder", (qb) => new DeleteQueryBuilder_1.DeleteQueryBuilder(qb));
    QueryBuilder_1.QueryBuilder.registerQueryBuilderClass("InsertQueryBuilder", (qb) => new InsertQueryBuilder_1.InsertQueryBuilder(qb));
    QueryBuilder_1.QueryBuilder.registerQueryBuilderClass("RelationQueryBuilder", (qb) => new RelationQueryBuilder_1.RelationQueryBuilder(qb));
    QueryBuilder_1.QueryBuilder.registerQueryBuilderClass("SelectQueryBuilder", (qb) => new SelectQueryBuilder_1.SelectQueryBuilder(qb));
    QueryBuilder_1.QueryBuilder.registerQueryBuilderClass("SoftDeleteQueryBuilder", (qb) => new SoftDeleteQueryBuilder_1.SoftDeleteQueryBuilder(qb));
    QueryBuilder_1.QueryBuilder.registerQueryBuilderClass("UpdateQueryBuilder", (qb) => new UpdateQueryBuilder_1.UpdateQueryBuilder(qb));
}
exports.registerQueryBuilders = registerQueryBuilders;

//# sourceMappingURL=index.js.map
