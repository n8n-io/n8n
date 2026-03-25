// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

syntax = "proto3";

package google.type;

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/type/postaladdress;postaladdress";
option java_multiple_files = true;
option java_outer_classname = "PostalAddressProto";
option java_package = "com.google.type";
option objc_class_prefix = "GTP";

// Represents a postal address, e.g. for postal delivery or payments addresses.
// Given a postal address, a postal service can deliver items to a premise, P.O.
// Box or similar.
// It is not intended to model geographical locations (roads, towns,
// mountains).
//
// In typical usage an address would be created via user input or from importing
// existing data, depending on the type of process.
//
// Advice on address input / editing:
//  - Use an i18n-ready address widget such as
//    https://github.com/google/libaddressinput)
// - Users should not be presented with UI elements for input or editing of
//   fields outside countries where that field is used.
//
// For more guidance on how to use this schema, please see:
// https://support.google.com/business/answer/6397478
message PostalAddress {
  // The schema revision of the `PostalAddress`. This must be set to 0, which is
  // the latest revision.
  //
  // All new revisions **must** be backward compatible with old revisions.
  int32 revision = 1;

  // Required. CLDR region code of the country/region of the address. This
  // is never inferred and it is up to the user to ensure the value is
  // correct. See http://cldr.unicode.org/ and
  // http://www.unicode.org/cldr/charts/30/supplemental/territory_information.html
  // for details. Example: "CH" for Switzerland.
  string region_code = 2;

  // Optional. BCP-47 language code of the contents of this address (if
  // known). This is often the UI language of the input form or is expected
  // to match one of the languages used in the address' country/region, or their
  // transliterated equivalents.
  // This can affect formatting in certain countries, but is not critical
  // to the correctness of the data and will never affect any validation or
  // other non-formatting related operations.
  //
  // If this value is not known, it should be omitted (rather than specifying a
  // possibly incorrect default).
  //
  // Examples: "zh-Hant", "ja", "ja-Latn", "en".
  string language_code = 3;

  // Optional. Postal code of the address. Not all countries use or require
  // postal codes to be present, but where they are used, they may trigger
  // additional validation with other parts of the address (e.g. state/zip
  // validation in the U.S.A.).
  string postal_code = 4;

  // Optional. Additional, country-specific, sorting code. This is not used
  // in most regions. Where it is used, the value is either a string like
  // "CEDEX", optionally followed by a number (e.g. "CEDEX 7"), or just a number
  // alone, representing the "sector code" (Jamaica), "delivery area indicator"
  // (Malawi) or "post office indicator" (e.g. Côte d'Ivoire).
  string sorting_code = 5;

  // Optional. Highest administrative subdivision which is used for postal
  // addresses of a country or region.
  // For example, this can be a state, a province, an oblast, or a prefecture.
  // Specifically, for Spain this is the province and not the autonomous
  // community (e.g. "Barcelona" and not "Catalonia").
  // Many countries don't use an administrative area in postal addresses. E.g.
  // in Switzerland this should be left unpopulated.
  string administrative_area = 6;

  // Optional. Generally refers to the city/town portion of the address.
  // Examples: US city, IT comune, UK post town.
  // In regions of the world where localities are not well defined or do not fit
  // into this structure well, leave locality empty and use address_lines.
  string locality = 7;

  // Optional. Sublocality of the address.
  // For example, this can be neighborhoods, boroughs, districts.
  string sublocality = 8;

  // Unstructured address lines describing the lower levels of an address.
  //
  // Because values in address_lines do not have type information and may
  // sometimes contain multiple values in a single field (e.g.
  // "Austin, TX"), it is important that the line order is clear. The order of
  // address lines should be "envelope order" for the country/region of the
  // address. In places where this can vary (e.g. Japan), address_language is
  // used to make it explicit (e.g. "ja" for large-to-small ordering and
  // "ja-Latn" or "en" for small-to-large). This way, the most specific line of
  // an address can be selected based on the language.
  //
  // The minimum permitted structural representation of an address consists
  // of a region_code with all remaining information placed in the
  // address_lines. It would be possible to format such an address very
  // approximately without geocoding, but no semantic reasoning could be
  // made about any of the address components until it was at least
  // partially resolved.
  //
  // Creating an address only containing a region_code and address_lines, and
  // then geocoding is the recommended way to handle completely unstructured
  // addresses (as opposed to guessing which parts of the address should be
  // localities or administrative areas).
  repeated string address_lines = 9;

  // Optional. The recipient at the address.
  // This field may, under certain circumstances, contain multiline information.
  // For example, it might contain "care of" information.
  repeated string recipients = 10;

  // Optional. The name of the organization at the address.
  string organization = 11;
}
