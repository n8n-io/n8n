"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
const WorldGeodeticSystem1984 = "EPSG:4326"; // See https://epsg.io/4326
/**
 * Represents a geographic point in global coordinates.
 */
class GeographyPoint {
    /**
     * The latitude in decimal.
     */
    latitude;
    /**
     * The longitude in decimal.
     */
    longitude;
    /**
     * Constructs a new instance of GeographyPoint given
     * the specified coordinates.
     * @param geographyPoint - object with longitude and latitude values in decimal
     */
    constructor(geographyPoint) {
        this.longitude = geographyPoint.longitude;
        this.latitude = geographyPoint.latitude;
    }
    /**
     * Used to serialize to a GeoJSON Point.
     */
    toJSON() {
        return {
            type: "Point",
            coordinates: [this.longitude, this.latitude],
            crs: { type: "name", properties: { name: WorldGeodeticSystem1984 } },
        };
    }
}
exports.default = GeographyPoint;
//# sourceMappingURL=geographyPoint.js.map