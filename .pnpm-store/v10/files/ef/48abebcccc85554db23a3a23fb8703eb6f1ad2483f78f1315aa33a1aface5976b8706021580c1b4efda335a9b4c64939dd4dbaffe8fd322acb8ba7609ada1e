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

package google.monitoring.v3;

import "google/api/annotations.proto";
import "google/api/client.proto";
import "google/api/field_behavior.proto";
import "google/api/monitored_resource.proto";
import "google/api/resource.proto";
import "google/monitoring/v3/common.proto";
import "google/monitoring/v3/group.proto";
import "google/protobuf/empty.proto";

option csharp_namespace = "Google.Cloud.Monitoring.V3";
option go_package = "cloud.google.com/go/monitoring/apiv3/v2/monitoringpb;monitoringpb";
option java_multiple_files = true;
option java_outer_classname = "GroupServiceProto";
option java_package = "com.google.monitoring.v3";
option php_namespace = "Google\\Cloud\\Monitoring\\V3";
option ruby_package = "Google::Cloud::Monitoring::V3";

// The Group API lets you inspect and manage your
// [groups](#google.monitoring.v3.Group).
//
// A group is a named filter that is used to identify
// a collection of monitored resources. Groups are typically used to
// mirror the physical and/or logical topology of the environment.
// Because group membership is computed dynamically, monitored
// resources that are started in the future are automatically placed
// in matching groups. By using a group to name monitored resources in,
// for example, an alert policy, the target of that alert policy is
// updated automatically as monitored resources are added and removed
// from the infrastructure.
service GroupService {
  option (google.api.default_host) = "monitoring.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform,"
      "https://www.googleapis.com/auth/monitoring,"
      "https://www.googleapis.com/auth/monitoring.read";

  // Lists the existing groups.
  rpc ListGroups(ListGroupsRequest) returns (ListGroupsResponse) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*}/groups"
    };
    option (google.api.method_signature) = "name";
  }

  // Gets a single group.
  rpc GetGroup(GetGroupRequest) returns (Group) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*/groups/*}"
    };
    option (google.api.method_signature) = "name";
  }

  // Creates a new group.
  rpc CreateGroup(CreateGroupRequest) returns (Group) {
    option (google.api.http) = {
      post: "/v3/{name=projects/*}/groups"
      body: "group"
    };
    option (google.api.method_signature) = "name,group";
  }

  // Updates an existing group.
  // You can change any group attributes except `name`.
  rpc UpdateGroup(UpdateGroupRequest) returns (Group) {
    option (google.api.http) = {
      put: "/v3/{group.name=projects/*/groups/*}"
      body: "group"
    };
    option (google.api.method_signature) = "group";
  }

  // Deletes an existing group.
  rpc DeleteGroup(DeleteGroupRequest) returns (google.protobuf.Empty) {
    option (google.api.http) = {
      delete: "/v3/{name=projects/*/groups/*}"
    };
    option (google.api.method_signature) = "name";
  }

  // Lists the monitored resources that are members of a group.
  rpc ListGroupMembers(ListGroupMembersRequest) returns (ListGroupMembersResponse) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*/groups/*}/members"
    };
    option (google.api.method_signature) = "name";
  }
}

// The `ListGroup` request.
message ListGroupsRequest {
  // Required. The [project](https://cloud.google.com/monitoring/api/v3#project_name)
  // whose groups are to be listed. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  string name = 7 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/Group"
    }
  ];

  // An optional filter consisting of a single group name.  The filters limit
  // the groups returned based on their parent-child relationship with the
  // specified group. If no filter is specified, all groups are returned.
  oneof filter {
    // A group name. The format is:
    //
    //     projects/[PROJECT_ID_OR_NUMBER]/groups/[GROUP_ID]
    //
    // Returns groups whose `parent_name` field contains the group
    // name.  If no groups have this parent, the results are empty.
    string children_of_group = 2 [(google.api.resource_reference) = {
                                    type: "monitoring.googleapis.com/Group"
                                  }];

    // A group name. The format is:
    //
    //     projects/[PROJECT_ID_OR_NUMBER]/groups/[GROUP_ID]
    //
    // Returns groups that are ancestors of the specified group.
    // The groups are returned in order, starting with the immediate parent and
    // ending with the most distant ancestor.  If the specified group has no
    // immediate parent, the results are empty.
    string ancestors_of_group = 3 [(google.api.resource_reference) = {
                                     type: "monitoring.googleapis.com/Group"
                                   }];

    // A group name. The format is:
    //
    //     projects/[PROJECT_ID_OR_NUMBER]/groups/[GROUP_ID]
    //
    // Returns the descendants of the specified group.  This is a superset of
    // the results returned by the `children_of_group` filter, and includes
    // children-of-children, and so forth.
    string descendants_of_group = 4 [(google.api.resource_reference) = {
                                       type: "monitoring.googleapis.com/Group"
                                     }];
  }

  // A positive number that is the maximum number of results to return.
  int32 page_size = 5;

  // If this field is not empty then it must contain the `next_page_token` value
  // returned by a previous call to this method.  Using this field causes the
  // method to return additional results from the previous method call.
  string page_token = 6;
}

// The `ListGroups` response.
message ListGroupsResponse {
  // The groups that match the specified filters.
  repeated Group group = 1;

  // If there are more results than have been returned, then this field is set
  // to a non-empty value.  To see the additional results,
  // use that value as `page_token` in the next call to this method.
  string next_page_token = 2;
}

// The `GetGroup` request.
message GetGroupRequest {
  // Required. The group to retrieve. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/groups/[GROUP_ID]
  string name = 3 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/Group"
    }
  ];
}

// The `CreateGroup` request.
message CreateGroupRequest {
  // Required. The [project](https://cloud.google.com/monitoring/api/v3#project_name) in
  // which to create the group. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  string name = 4 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/Group"
    }
  ];

  // Required. A group definition. It is an error to define the `name` field because
  // the system assigns the name.
  Group group = 2 [(google.api.field_behavior) = REQUIRED];

  // If true, validate this request but do not create the group.
  bool validate_only = 3;
}

// The `UpdateGroup` request.
message UpdateGroupRequest {
  // Required. The new definition of the group.  All fields of the existing group,
  // excepting `name`, are replaced with the corresponding fields of this group.
  Group group = 2 [(google.api.field_behavior) = REQUIRED];

  // If true, validate this request but do not update the existing group.
  bool validate_only = 3;
}

// The `DeleteGroup` request. The default behavior is to be able to delete a
// single group without any descendants.
message DeleteGroupRequest {
  // Required. The group to delete. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/groups/[GROUP_ID]
  string name = 3 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/Group"
    }
  ];

  // If this field is true, then the request means to delete a group with all
  // its descendants. Otherwise, the request means to delete a group only when
  // it has no descendants. The default value is false.
  bool recursive = 4;
}

// The `ListGroupMembers` request.
message ListGroupMembersRequest {
  // Required. The group whose members are listed. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/groups/[GROUP_ID]
  string name = 7 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/Group"
    }
  ];

  // A positive number that is the maximum number of results to return.
  int32 page_size = 3;

  // If this field is not empty then it must contain the `next_page_token` value
  // returned by a previous call to this method.  Using this field causes the
  // method to return additional results from the previous method call.
  string page_token = 4;

  // An optional [list
  // filter](https://cloud.google.com/monitoring/api/learn_more#filtering)
  // describing the members to be returned.  The filter may reference the type,
  // labels, and metadata of monitored resources that comprise the group. For
  // example, to return only resources representing Compute Engine VM instances,
  // use this filter:
  //
  //     `resource.type = "gce_instance"`
  string filter = 5;

  // An optional time interval for which results should be returned. Only
  // members that were part of the group during the specified interval are
  // included in the response.  If no interval is provided then the group
  // membership over the last minute is returned.
  TimeInterval interval = 6;
}

// The `ListGroupMembers` response.
message ListGroupMembersResponse {
  // A set of monitored resources in the group.
  repeated google.api.MonitoredResource members = 1;

  // If there are more results than have been returned, then this field is
  // set to a non-empty value.  To see the additional results, use that value as
  // `page_token` in the next call to this method.
  string next_page_token = 2;

  // The total number of elements matching this request.
  int32 total_size = 3;
}
