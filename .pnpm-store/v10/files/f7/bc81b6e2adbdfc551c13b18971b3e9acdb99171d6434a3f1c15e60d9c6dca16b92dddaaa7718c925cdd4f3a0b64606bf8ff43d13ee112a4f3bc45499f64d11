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

package google.api.servicecontrol.v1;

import "google/api/distribution.proto";

option cc_enable_arenas = true;
option csharp_namespace = "Google.Cloud.ServiceControl.V1";
option go_package = "cloud.google.com/go/servicecontrol/apiv1/servicecontrolpb;servicecontrolpb";
option java_multiple_files = true;
option java_outer_classname = "DistributionProto";
option java_package = "com.google.api.servicecontrol.v1";
option php_namespace = "Google\\Cloud\\ServiceControl\\V1";
option ruby_package = "Google::Cloud::ServiceControl::V1";

// Distribution represents a frequency distribution of double-valued sample
// points. It contains the size of the population of sample points plus
// additional optional information:
//
// * the arithmetic mean of the samples
// * the minimum and maximum of the samples
// * the sum-squared-deviation of the samples, used to compute variance
// * a histogram of the values of the sample points
message Distribution {
  // Describing buckets with constant width.
  message LinearBuckets {
    // The number of finite buckets. With the underflow and overflow buckets,
    // the total number of buckets is `num_finite_buckets` + 2.
    // See comments on `bucket_options` for details.
    int32 num_finite_buckets = 1;

    // The i'th linear bucket covers the interval
    //   [offset + (i-1) * width, offset + i * width)
    // where i ranges from 1 to num_finite_buckets, inclusive.
    // Must be strictly positive.
    double width = 2;

    // The i'th linear bucket covers the interval
    //   [offset + (i-1) * width, offset + i * width)
    // where i ranges from 1 to num_finite_buckets, inclusive.
    double offset = 3;
  }

  // Describing buckets with exponentially growing width.
  message ExponentialBuckets {
    // The number of finite buckets. With the underflow and overflow buckets,
    // the total number of buckets is `num_finite_buckets` + 2.
    // See comments on `bucket_options` for details.
    int32 num_finite_buckets = 1;

    // The i'th exponential bucket covers the interval
    //   [scale * growth_factor^(i-1), scale * growth_factor^i)
    // where i ranges from 1 to num_finite_buckets inclusive.
    // Must be larger than 1.0.
    double growth_factor = 2;

    // The i'th exponential bucket covers the interval
    //   [scale * growth_factor^(i-1), scale * growth_factor^i)
    // where i ranges from 1 to num_finite_buckets inclusive.
    // Must be > 0.
    double scale = 3;
  }

  // Describing buckets with arbitrary user-provided width.
  message ExplicitBuckets {
    // 'bound' is a list of strictly increasing boundaries between
    // buckets. Note that a list of length N-1 defines N buckets because
    // of fenceposting. See comments on `bucket_options` for details.
    //
    // The i'th finite bucket covers the interval
    //   [bound[i-1], bound[i])
    // where i ranges from 1 to bound_size() - 1. Note that there are no
    // finite buckets at all if 'bound' only contains a single element; in
    // that special case the single bound defines the boundary between the
    // underflow and overflow buckets.
    //
    // bucket number                   lower bound    upper bound
    //  i == 0 (underflow)              -inf           bound[i]
    //  0 < i < bound_size()            bound[i-1]     bound[i]
    //  i == bound_size() (overflow)    bound[i-1]     +inf
    repeated double bounds = 1;
  }

  // The total number of samples in the distribution. Must be >= 0.
  int64 count = 1;

  // The arithmetic mean of the samples in the distribution. If `count` is
  // zero then this field must be zero.
  double mean = 2;

  // The minimum of the population of values. Ignored if `count` is zero.
  double minimum = 3;

  // The maximum of the population of values. Ignored if `count` is zero.
  double maximum = 4;

  // The sum of squared deviations from the mean:
  //   Sum[i=1..count]((x_i - mean)^2)
  // where each x_i is a sample values. If `count` is zero then this field
  // must be zero, otherwise validation of the request fails.
  double sum_of_squared_deviation = 5;

  // The number of samples in each histogram bucket. `bucket_counts` are
  // optional. If present, they must sum to the `count` value.
  //
  // The buckets are defined below in `bucket_option`. There are N buckets.
  // `bucket_counts[0]` is the number of samples in the underflow bucket.
  // `bucket_counts[1]` to `bucket_counts[N-1]` are the numbers of samples
  // in each of the finite buckets. And `bucket_counts[N] is the number
  // of samples in the overflow bucket. See the comments of `bucket_option`
  // below for more details.
  //
  // Any suffix of trailing zeros may be omitted.
  repeated int64 bucket_counts = 6;

  // Defines the buckets in the histogram. `bucket_option` and `bucket_counts`
  // must be both set, or both unset.
  //
  // Buckets are numbered in the range of [0, N], with a total of N+1 buckets.
  // There must be at least two buckets (a single-bucket histogram gives
  // no information that isn't already provided by `count`).
  //
  // The first bucket is the underflow bucket which has a lower bound
  // of -inf. The last bucket is the overflow bucket which has an
  // upper bound of +inf. All other buckets (if any) are called "finite"
  // buckets because they have finite lower and upper bounds. As described
  // below, there are three ways to define the finite buckets.
  //
  //   (1) Buckets with constant width.
  //   (2) Buckets with exponentially growing widths.
  //   (3) Buckets with arbitrary user-provided widths.
  //
  // In all cases, the buckets cover the entire real number line (-inf,
  // +inf). Bucket upper bounds are exclusive and lower bounds are
  // inclusive. The upper bound of the underflow bucket is equal to the
  // lower bound of the smallest finite bucket; the lower bound of the
  // overflow bucket is equal to the upper bound of the largest finite
  // bucket.
  oneof bucket_option {
    // Buckets with constant width.
    LinearBuckets linear_buckets = 7;

    // Buckets with exponentially growing width.
    ExponentialBuckets exponential_buckets = 8;

    // Buckets with arbitrary user-provided width.
    ExplicitBuckets explicit_buckets = 9;
  }

  // Example points. Must be in increasing order of `value` field.
  repeated google.api.Distribution.Exemplar exemplars = 10;
}
