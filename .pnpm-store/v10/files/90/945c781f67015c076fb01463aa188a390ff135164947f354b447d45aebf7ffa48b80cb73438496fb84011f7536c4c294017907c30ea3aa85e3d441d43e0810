"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableUtils = void 0;
class TableUtils {
    static createTableColumnOptions(columnMetadata, driver) {
        return {
            name: columnMetadata.databaseName,
            length: driver.getColumnLength(columnMetadata),
            width: columnMetadata.width,
            charset: columnMetadata.charset,
            collation: columnMetadata.collation,
            precision: columnMetadata.precision,
            scale: columnMetadata.scale,
            zerofill: columnMetadata.zerofill,
            unsigned: columnMetadata.unsigned,
            asExpression: columnMetadata.asExpression,
            generatedType: columnMetadata.generatedType,
            default: driver.normalizeDefault(columnMetadata),
            onUpdate: columnMetadata.onUpdate,
            comment: columnMetadata.comment,
            isGenerated: columnMetadata.isGenerated,
            generationStrategy: columnMetadata.generationStrategy,
            generatedIdentity: columnMetadata.generatedIdentity,
            isNullable: columnMetadata.isNullable,
            type: driver.normalizeType(columnMetadata),
            isPrimary: columnMetadata.isPrimary,
            isUnique: driver.normalizeIsUnique(columnMetadata),
            isArray: columnMetadata.isArray || false,
            enum: columnMetadata.enum
                ? columnMetadata.enum.map((val) => val + "")
                : columnMetadata.enum,
            enumName: columnMetadata.enumName,
            primaryKeyConstraintName: columnMetadata.primaryKeyConstraintName,
            spatialFeatureType: columnMetadata.spatialFeatureType,
            srid: columnMetadata.srid,
        };
    }
}
exports.TableUtils = TableUtils;

//# sourceMappingURL=TableUtils.js.map
