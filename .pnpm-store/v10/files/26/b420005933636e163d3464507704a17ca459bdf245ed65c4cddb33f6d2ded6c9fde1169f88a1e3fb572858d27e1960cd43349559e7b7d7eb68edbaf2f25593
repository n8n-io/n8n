import moment = require('moment');
import { MomentTimezone } from "./index";

declare module 'moment' {

    /** Parsed / unpacked zone data. */
    interface UnpackedZone {
        /** The uniquely identifying name of the time zone. */
        name: string;
        /** zone abbreviations */
        abbrs: Array<string>;
        /** (measured in milliseconds) */
        untils: Array<number | null>;
        /** (measured in minutes) */
        offsets: Array<number>;
    }

    /** Bundle of zone data and links for multiple timezones */
    interface PackedZoneBundle {
        version: string;
        zones: Array<string>;
        links: Array<string>;
    }

    /** Bundle of zone data and links for multiple timezones */
    interface UnpackedZoneBundle {
        version: string;
        zones: Array<UnpackedZone>;
        links: Array<string>;
    }
    
    /** extends MomentTimezone declared in index */
    interface MomentTimezone {
        /** Converts zone data in the unpacked format to the packed format. */
        pack(unpackedObject: UnpackedZone): string;

        /** Convert a base 10 number to a base 60 string. */
        packBase60(input: number, precision?: number): string;

        /** Create links out of two zones that share data.
         * @returns A new ZoneBundle with duplicate zone data replaced by links
         */
        createLinks(unlinked: UnpackedZoneBundle): PackedZoneBundle;

        /**
         * Filter out data for years outside a certain range.
         * @return a new, filtered UnPackedZone object
         */
        filterYears(unpackedZone: UnpackedZone, startYear: number, endYear: number): UnpackedZone;
        /**
         * Filter out data for years outside a certain range.
         * @return a new, filtered UnPackedZone object
         */
        filterYears(unpackedZone: UnpackedZone, startAndEndYear: number): UnpackedZone;

        /**
         * Combines packing, link creation, and subsetting of years into one simple interface.
         * Pass in an unpacked bundle, start year, and end year and get a filtered, linked, packed bundle back.
         */
        filterLinkPack(unpackedBundle: UnpackedZoneBundle, startYear: number, endYear: number): PackedZoneBundle;
        /**
         * Combines packing, link creation, and subsetting of years into one simple interface.
         * Pass in an unpacked bundle, start year, and end year and get a filtered, linked, packed bundle back.
         */
        filterLinkPack(unpackedBundle: UnpackedZoneBundle, startAndEndYear: number): PackedZoneBundle;
    }
}

// require("moment-timezone") === require("moment")
export = moment;
