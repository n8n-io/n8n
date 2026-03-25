const DOMAIN_PATTERN = /^[a-z0-9][a-z0-9\.\-]{1,61}[a-z0-9]$/;
const IP_ADDRESS_PATTERN = /(\d+\.){3}\d+/;
const DOTS_PATTERN = /\.\./;
export const DOT_PATTERN = /\./;
export const S3_HOSTNAME_PATTERN = /^(.+\.)?s3(-fips)?(\.dualstack)?[.-]([a-z0-9-]+)\./;
const S3_US_EAST_1_ALTNAME_PATTERN = /^s3(-external-1)?\.amazonaws\.com$/;
const AWS_PARTITION_SUFFIX = "amazonaws.com";
export const isBucketNameOptions = (options) => typeof options.bucketName === "string";
export const isDnsCompatibleBucketName = (bucketName) => DOMAIN_PATTERN.test(bucketName) && !IP_ADDRESS_PATTERN.test(bucketName) && !DOTS_PATTERN.test(bucketName);
const getRegionalSuffix = (hostname) => {
    const parts = hostname.match(S3_HOSTNAME_PATTERN);
    return [parts[4], hostname.replace(new RegExp(`^${parts[0]}`), "")];
};
export const getSuffix = (hostname) => S3_US_EAST_1_ALTNAME_PATTERN.test(hostname) ? ["us-east-1", AWS_PARTITION_SUFFIX] : getRegionalSuffix(hostname);
export const getSuffixForArnEndpoint = (hostname) => S3_US_EAST_1_ALTNAME_PATTERN.test(hostname)
    ? [hostname.replace(`.${AWS_PARTITION_SUFFIX}`, ""), AWS_PARTITION_SUFFIX]
    : getRegionalSuffix(hostname);
export const validateArnEndpointOptions = (options) => {
    if (options.pathStyleEndpoint) {
        throw new Error("Path-style S3 endpoint is not supported when bucket is an ARN");
    }
    if (options.accelerateEndpoint) {
        throw new Error("Accelerate endpoint is not supported when bucket is an ARN");
    }
    if (!options.tlsCompatible) {
        throw new Error("HTTPS is required when bucket is an ARN");
    }
};
export const validateService = (service) => {
    if (service !== "s3" && service !== "s3-outposts" && service !== "s3-object-lambda") {
        throw new Error("Expect 's3' or 's3-outposts' or 's3-object-lambda' in ARN service component");
    }
};
export const validateS3Service = (service) => {
    if (service !== "s3") {
        throw new Error("Expect 's3' in Accesspoint ARN service component");
    }
};
export const validateOutpostService = (service) => {
    if (service !== "s3-outposts") {
        throw new Error("Expect 's3-posts' in Outpost ARN service component");
    }
};
export const validatePartition = (partition, options) => {
    if (partition !== options.clientPartition) {
        throw new Error(`Partition in ARN is incompatible, got "${partition}" but expected "${options.clientPartition}"`);
    }
};
export const validateRegion = (region, options) => {
    if (region === "") {
        throw new Error("ARN region is empty");
    }
    if (options.useFipsEndpoint) {
        if (!options.allowFipsRegion) {
            throw new Error("FIPS region is not supported");
        }
        else if (!isEqualRegions(region, options.clientRegion)) {
            throw new Error(`Client FIPS region ${options.clientRegion} doesn't match region ${region} in ARN`);
        }
    }
    if (!options.useArnRegion &&
        !isEqualRegions(region, options.clientRegion || "") &&
        !isEqualRegions(region, options.clientSigningRegion || "")) {
        throw new Error(`Region in ARN is incompatible, got ${region} but expected ${options.clientRegion}`);
    }
};
export const validateRegionalClient = (region) => {
    if (["s3-external-1", "aws-global"].includes(region)) {
        throw new Error(`Client region ${region} is not regional`);
    }
};
const isEqualRegions = (regionA, regionB) => regionA === regionB;
export const validateAccountId = (accountId) => {
    if (!/[0-9]{12}/.exec(accountId)) {
        throw new Error("Access point ARN accountID does not match regex '[0-9]{12}'");
    }
};
export const validateDNSHostLabel = (label, options = { tlsCompatible: true }) => {
    if (label.length >= 64 ||
        !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(label) ||
        /(\d+\.){3}\d+/.test(label) ||
        /[.-]{2}/.test(label) ||
        (options?.tlsCompatible && DOT_PATTERN.test(label))) {
        throw new Error(`Invalid DNS label ${label}`);
    }
};
export const validateCustomEndpoint = (options) => {
    if (options.isCustomEndpoint) {
        if (options.dualstackEndpoint)
            throw new Error("Dualstack endpoint is not supported with custom endpoint");
        if (options.accelerateEndpoint)
            throw new Error("Accelerate endpoint is not supported with custom endpoint");
    }
};
export const getArnResources = (resource) => {
    const delimiter = resource.includes(":") ? ":" : "/";
    const [resourceType, ...rest] = resource.split(delimiter);
    if (resourceType === "accesspoint") {
        if (rest.length !== 1 || rest[0] === "") {
            throw new Error(`Access Point ARN should have one resource accesspoint${delimiter}{accesspointname}`);
        }
        return { accesspointName: rest[0] };
    }
    else if (resourceType === "outpost") {
        if (!rest[0] || rest[1] !== "accesspoint" || !rest[2] || rest.length !== 3) {
            throw new Error(`Outpost ARN should have resource outpost${delimiter}{outpostId}${delimiter}accesspoint${delimiter}{accesspointName}`);
        }
        const [outpostId, _, accesspointName] = rest;
        return { outpostId, accesspointName };
    }
    else {
        throw new Error(`ARN resource should begin with 'accesspoint${delimiter}' or 'outpost${delimiter}'`);
    }
};
export const validateNoDualstack = (dualstackEndpoint) => {
    if (dualstackEndpoint)
        throw new Error("Dualstack endpoint is not supported with Outpost or Multi-region Access Point ARN.");
};
export const validateNoFIPS = (useFipsEndpoint) => {
    if (useFipsEndpoint)
        throw new Error(`FIPS region is not supported with Outpost.`);
};
export const validateMrapAlias = (name) => {
    try {
        name.split(".").forEach((label) => {
            validateDNSHostLabel(label);
        });
    }
    catch (e) {
        throw new Error(`"${name}" is not a DNS compatible name.`);
    }
};
