"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableColumn = void 0;
/**
 * Table's columns in the database represented in this class.
 */
class TableColumn {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(options) {
        this["@instanceof"] = Symbol.for("TableColumn");
        /**
         * Indicates if column is NULL, or is NOT NULL in the database.
         */
        this.isNullable = false;
        /**
         * Indicates if column is auto-generated sequence.
         */
        this.isGenerated = false;
        /**
         * Indicates if column is a primary key.
         */
        this.isPrimary = false;
        /**
         * Indicates if column has unique value.
         */
        this.isUnique = false;
        /**
         * Indicates if column stores array.
         */
        this.isArray = false;
        /**
         * Column type's length. Used only on some column types.
         * For example type = "string" and length = "100" means that ORM will create a column with type varchar(100).
         */
        this.length = "";
        /**
         * Puts ZEROFILL attribute on to numeric column. Works only for MySQL.
         * If you specify ZEROFILL for a numeric column, MySQL automatically adds the UNSIGNED attribute to the column
         */
        this.zerofill = false;
        /**
         * Puts UNSIGNED attribute on to numeric column. Works only for MySQL.
         */
        this.unsigned = false;
        if (options) {
            this.name = options.name;
            this.type = options.type || "";
            this.length = options.length || "";
            this.width = options.width;
            this.charset = options.charset;
            this.collation = options.collation;
            this.precision = options.precision;
            this.scale = options.scale;
            this.zerofill = options.zerofill || false;
            this.unsigned = this.zerofill ? true : options.unsigned || false;
            this.default = options.default;
            this.onUpdate = options.onUpdate;
            this.isNullable = options.isNullable || false;
            this.isGenerated = options.isGenerated || false;
            this.generationStrategy = options.generationStrategy;
            this.generatedIdentity = options.generatedIdentity;
            this.isPrimary = options.isPrimary || false;
            this.isUnique = options.isUnique || false;
            this.isArray = options.isArray || false;
            this.comment = options.comment;
            this.enum = options.enum;
            this.enumName = options.enumName;
            this.primaryKeyConstraintName = options.primaryKeyConstraintName;
            this.asExpression = options.asExpression;
            this.generatedType = options.generatedType;
            this.spatialFeatureType = options.spatialFeatureType;
            this.srid = options.srid;
        }
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Clones this column to a new column with exact same properties as this column has.
     */
    clone() {
        return new TableColumn({
            name: this.name,
            type: this.type,
            length: this.length,
            width: this.width,
            charset: this.charset,
            collation: this.collation,
            precision: this.precision,
            scale: this.scale,
            zerofill: this.zerofill,
            unsigned: this.unsigned,
            enum: this.enum,
            enumName: this.enumName,
            primaryKeyConstraintName: this.primaryKeyConstraintName,
            asExpression: this.asExpression,
            generatedType: this.generatedType,
            default: this.default,
            onUpdate: this.onUpdate,
            isNullable: this.isNullable,
            isGenerated: this.isGenerated,
            generationStrategy: this.generationStrategy,
            generatedIdentity: this.generatedIdentity,
            isPrimary: this.isPrimary,
            isUnique: this.isUnique,
            isArray: this.isArray,
            comment: this.comment,
            spatialFeatureType: this.spatialFeatureType,
            srid: this.srid,
        });
    }
}
exports.TableColumn = TableColumn;

//# sourceMappingURL=TableColumn.js.map
