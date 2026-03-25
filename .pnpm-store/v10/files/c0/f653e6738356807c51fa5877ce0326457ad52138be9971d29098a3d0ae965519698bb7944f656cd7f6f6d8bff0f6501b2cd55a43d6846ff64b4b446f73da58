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

import "google/api/annotations.proto";
import "google/api/apikeys/v2/resources.proto";
import "google/api/client.proto";
import "google/api/field_behavior.proto";
import "google/api/resource.proto";
import "google/longrunning/operations.proto";
import "google/protobuf/empty.proto";
import "google/protobuf/field_mask.proto";

option csharp_namespace = "Google.Cloud.ApiKeys.V2";
option go_package = "cloud.google.com/go/apikeys/apiv2/apikeyspb;apikeyspb";
option java_multiple_files = true;
option java_outer_classname = "ApiKeysProto";
option java_package = "com.google.api.apikeys.v2";
option php_namespace = "Google\\Cloud\\ApiKeys\\V2";
option ruby_package = "Google::Cloud::ApiKeys::V2";

// Manages the API keys associated with projects.
service ApiKeys {
  option (google.api.default_host) = "apikeys.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform,"
      "https://www.googleapis.com/auth/cloud-platform.read-only";

  // Creates a new API key.
  //
  // NOTE: Key is a global resource; hence the only supported value for
  // location is `global`.
  rpc CreateKey(CreateKeyRequest) returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v2/{parent=projects/*/locations/*}/keys"
      body: "key"
    };
    option (google.api.method_signature) = "parent,key,key_id";
    option (google.longrunning.operation_info) = {
      response_type: "Key"
      metadata_type: "google.protobuf.Empty"
    };
  }

  // Lists the API keys owned by a project. The key string of the API key
  // isn't included in the response.
  //
  // NOTE: Key is a global resource; hence the only supported value for
  // location is `global`.
  rpc ListKeys(ListKeysRequest) returns (ListKeysResponse) {
    option (google.api.http) = {
      get: "/v2/{parent=projects/*/locations/*}/keys"
    };
    option (google.api.method_signature) = "parent";
  }

  // Gets the metadata for an API key. The key string of the API key
  // isn't included in the response.
  //
  // NOTE: Key is a global resource; hence the only supported value for
  // location is `global`.
  rpc GetKey(GetKeyRequest) returns (Key) {
    option (google.api.http) = {
      get: "/v2/{name=projects/*/locations/*/keys/*}"
    };
    option (google.api.method_signature) = "name";
  }

  // Get the key string for an API key.
  //
  // NOTE: Key is a global resource; hence the only supported value for
  // location is `global`.
  rpc GetKeyString(GetKeyStringRequest) returns (GetKeyStringResponse) {
    option (google.api.http) = {
      get: "/v2/{name=projects/*/locations/*/keys/*}/keyString"
    };
    option (google.api.method_signature) = "name";
  }

  // Patches the modifiable fields of an API key.
  // The key string of the API key isn't included in the response.
  //
  // NOTE: Key is a global resource; hence the only supported value for
  // location is `global`.
  rpc UpdateKey(UpdateKeyRequest) returns (google.longrunning.Operation) {
    option (google.api.http) = {
      patch: "/v2/{key.name=projects/*/locations/*/keys/*}"
      body: "key"
    };
    option (google.api.method_signature) = "key,update_mask";
    option (google.longrunning.operation_info) = {
      response_type: "Key"
      metadata_type: "google.protobuf.Empty"
    };
  }

  // Deletes an API key. Deleted key can be retrieved within 30 days of
  // deletion. Afterward, key will be purged from the project.
  //
  // NOTE: Key is a global resource; hence the only supported value for
  // location is `global`.
  rpc DeleteKey(DeleteKeyRequest) returns (google.longrunning.Operation) {
    option (google.api.http) = {
      delete: "/v2/{name=projects/*/locations/*/keys/*}"
    };
    option (google.api.method_signature) = "name";
    option (google.longrunning.operation_info) = {
      response_type: "Key"
      metadata_type: "google.protobuf.Empty"
    };
  }

  // Undeletes an API key which was deleted within 30 days.
  //
  // NOTE: Key is a global resource; hence the only supported value for
  // location is `global`.
  rpc UndeleteKey(UndeleteKeyRequest) returns (google.longrunning.Operation) {
    option (google.api.http) = {
      post: "/v2/{name=projects/*/locations/*/keys/*}:undelete"
      body: "*"
    };
    option (google.longrunning.operation_info) = {
      response_type: "Key"
      metadata_type: "google.protobuf.Empty"
    };
  }

  // Find the parent project and resource name of the API
  // key that matches the key string in the request. If the API key has been
  // purged, resource name will not be set.
  // The service account must have the `apikeys.keys.lookup` permission
  // on the parent project.
  rpc LookupKey(LookupKeyRequest) returns (LookupKeyResponse) {
    option (google.api.http) = {
      get: "/v2/keys:lookupKey"
    };
  }
}

// Request message for `CreateKey` method.
message CreateKeyRequest {
  // Required. The project in which the API key is created.
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "apikeys.googleapis.com/Key"
    }
  ];

  // Required. The API key fields to set at creation time.
  // You can configure only the `display_name`, `restrictions`, and
  // `annotations` fields.
  Key key = 2 [(google.api.field_behavior) = REQUIRED];

  // User specified key id (optional). If specified, it will become the final
  // component of the key resource name.
  //
  // The id must be unique within the project, must conform with RFC-1034,
  // is restricted to lower-cased letters, and has a maximum length of 63
  // characters. In another word, the id must match the regular
  // expression: `[a-z]([a-z0-9-]{0,61}[a-z0-9])?`.
  //
  // The id must NOT be a UUID-like string.
  string key_id = 3;
}

// Request message for `ListKeys` method.
message ListKeysRequest {
  // Required. Lists all API keys associated with this project.
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "apikeys.googleapis.com/Key"
    }
  ];

  // Optional. Specifies the maximum number of results to be returned at a time.
  int32 page_size = 2 [(google.api.field_behavior) = OPTIONAL];

  // Optional. Requests a specific page of results.
  string page_token = 3 [(google.api.field_behavior) = OPTIONAL];

  // Optional. Indicate that keys deleted in the past 30 days should also be
  // returned.
  bool show_deleted = 6 [(google.api.field_behavior) = OPTIONAL];
}

// Response message for `ListKeys` method.
message ListKeysResponse {
  // A list of API keys.
  repeated Key keys = 1;

  // The pagination token for the next page of results.
  string next_page_token = 2;
}

// Request message for `GetKey` method.
message GetKeyRequest {
  // Required. The resource name of the API key to get.
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = { type: "apikeys.googleapis.com/Key" }
  ];
}

// Request message for `GetKeyString` method.
message GetKeyStringRequest {
  // Required. The resource name of the API key to be retrieved.
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = { type: "apikeys.googleapis.com/Key" }
  ];
}

// Response message for `GetKeyString` method.
message GetKeyStringResponse {
  // An encrypted and signed value of the key.
  string key_string = 1;
}

// Request message for `UpdateKey` method.
message UpdateKeyRequest {
  // Required. Set the `name` field to the resource name of the API key to be
  // updated. You can update only the `display_name`, `restrictions`, and
  // `annotations` fields.
  Key key = 1 [(google.api.field_behavior) = REQUIRED];

  // The field mask specifies which fields to be updated as part of this
  // request. All other fields are ignored.
  // Mutable fields are: `display_name`, `restrictions`, and `annotations`.
  // If an update mask is not provided, the service treats it as an implied mask
  // equivalent to all allowed fields that are set on the wire. If the field
  // mask has a special value "*", the service treats it equivalent to replace
  // all allowed mutable fields.
  google.protobuf.FieldMask update_mask = 2;
}

// Request message for `DeleteKey` method.
message DeleteKeyRequest {
  // Required. The resource name of the API key to be deleted.
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = { type: "apikeys.googleapis.com/Key" }
  ];

  // Optional. The etag known to the client for the expected state of the key.
  // This is to be used for optimistic concurrency.
  string etag = 2 [(google.api.field_behavior) = OPTIONAL];
}

// Request message for `UndeleteKey` method.
message UndeleteKeyRequest {
  // Required. The resource name of the API key to be undeleted.
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = { type: "apikeys.googleapis.com/Key" }
  ];
}

// Request message for `LookupKey` method.
message LookupKeyRequest {
  // Required. Finds the project that owns the key string value.
  string key_string = 1 [(google.api.field_behavior) = REQUIRED];
}

// Response message for `LookupKey` method.
message LookupKeyResponse {
  // The project that owns the key with the value specified in the request.
  string parent = 1;

  // The resource name of the API key. If the API key has been purged,
  // resource name is empty.
  string name = 2;
}
