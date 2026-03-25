// Copyright 2023 Google LLC
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

package google.api.apikeys.v2;

import "google/api/field_behavior.proto";
import "google/api/resource.proto";
import "google/protobuf/timestamp.proto";

option csharp_namespace = "Google.Cloud.ApiKeys.V2";
option go_package = "cloud.google.com/go/apikeys/apiv2/apikeyspb;apikeyspb";
option java_multiple_files = true;
option java_outer_classname = "ResourcesProto";
option java_package = "com.google.api.apikeys.v2";
option php_namespace = "Google\\Cloud\\ApiKeys\\V2";
option ruby_package = "Google::Cloud::ApiKeys::V2";

// The representation of a key managed by the API Keys API.
message Key {
  option (google.api.resource) = {
    type: "apikeys.googleapis.com/Key"
    pattern: "projects/{project}/locations/{location}/keys/{key}"
    plural: "keys"
    singular: "key"
    style: DECLARATIVE_FRIENDLY
  };

  // Output only. The resource name of the key.
  // The `name` has the form:
  // `projects/<PROJECT_NUMBER>/locations/global/keys/<KEY_ID>`.
  // For example:
  // `projects/123456867718/locations/global/keys/b7ff1f9f-8275-410a-94dd-3855ee9b5dd2`
  //
  // NOTE: Key is a global resource; hence the only supported value for
  // location is `global`.
  string name = 1 [(google.api.field_behavior) = OUTPUT_ONLY];

  // Output only. Unique id in UUID4 format.
  string uid = 5 [(google.api.field_behavior) = OUTPUT_ONLY];

  // Human-readable display name of this key that you can modify.
  // The maximum length is 63 characters.
  string display_name = 2;

  // Output only. An encrypted and signed value held by this key.
  // This field can be accessed only through the `GetKeyString` method.
  string key_string = 3 [(google.api.field_behavior) = OUTPUT_ONLY];

  // Output only. A timestamp identifying the time this key was originally
  // created.
  google.protobuf.Timestamp create_time = 4
      [(google.api.field_behavior) = OUTPUT_ONLY];

  // Output only. A timestamp identifying the time this key was last
  // updated.
  google.protobuf.Timestamp update_time = 6
      [(google.api.field_behavior) = OUTPUT_ONLY];

  // Output only. A timestamp when this key was deleted. If the resource is not
  // deleted, this must be empty.
  google.protobuf.Timestamp delete_time = 7
      [(google.api.field_behavior) = OUTPUT_ONLY];

  // Annotations is an unstructured key-value map stored with a policy that
  // may be set by external tools to store and retrieve arbitrary metadata.
  // They are not queryable and should be preserved when modifying objects.
  map<string, string> annotations = 8;

  // Key restrictions.
  Restrictions restrictions = 9;

  // Output only. A checksum computed by the server based on the current value
  // of the Key resource. This may be sent on update and delete requests to
  // ensure the client has an up-to-date value before proceeding. See
  // https://google.aip.dev/154.
  string etag = 11 [(google.api.field_behavior) = OUTPUT_ONLY];
}

// Describes the restrictions on the key.
message Restrictions {
  // The websites, IP addresses, Android apps, or iOS apps (the clients) that
  // are allowed to use the key. You can specify only one type of client
  // restrictions per key.
  oneof client_restrictions {
    // The HTTP referrers (websites) that are allowed to use the key.
    BrowserKeyRestrictions browser_key_restrictions = 1;

    // The IP addresses of callers that are allowed to use the key.
    ServerKeyRestrictions server_key_restrictions = 2;

    // The Android apps that are allowed to use the key.
    AndroidKeyRestrictions android_key_restrictions = 3;

    // The iOS apps that are allowed to use the key.
    IosKeyRestrictions ios_key_restrictions = 4;
  }

  // A restriction for a specific service and optionally one or
  // more specific methods. Requests are allowed if they
  // match any of these restrictions. If no restrictions are
  // specified, all targets are allowed.
  repeated ApiTarget api_targets = 5;
}

// The HTTP referrers (websites) that are allowed to use the key.
message BrowserKeyRestrictions {
  // A list of regular expressions for the referrer URLs that are allowed
  // to make API calls with this key.
  repeated string allowed_referrers = 1;
}

// The IP addresses of callers that are allowed to use the key.
message ServerKeyRestrictions {
  // A list of the caller IP addresses that are allowed to make API calls
  // with this key.
  repeated string allowed_ips = 1;
}

// The Android apps that are allowed to use the key.
message AndroidKeyRestrictions {
  // A list of Android applications that are allowed to make API calls with
  // this key.
  repeated AndroidApplication allowed_applications = 1;
}

// Identifier of an Android application for key use.
message AndroidApplication {
  // The SHA1 fingerprint of the application. For example, both sha1 formats are
  // acceptable : DA:39:A3:EE:5E:6B:4B:0D:32:55:BF:EF:95:60:18:90:AF:D8:07:09 or
  // DA39A3EE5E6B4B0D3255BFEF95601890AFD80709.
  // Output format is the latter.
  string sha1_fingerprint = 1;

  // The package name of the application.
  string package_name = 2;
}

// The iOS apps that are allowed to use the key.
message IosKeyRestrictions {
  // A list of bundle IDs that are allowed when making API calls with this key.
  repeated string allowed_bundle_ids = 1;
}

// A restriction for a specific service and optionally one or multiple
// specific methods. Both fields are case insensitive.
message ApiTarget {
  // The service for this restriction. It should be the canonical
  // service name, for example: `translate.googleapis.com`.
  // You can use [`gcloud services list`](/sdk/gcloud/reference/services/list)
  // to get a list of services that are enabled in the project.
  string service = 1;

  // Optional. List of one or more methods that can be called.
  // If empty, all methods for the service are allowed. A wildcard
  // (*) can be used as the last symbol.
  // Valid examples:
  //   `google.cloud.translate.v2.TranslateService.GetSupportedLanguage`
  //   `TranslateText`
  //   `Get*`
  //   `translate.googleapis.com.Get*`
  repeated string methods = 2 [(google.api.field_behavior) = OPTIONAL];
}
