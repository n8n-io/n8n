type TimeZoneName = string;

interface RawTimeZone {
  name: TimeZoneName;
  alternativeName: string;
  group: string[];
  continentCode: string;
  continentName: string;
  countryName: string;
  countryCode: string;
  mainCities: string[];
  rawOffsetInMinutes: number;
  abbreviation: string;
  rawFormat: string;
}

interface TimeZone extends RawTimeZone {
  currentTimeOffsetInMinutes: number;
  currentTimeFormat: string;
}

interface TimeZoneOptions {
  includeUtc?: boolean;
}

export const rawTimeZones: RawTimeZone[];
export const timeZonesNames: TimeZoneName[];
export function getTimeZones(opts?: TimeZoneOptions): TimeZone[];
