import { DOT_PATTERN, getArnResources, getSuffix, getSuffixForArnEndpoint, isBucketNameOptions, isDnsCompatibleBucketName, validateAccountId, validateArnEndpointOptions, validateCustomEndpoint, validateDNSHostLabel, validateMrapAlias, validateNoDualstack, validateNoFIPS, validateOutpostService, validatePartition, validateRegion, validateRegionalClient, validateS3Service, validateService, } from "./bucketHostnameUtils";
export const bucketHostname = (options) => {
    validateCustomEndpoint(options);
    return isBucketNameOptions(options)
        ?
            getEndpointFromBucketName(options)
        :
            getEndpointFromArn(options);
};
const getEndpointFromBucketName = ({ accelerateEndpoint = false, clientRegion: region, baseHostname, bucketName, dualstackEndpoint = false, fipsEndpoint = false, pathStyleEndpoint = false, tlsCompatible = true, isCustomEndpoint = false, }) => {
    const [clientRegion, hostnameSuffix] = isCustomEndpoint ? [region, baseHostname] : getSuffix(baseHostname);
    if (pathStyleEndpoint || !isDnsCompatibleBucketName(bucketName) || (tlsCompatible && DOT_PATTERN.test(bucketName))) {
        return {
            bucketEndpoint: false,
            hostname: dualstackEndpoint ? `s3.dualstack.${clientRegion}.${hostnameSuffix}` : baseHostname,
        };
    }
    if (accelerateEndpoint) {
        baseHostname = `s3-accelerate${dualstackEndpoint ? ".dualstack" : ""}.${hostnameSuffix}`;
    }
    else if (dualstackEndpoint) {
        baseHostname = `s3.dualstack.${clientRegion}.${hostnameSuffix}`;
    }
    return {
        bucketEndpoint: true,
        hostname: `${bucketName}.${baseHostname}`,
    };
};
const getEndpointFromArn = (options) => {
    const { isCustomEndpoint, baseHostname, clientRegion } = options;
    const hostnameSuffix = isCustomEndpoint ? baseHostname : getSuffixForArnEndpoint(baseHostname)[1];
    const { pathStyleEndpoint, accelerateEndpoint = false, fipsEndpoint = false, tlsCompatible = true, bucketName, clientPartition = "aws", } = options;
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
};
const getEndpointFromObjectLambdaArn = ({ dualstackEndpoint = false, fipsEndpoint = false, tlsCompatible = true, useArnRegion, clientRegion, clientSigningRegion = clientRegion, accesspointName, bucketName, hostnameSuffix, }) => {
    const { accountId, region, service } = bucketName;
    validateRegionalClient(clientRegion);
    validateRegion(region, {
        useArnRegion,
        clientRegion,
        clientSigningRegion,
        allowFipsRegion: true,
        useFipsEndpoint: fipsEndpoint,
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
        signingService: service,
    };
};
const getEndpointFromMRAPArn = ({ disableMultiregionAccessPoints, dualstackEndpoint = false, isCustomEndpoint, mrapAlias, hostnameSuffix, }) => {
    if (disableMultiregionAccessPoints === true) {
        throw new Error("SDK is attempting to use a MRAP ARN. Please enable to feature.");
    }
    validateMrapAlias(mrapAlias);
    validateNoDualstack(dualstackEndpoint);
    return {
        bucketEndpoint: true,
        hostname: `${mrapAlias}${isCustomEndpoint ? "" : `.accesspoint.s3-global`}.${hostnameSuffix}`,
        signingRegion: "*",
    };
};
const getEndpointFromOutpostArn = ({ useArnRegion, clientRegion, clientSigningRegion = clientRegion, bucketName, outpostId, dualstackEndpoint = false, fipsEndpoint = false, tlsCompatible = true, accesspointName, isCustomEndpoint, hostnameSuffix, }) => {
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
        signingService: "s3-outposts",
    };
};
const getEndpointFromAccessPointArn = ({ useArnRegion, clientRegion, clientSigningRegion = clientRegion, bucketName, dualstackEndpoint = false, fipsEndpoint = false, tlsCompatible = true, accesspointName, isCustomEndpoint, hostnameSuffix, }) => {
    validateRegionalClient(clientRegion);
    validateRegion(bucketName.region, {
        useArnRegion,
        clientRegion,
        clientSigningRegion,
        allowFipsRegion: true,
        useFipsEndpoint: fipsEndpoint,
    });
    const hostnamePrefix = `${accesspointName}-${bucketName.accountId}`;
    validateDNSHostLabel(hostnamePrefix, { tlsCompatible });
    const endpointRegion = useArnRegion ? bucketName.region : clientRegion;
    const signingRegion = useArnRegion ? bucketName.region : clientSigningRegion;
    validateS3Service(bucketName.service);
    return {
        bucketEndpoint: true,
        hostname: `${hostnamePrefix}${isCustomEndpoint
            ? ""
            : `.s3-accesspoint${fipsEndpoint ? "-fips" : ""}${dualstackEndpoint ? ".dualstack" : ""}.${endpointRegion}`}.${hostnameSuffix}`,
        signingRegion,
    };
};
