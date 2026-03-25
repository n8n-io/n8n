"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  NODE_DISABLE_MULTIREGION_ACCESS_POINT_CONFIG_OPTIONS: () => NODE_DISABLE_MULTIREGION_ACCESS_POINT_CONFIG_OPTIONS,
  NODE_DISABLE_MULTIREGION_ACCESS_POINT_ENV_NAME: () => NODE_DISABLE_MULTIREGION_ACCESS_POINT_ENV_NAME,
  NODE_DISABLE_MULTIREGION_ACCESS_POINT_INI_NAME: () => NODE_DISABLE_MULTIREGION_ACCESS_POINT_INI_NAME,
  NODE_USE_ARN_REGION_CONFIG_OPTIONS: () => NODE_USE_ARN_REGION_CONFIG_OPTIONS,
  NODE_USE_ARN_REGION_ENV_NAME: () => NODE_USE_ARN_REGION_ENV_NAME,
  NODE_USE_ARN_REGION_INI_NAME: () => NODE_USE_ARN_REGION_INI_NAME,
  bucketEndpointMiddleware: () => bucketEndpointMiddleware,
  bucketEndpointMiddlewareOptions: () => bucketEndpointMiddlewareOptions,
  bucketHostname: () => bucketHostname,
  getArnResources: () => getArnResources,
  getBucketEndpointPlugin: () => getBucketEndpointPlugin,
  getSuffixForArnEndpoint: () => getSuffixForArnEndpoint,
  resolveBucketEndpointConfig: () => resolveBucketEndpointConfig,
  validateAccountId: () => validateAccountId,
  validateDNSHostLabel: () => validateDNSHostLabel,
  validateNoDualstack: () => validateNoDualstack,
  validateNoFIPS: () => validateNoFIPS,
  validateOutpostService: () => validateOutpostService,
  validatePartition: () => validatePartition,
  validateRegion: () => validateRegion
});
module.exports = __toCommonJS(index_exports);

// src/NodeDisableMultiregionAccessPointConfigOptions.ts
var import_util_config_provider = require("@smithy/util-config-provider");
var NODE_DISABLE_MULTIREGION_ACCESS_POINT_ENV_NAME = "AWS_S3_DISABLE_MULTIREGION_ACCESS_POINTS";
var NODE_DISABLE_MULTIREGION_ACCESS_POINT_INI_NAME = "s3_disable_multiregion_access_points";
var NODE_DISABLE_MULTIREGION_ACCESS_POINT_CONFIG_OPTIONS = {
  environmentVariableSelector: /* @__PURE__ */ __name((env) => (0, import_util_config_provider.booleanSelector)(env, NODE_DISABLE_MULTIREGION_ACCESS_POINT_ENV_NAME, import_util_config_provider.SelectorType.ENV), "environmentVariableSelector"),
  configFileSelector: /* @__PURE__ */ __name((profile) => (0, import_util_config_provider.booleanSelector)(profile, NODE_DISABLE_MULTIREGION_ACCESS_POINT_INI_NAME, import_util_config_provider.SelectorType.CONFIG), "configFileSelector"),
  default: false
};

// src/NodeUseArnRegionConfigOptions.ts

var NODE_USE_ARN_REGION_ENV_NAME = "AWS_S3_USE_ARN_REGION";
var NODE_USE_ARN_REGION_INI_NAME = "s3_use_arn_region";
var NODE_USE_ARN_REGION_CONFIG_OPTIONS = {
  environmentVariableSelector: /* @__PURE__ */ __name((env) => (0, import_util_config_provider.booleanSelector)(env, NODE_USE_ARN_REGION_ENV_NAME, import_util_config_provider.SelectorType.ENV), "environmentVariableSelector"),
  configFileSelector: /* @__PURE__ */ __name((profile) => (0, import_util_config_provider.booleanSelector)(profile, NODE_USE_ARN_REGION_INI_NAME, import_util_config_provider.SelectorType.CONFIG), "configFileSelector"),
  default: false
};

// src/bucketEndpointMiddleware.ts
var import_util_arn_parser = require("@aws-sdk/util-arn-parser");
var import_protocol_http = require("@smithy/protocol-http");

// src/bucketHostnameUtils.ts
var DOMAIN_PATTERN = /^[a-z0-9][a-z0-9\.\-]{1,61}[a-z0-9]$/;
var IP_ADDRESS_PATTERN = /(\d+\.){3}\d+/;
var DOTS_PATTERN = /\.\./;
var DOT_PATTERN = /\./;
var S3_HOSTNAME_PATTERN = /^(.+\.)?s3(-fips)?(\.dualstack)?[.-]([a-z0-9-]+)\./;
var S3_US_EAST_1_ALTNAME_PATTERN = /^s3(-external-1)?\.amazonaws\.com$/;
var AWS_PARTITION_SUFFIX = "amazonaws.com";
var isBucketNameOptions = /* @__PURE__ */ __name((options) => typeof options.bucketName === "string", "isBucketNameOptions");
var isDnsCompatibleBucketName = /* @__PURE__ */ __name((bucketName) => DOMAIN_PATTERN.test(bucketName) && !IP_ADDRESS_PATTERN.test(bucketName) && !DOTS_PATTERN.test(bucketName), "isDnsCompatibleBucketName");
var getRegionalSuffix = /* @__PURE__ */ __name((hostname) => {
  const parts = hostname.match(S3_HOSTNAME_PATTERN);
  return [parts[4], hostname.replace(new RegExp(`^${parts[0]}`), "")];
}, "getRegionalSuffix");
var getSuffix = /* @__PURE__ */ __name((hostname) => S3_US_EAST_1_ALTNAME_PATTERN.test(hostname) ? ["us-east-1", AWS_PARTITION_SUFFIX] : getRegionalSuffix(hostname), "getSuffix");
var getSuffixForArnEndpoint = /* @__PURE__ */ __name((hostname) => S3_US_EAST_1_ALTNAME_PATTERN.test(hostname) ? [hostname.replace(`.${AWS_PARTITION_SUFFIX}`, ""), AWS_PARTITION_SUFFIX] : getRegionalSuffix(hostname), "getSuffixForArnEndpoint");
var validateArnEndpointOptions = /* @__PURE__ */ __name((options) => {
  if (options.pathStyleEndpoint) {
    throw new Error("Path-style S3 endpoint is not supported when bucket is an ARN");
  }
  if (options.accelerateEndpoint) {
    throw new Error("Accelerate endpoint is not supported when bucket is an ARN");
  }
  if (!options.tlsCompatible) {
    throw new Error("HTTPS is required when bucket is an ARN");
  }
}, "validateArnEndpointOptions");
var validateService = /* @__PURE__ */ __name((service) => {
  if (service !== "s3" && service !== "s3-outposts" && service !== "s3-object-lambda") {
    throw new Error("Expect 's3' or 's3-outposts' or 's3-object-lambda' in ARN service component");
  }
}, "validateService");
var validateS3Service = /* @__PURE__ */ __name((service) => {
  if (service !== "s3") {
    throw new Error("Expect 's3' in Accesspoint ARN service component");
  }
}, "validateS3Service");
var validateOutpostService = /* @__PURE__ */ __name((service) => {
  if (service !== "s3-outposts") {
    throw new Error("Expect 's3-posts' in Outpost ARN service component");
  }
}, "validateOutpostService");
var validatePartition = /* @__PURE__ */ __name((partition, options) => {
  if (partition !== options.clientPartition) {
    throw new Error(`Partition in ARN is incompatible, got "${partition}" but expected "${options.clientPartition}"`);
  }
}, "validatePartition");
var validateRegion = /* @__PURE__ */ __name((region, options) => {
  if (region === "") {
    throw new Error("ARN region is empty");
  }
  if (options.useFipsEndpoint) {
    if (!options.allowFipsRegion) {
      throw new Error("FIPS region is not supported");
    } else if (!isEqualRegions(region, options.clientRegion)) {
      throw new Error(`Client FIPS region ${options.clientRegion} doesn't match region ${region} in ARN`);
    }
  }
  if (!options.useArnRegion && !isEqualRegions(region, options.clientRegion || "") && !isEqualRegions(region, options.clientSigningRegion || "")) {
    throw new Error(`Region in ARN is incompatible, got ${region} but expected ${options.clientRegion}`);
  }
}, "validateRegion");
var validateRegionalClient = /* @__PURE__ */ __name((region) => {
  if (["s3-external-1", "aws-global"].includes(region)) {
    throw new Error(`Client region ${region} is not regional`);
  }
}, "validateRegionalClient");
var isEqualRegions = /* @__PURE__ */ __name((regionA, regionB) => regionA === regionB, "isEqualRegions");
var validateAccountId = /* @__PURE__ */ __name((accountId) => {
  if (!/[0-9]{12}/.exec(accountId)) {
    throw new Error("Access point ARN accountID does not match regex '[0-9]{12}'");
  }
}, "validateAccountId");
var validateDNSHostLabel = /* @__PURE__ */ __name((label, options = { tlsCompatible: true }) => {
  if (label.length >= 64 || !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(label) || /(\d+\.){3}\d+/.test(label) || /[.-]{2}/.test(label) || options?.tlsCompatible && DOT_PATTERN.test(label)) {
    throw new Error(`Invalid DNS label ${label}`);
  }
}, "validateDNSHostLabel");
var validateCustomEndpoint = /* @__PURE__ */ __name((options) => {
  if (options.isCustomEndpoint) {
    if (options.dualstackEndpoint) throw new Error("Dualstack endpoint is not supported with custom endpoint");
    if (options.accelerateEndpoint) throw new Error("Accelerate endpoint is not supported with custom endpoint");
  }
}, "validateCustomEndpoint");
var getArnResources = /* @__PURE__ */ __name((resource) => {
  const delimiter = resource.includes(":") ? ":" : "/";
  const [resourceType, ...rest] = resource.split(delimiter);
  if (resourceType === "accesspoint") {
    if (rest.length !== 1 || rest[0] === "") {
      throw new Error(`Access Point ARN should have one resource accesspoint${delimiter}{accesspointname}`);
    }
    return { accesspointName: rest[0] };
  } else if (resourceType === "outpost") {
    if (!rest[0] || rest[1] !== "accesspoint" || !rest[2] || rest.length !== 3) {
      throw new Error(
        `Outpost ARN should have resource outpost${delimiter}{outpostId}${delimiter}accesspoint${delimiter}{accesspointName}`
      );
    }
    const [outpostId, _, accesspointName] = rest;
    return { outpostId, accesspointName };
  } else {
    throw new Error(`ARN resource should begin with 'accesspoint${delimiter}' or 'outpost${delimiter}'`);
  }
}, "getArnResources");
var validateNoDualstack = /* @__PURE__ */ __name((dualstackEndpoint) => {
  if (dualstackEndpoint)
    throw new Error("Dualstack endpoint is not supported with Outpost or Multi-region Access Point ARN.");
}, "validateNoDualstack");
var validateNoFIPS = /* @__PURE__ */ __name((useFipsEndpoint) => {
  if (useFipsEndpoint) throw new Error(`FIPS region is not supported with Outpost.`);
}, "validateNoFIPS");
var validateMrapAlias = /* @__PURE__ */ __name((name) => {
  try {
    name.split(".").forEach((label) => {
      validateDNSHostLabel(label);
    });
  } catch (e) {
    throw new Error(`"${name}" is not a DNS compatible name.`);
  }
}, "validateMrapAlias");

// src/bucketHostname.ts
var bucketHostname = /* @__PURE__ */ __name((options) => {
  validateCustomEndpoint(options);
  return isBucketNameOptions(options) ? (
    // Construct endpoint when bucketName is a string referring to a bucket name
    getEndpointFromBucketName(options)
  ) : (
    // Construct endpoint when bucketName is an ARN referring to an S3 resource like Access Point
    getEndpointFromArn(options)
  );
}, "bucketHostname");
var getEndpointFromBucketName = /* @__PURE__ */ __name(({
  accelerateEndpoint = false,
  clientRegion: region,
  baseHostname,
  bucketName,
  dualstackEndpoint = false,
  fipsEndpoint = false,
  pathStyleEndpoint = false,
  tlsCompatible = true,
  isCustomEndpoint = false
}) => {
  const [clientRegion, hostnameSuffix] = isCustomEndpoint ? [region, baseHostname] : getSuffix(baseHostname);
  if (pathStyleEndpoint || !isDnsCompatibleBucketName(bucketName) || tlsCompatible && DOT_PATTERN.test(bucketName)) {
    return {
      bucketEndpoint: false,
      hostname: dualstackEndpoint ? `s3.dualstack.${clientRegion}.${hostnameSuffix}` : baseHostname
    };
  }
  if (accelerateEndpoint) {
    baseHostname = `s3-accelerate${dualstackEndpoint ? ".dualstack" : ""}.${hostnameSuffix}`;
  } else if (dualstackEndpoint) {
    baseHostname = `s3.dualstack.${clientRegion}.${hostnameSuffix}`;
  }
  return {
    bucketEndpoint: true,
    hostname: `${bucketName}.${baseHostname}`
  };
}, "getEndpointFromBucketName");
var getEndpointFromArn = /* @__PURE__ */ __name((options) => {
  const { isCustomEndpoint, baseHostname, clientRegion } = options;
  const hostnameSuffix = isCustomEndpoint ? baseHostname : getSuffixForArnEndpoint(baseHostname)[1];
  const {
    pathStyleEndpoint,
    accelerateEndpoint = false,
    fipsEndpoint = false,
    tlsCompatible = true,
    bucketName,
    clientPartition = "aws"
  } = options;
  validateArnEndpointOptions({ pathStyleEndpoint, accelerateEndpoint, tlsCompatible });
  const { service, partition, accountId, region, resource } = bucketName;
  validateService(service);
  validatePartition(partition, { clientPartition });
  validateAccountId(accountId);
  const { accesspointName, outpostId } = getArnResources(resource);
  if (service === "s3-object-lambda") {
    return getEndpointFromObjectLambdaArn({ ...options, tlsCompatible, bucketName, accesspointName, hostnameSuffix });
  }
  if (region === "") {
    return getEndpointFromMRAPArn({ ...options, clientRegion, mrapAlias: accesspointName, hostnameSuffix });
  }
  if (outpostId) {
    return getEndpointFromOutpostArn({ ...options, clientRegion, outpostId, accesspointName, hostnameSuffix });
  }
  return getEndpointFromAccessPointArn({ ...options, clientRegion, accesspointName, hostnameSuffix });
}, "getEndpointFromArn");
var getEndpointFromObjectLambdaArn = /* @__PURE__ */ __name(({
  dualstackEndpoint = false,
  fipsEndpoint = false,
  tlsCompatible = true,
  useArnRegion,
  clientRegion,
  clientSigningRegion = clientRegion,
  accesspointName,
  bucketName,
  hostnameSuffix
}) => {
  const { accountId, region, service } = bucketName;
  validateRegionalClient(clientRegion);
  validateRegion(region, {
    useArnRegion,
    clientRegion,
    clientSigningRegion,
    allowFipsRegion: true,
    useFipsEndpoint: fipsEndpoint
  });
  validateNoDualstack(dualstackEndpoint);
  const DNSHostLabel = `${accesspointName}-${accountId}`;
  validateDNSHostLabel(DNSHostLabel, { tlsCompatible });
  const endpointRegion = useArnRegion ? region : clientRegion;
  const signingRegion = useArnRegion ? region : clientSigningRegion;
  return {
    bucketEndpoint: true,
    hostname: `${DNSHostLabel}.${service}${fipsEndpoint ? "-fips" : ""}.${endpointRegion}.${hostnameSuffix}`,
    signingRegion,
    signingService: service
  };
}, "getEndpointFromObjectLambdaArn");
var getEndpointFromMRAPArn = /* @__PURE__ */ __name(({
  disableMultiregionAccessPoints,
  dualstackEndpoint = false,
  isCustomEndpoint,
  mrapAlias,
  hostnameSuffix
}) => {
  if (disableMultiregionAccessPoints === true) {
    throw new Error("SDK is attempting to use a MRAP ARN. Please enable to feature.");
  }
  validateMrapAlias(mrapAlias);
  validateNoDualstack(dualstackEndpoint);
  return {
    bucketEndpoint: true,
    hostname: `${mrapAlias}${isCustomEndpoint ? "" : `.accesspoint.s3-global`}.${hostnameSuffix}`,
    signingRegion: "*"
  };
}, "getEndpointFromMRAPArn");
var getEndpointFromOutpostArn = /* @__PURE__ */ __name(({
  useArnRegion,
  clientRegion,
  clientSigningRegion = clientRegion,
  bucketName,
  outpostId,
  dualstackEndpoint = false,
  fipsEndpoint = false,
  tlsCompatible = true,
  accesspointName,
  isCustomEndpoint,
  hostnameSuffix
}) => {
  validateRegionalClient(clientRegion);
  validateRegion(bucketName.region, { useArnRegion, clientRegion, clientSigningRegion, useFipsEndpoint: fipsEndpoint });
  const DNSHostLabel = `${accesspointName}-${bucketName.accountId}`;
  validateDNSHostLabel(DNSHostLabel, { tlsCompatible });
  const endpointRegion = useArnRegion ? bucketName.region : clientRegion;
  const signingRegion = useArnRegion ? bucketName.region : clientSigningRegion;
  validateOutpostService(bucketName.service);
  validateDNSHostLabel(outpostId, { tlsCompatible });
  validateNoDualstack(dualstackEndpoint);
  validateNoFIPS(fipsEndpoint);
  const hostnamePrefix = `${DNSHostLabel}.${outpostId}`;
  return {
    bucketEndpoint: true,
    hostname: `${hostnamePrefix}${isCustomEndpoint ? "" : `.s3-outposts.${endpointRegion}`}.${hostnameSuffix}`,
    signingRegion,
    signingService: "s3-outposts"
  };
}, "getEndpointFromOutpostArn");
var getEndpointFromAccessPointArn = /* @__PURE__ */ __name(({
  useArnRegion,
  clientRegion,
  clientSigningRegion = clientRegion,
  bucketName,
  dualstackEndpoint = false,
  fipsEndpoint = false,
  tlsCompatible = true,
  accesspointName,
  isCustomEndpoint,
  hostnameSuffix
}) => {
  validateRegionalClient(clientRegion);
  validateRegion(bucketName.region, {
    useArnRegion,
    clientRegion,
    clientSigningRegion,
    allowFipsRegion: true,
    useFipsEndpoint: fipsEndpoint
  });
  const hostnamePrefix = `${accesspointName}-${bucketName.accountId}`;
  validateDNSHostLabel(hostnamePrefix, { tlsCompatible });
  const endpointRegion = useArnRegion ? bucketName.region : clientRegion;
  const signingRegion = useArnRegion ? bucketName.region : clientSigningRegion;
  validateS3Service(bucketName.service);
  return {
    bucketEndpoint: true,
    hostname: `${hostnamePrefix}${isCustomEndpoint ? "" : `.s3-accesspoint${fipsEndpoint ? "-fips" : ""}${dualstackEndpoint ? ".dualstack" : ""}.${endpointRegion}`}.${hostnameSuffix}`,
    signingRegion
  };
}, "getEndpointFromAccessPointArn");

// src/bucketEndpointMiddleware.ts
var bucketEndpointMiddleware = /* @__PURE__ */ __name((options) => (next, context) => async (args) => {
  const { Bucket: bucketName } = args.input;
  let replaceBucketInPath = options.bucketEndpoint;
  const request = args.request;
  if (import_protocol_http.HttpRequest.isInstance(request)) {
    if (options.bucketEndpoint) {
      request.hostname = bucketName;
    } else if ((0, import_util_arn_parser.validate)(bucketName)) {
      const bucketArn = (0, import_util_arn_parser.parse)(bucketName);
      const clientRegion = await options.region();
      const useDualstackEndpoint = await options.useDualstackEndpoint();
      const useFipsEndpoint = await options.useFipsEndpoint();
      const { partition, signingRegion = clientRegion } = await options.regionInfoProvider(clientRegion, { useDualstackEndpoint, useFipsEndpoint }) || {};
      const useArnRegion = await options.useArnRegion();
      const {
        hostname,
        bucketEndpoint,
        signingRegion: modifiedSigningRegion,
        signingService
      } = bucketHostname({
        bucketName: bucketArn,
        baseHostname: request.hostname,
        accelerateEndpoint: options.useAccelerateEndpoint,
        dualstackEndpoint: useDualstackEndpoint,
        fipsEndpoint: useFipsEndpoint,
        pathStyleEndpoint: options.forcePathStyle,
        tlsCompatible: request.protocol === "https:",
        useArnRegion,
        clientPartition: partition,
        clientSigningRegion: signingRegion,
        clientRegion,
        isCustomEndpoint: options.isCustomEndpoint,
        disableMultiregionAccessPoints: await options.disableMultiregionAccessPoints()
      });
      if (modifiedSigningRegion && modifiedSigningRegion !== signingRegion) {
        context["signing_region"] = modifiedSigningRegion;
      }
      if (signingService && signingService !== "s3") {
        context["signing_service"] = signingService;
      }
      request.hostname = hostname;
      replaceBucketInPath = bucketEndpoint;
    } else {
      const clientRegion = await options.region();
      const dualstackEndpoint = await options.useDualstackEndpoint();
      const fipsEndpoint = await options.useFipsEndpoint();
      const { hostname, bucketEndpoint } = bucketHostname({
        bucketName,
        clientRegion,
        baseHostname: request.hostname,
        accelerateEndpoint: options.useAccelerateEndpoint,
        dualstackEndpoint,
        fipsEndpoint,
        pathStyleEndpoint: options.forcePathStyle,
        tlsCompatible: request.protocol === "https:",
        isCustomEndpoint: options.isCustomEndpoint
      });
      request.hostname = hostname;
      replaceBucketInPath = bucketEndpoint;
    }
    if (replaceBucketInPath) {
      request.path = request.path.replace(/^(\/)?[^\/]+/, "");
      if (request.path === "") {
        request.path = "/";
      }
    }
  }
  return next({ ...args, request });
}, "bucketEndpointMiddleware");
var bucketEndpointMiddlewareOptions = {
  tags: ["BUCKET_ENDPOINT"],
  name: "bucketEndpointMiddleware",
  relation: "before",
  toMiddleware: "hostHeaderMiddleware",
  override: true
};
var getBucketEndpointPlugin = /* @__PURE__ */ __name((options) => ({
  applyToStack: /* @__PURE__ */ __name((clientStack) => {
    clientStack.addRelativeTo(bucketEndpointMiddleware(options), bucketEndpointMiddlewareOptions);
  }, "applyToStack")
}), "getBucketEndpointPlugin");

// src/configurations.ts
function resolveBucketEndpointConfig(input) {
  const {
    bucketEndpoint = false,
    forcePathStyle = false,
    useAccelerateEndpoint = false,
    useArnRegion = false,
    disableMultiregionAccessPoints = false
  } = input;
  return Object.assign(input, {
    bucketEndpoint,
    forcePathStyle,
    useAccelerateEndpoint,
    useArnRegion: typeof useArnRegion === "function" ? useArnRegion : () => Promise.resolve(useArnRegion),
    disableMultiregionAccessPoints: typeof disableMultiregionAccessPoints === "function" ? disableMultiregionAccessPoints : () => Promise.resolve(disableMultiregionAccessPoints)
  });
}
__name(resolveBucketEndpointConfig, "resolveBucketEndpointConfig");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  getArnResources,
  getSuffixForArnEndpoint,
  validateOutpostService,
  validatePartition,
  validateAccountId,
  validateRegion,
  validateDNSHostLabel,
  validateNoDualstack,
  validateNoFIPS,
  NODE_DISABLE_MULTIREGION_ACCESS_POINT_ENV_NAME,
  NODE_DISABLE_MULTIREGION_ACCESS_POINT_INI_NAME,
  NODE_DISABLE_MULTIREGION_ACCESS_POINT_CONFIG_OPTIONS,
  NODE_USE_ARN_REGION_ENV_NAME,
  NODE_USE_ARN_REGION_INI_NAME,
  NODE_USE_ARN_REGION_CONFIG_OPTIONS,
  bucketEndpointMiddleware,
  bucketEndpointMiddlewareOptions,
  getBucketEndpointPlugin,
  bucketHostname,
  resolveBucketEndpointConfig
});

