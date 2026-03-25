import type { $SchemaRef, SchemaTraits } from "../schema/schema";
/**
 * @public
 */
export type StaticSchemaIdSimple = 0;
/**
 * @public
 */
export type StaticSchemaIdList = 1;
/**
 * @public
 */
export type StaticSchemaIdMap = 2;
/**
 * @public
 */
export type StaticSchemaIdStruct = 3;
/**
 * @public
 */
export type StaticSchemaIdError = -3;
/**
 * @public
 */
export type StaticSchemaIdOperation = 9;
/**
 * @public
 */
export type StaticSchema = StaticSimpleSchema | StaticListSchema | StaticMapSchema | StaticStructureSchema | StaticErrorSchema | StaticOperationSchema;
/**
 * @public
 */
export type ShapeName = string;
/**
 * @public
 */
export type ShapeNamespace = string;
/**
 * @public
 */
export type StaticSimpleSchema = [StaticSchemaIdSimple, ShapeNamespace, ShapeName, SchemaTraits, $SchemaRef];
/**
 * @public
 */
export type StaticListSchema = [StaticSchemaIdList, ShapeNamespace, ShapeName, SchemaTraits, $SchemaRef];
/**
 * @public
 */
export type StaticMapSchema = [StaticSchemaIdMap, ShapeNamespace, ShapeName, SchemaTraits, $SchemaRef, $SchemaRef];
/**
 * @public
 */
export type StaticStructureSchema = [
    StaticSchemaIdStruct,
    ShapeNamespace,
    ShapeName,
    SchemaTraits,
    string[],
    $SchemaRef[]
];
/**
 * @public
 */
export type StaticErrorSchema = [
    StaticSchemaIdError,
    ShapeNamespace,
    ShapeName,
    SchemaTraits,
    string[],
    $SchemaRef[]
];
/**
 * @public
 */
export type StaticOperationSchema = [
    StaticSchemaIdOperation,
    ShapeNamespace,
    ShapeName,
    SchemaTraits,
    $SchemaRef,
    $SchemaRef
];
