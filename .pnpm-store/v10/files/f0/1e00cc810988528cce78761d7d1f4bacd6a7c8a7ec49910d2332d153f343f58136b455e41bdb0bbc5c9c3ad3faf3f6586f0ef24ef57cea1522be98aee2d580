/**
 * Point geometry object.
 * https://tools.ietf.org/html/rfc7946#section-3.1.2
 */
export type Point = {
    type: "Point";
    coordinates: number[];
};
/**
 * LineString geometry object.
 * https://tools.ietf.org/html/rfc7946#section-3.1.4
 */
export type LineString = {
    type: "LineString";
    coordinates: number[][];
};
/**
 * Polygon geometry object.
 * https://tools.ietf.org/html/rfc7946#section-3.1.6
 */
export type Polygon = {
    type: "Polygon";
    coordinates: number[][][];
};
/**
 * MultiPoint geometry object.
 *  https://tools.ietf.org/html/rfc7946#section-3.1.3
 */
export type MultiPoint = {
    type: "MultiPoint";
    coordinates: number[][];
};
/**
 * MultiLineString geometry object.
 * https://tools.ietf.org/html/rfc7946#section-3.1.5
 */
export type MultiLineString = {
    type: "MultiLineString";
    coordinates: number[][][];
};
/**
 * MultiPolygon geometry object.
 * https://tools.ietf.org/html/rfc7946#section-3.1.7
 */
export type MultiPolygon = {
    type: "MultiPolygon";
    coordinates: number[][][][];
};
/**
 * Geometry Collection
 * https://tools.ietf.org/html/rfc7946#section-3.1.8
 */
export type GeometryCollection = {
    type: "GeometryCollection";
    geometries: (Point | LineString | Polygon | MultiPoint | MultiLineString | MultiPolygon)[];
};
/**
 * Union of Geometry objects.
 */
export type Geometry = Point | LineString | Polygon | MultiPoint | MultiLineString | MultiPolygon | GeometryCollection;
export type Geography = Geometry;
/**
 * A feature object which contains a geometry and associated properties.
 * https://tools.ietf.org/html/rfc7946#section-3.2
 */
export type Feature = {
    type: "Feature";
    geometry: Geometry;
    id?: string | number;
    bbox?: number[];
    properties: {
        [name: string]: any;
    } | null;
};
/**
 * A collection of feature objects.
 *  https://tools.ietf.org/html/rfc7946#section-3.3
 */
export type FeatureCollection = {
    type: "FeatureCollection";
    bbox?: number[];
    features: Feature[];
};
/**
 * Union of GeoJSON objects.
 */
export type GeoJSON = Geometry | Feature | FeatureCollection;
