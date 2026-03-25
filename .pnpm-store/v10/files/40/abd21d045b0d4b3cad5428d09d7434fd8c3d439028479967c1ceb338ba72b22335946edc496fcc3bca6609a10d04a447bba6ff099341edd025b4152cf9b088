// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const WorldGeodeticSystem1984 = "EPSG:4326"; // See https://epsg.io/4326
/**
 * Represents a geographic point in global coordinates.
 */
export default class GeographyPoint {
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
//# sourceMappingURL=geographyPoint.js.map